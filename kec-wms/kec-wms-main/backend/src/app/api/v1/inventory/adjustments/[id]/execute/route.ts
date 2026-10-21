import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { BucketType, type BucketTypeValue } from '@/lib/services/inventory-event-service'
import { extractInventoryCountLockMessage } from '@/lib/services/inventory-count-lock-guard'
import { resolveAdjustmentSourceBucket } from '@/lib/services/inventory-adjustment-line-resolver'
import { adjust, transfer } from '@/lib/services/inventory-operation-service'
import { canStoreBucketInZone, type ZoneQualityTypeValue } from '@/lib/utils/quality-mapping'
import { AdjustmentStatus, AdjustmentType } from '@/lib/validations/inventory'
import { NextRequest, NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

const adjustmentLineSelect = {
  id: true,
  adjustmentId: true,
  inventoryId: true,
  skuId: true,
  skuCode: true,
  locationId: true,
  locationCode: true,
  batchNumber: true,
  quantityBefore: true,
  quantityChange: true,
  quantityAfter: true,
  reasonNotes: true,
  asnNumber: true,
  lpn: true,
  expiryDate: true,
  productionDate: true,
  bucketType: true,
  fromBucketType: true,
  toBucketType: true,
  fromLocationId: true,
  fromLocationCode: true,
  toLocationId: true,
  toLocationCode: true,
  createdAt: true,
  updatedAt: true,
} as const

// POST /api/v1/inventory/adjustments/[id]/execute
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    await prisma.$transaction(async (tx) => {
      const lockedRows = scopedWarehouseId
        ? await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM inventory_adjustment
            WHERE id = ${id}
              AND tenant_id = ${auth.user.tenantId}
              AND warehouse_id = ${scopedWarehouseId}
            FOR UPDATE
          `
        : await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM inventory_adjustment
            WHERE id = ${id}
              AND tenant_id = ${auth.user.tenantId}
            FOR UPDATE
          `

      if (lockedRows.length === 0) {
        throw new Error('ADJUSTMENT_NOT_FOUND')
      }

      const existing = await tx.inventoryAdjustment.findFirst({
        where: {
          id,
          tenantId: auth.user.tenantId,
          ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        },
        select: {
          id: true,
          tenantId: true,
          adjustmentNumber: true,
          warehouseId: true,
          status: true,
          adjustmentType: true,
          reason: true,
          clientId: true,
          lines: { select: adjustmentLineSelect },
        },
      })

      if (!existing) {
        throw new Error('ADJUSTMENT_NOT_FOUND')
      }

      if (existing.status !== AdjustmentStatus.DRAFT) {
        throw new Error('ADJUSTMENT_STATUS_INVALID')
      }

      for (const line of existing.lines) {
        const adjustmentType = existing.adjustmentType
        const sourceBucket = await resolveAdjustmentSourceBucket({
          client: tx,
          tenantId: auth.user.tenantId,
          warehouseId: existing.warehouseId,
          line: {
            inventoryId: line.inventoryId || undefined,
            skuId: line.skuId,
            locationId: line.locationId,
            fromLocationId: line.fromLocationId || undefined,
            batchNumber: line.batchNumber || undefined,
            lpn: line.lpn || undefined,
            asnNumber: line.asnNumber || undefined,
            expiryDate: line.expiryDate,
            bucketType: line.bucketType || undefined,
            fromBucketType: line.fromBucketType || undefined,
          },
        })

        const requiresSourceBucket = adjustmentType !== AdjustmentType.QUANTITY_ADJUST || line.quantityChange < 0
        if (requiresSourceBucket && !sourceBucket) {
          throw new Error(`ADJUSTMENT_SOURCE_NOT_FOUND:${line.skuCode}`)
        }

        if (adjustmentType === AdjustmentType.QUANTITY_ADJUST) {
          await adjust({
            tenantId: auth.user.tenantId,
            clientId: sourceBucket?.clientId || existing.clientId || undefined,
            warehouseId: existing.warehouseId,
            locationId: line.locationId,
            skuId: line.skuId,
            skuCode: line.skuCode,
            batchNumber: line.batchNumber,
            lpn: sourceBucket?.lpn || line.lpn,
            asnNumber: sourceBucket?.asnNumber || line.asnNumber || undefined,
            expiryDate: sourceBucket?.expiryDate || line.expiryDate,
            productionDate: sourceBucket?.productionDate || line.productionDate,
            bucketType: (sourceBucket?.bucketType || line.bucketType || 'AVAILABLE') as BucketTypeValue,
            quantityDelta: line.quantityChange,
            reasonCode: existing.adjustmentType,
            reasonDescription: existing.reason || '库存数量调整',
            referenceType: 'ADJUSTMENT',
            referenceId: existing.id,
            referenceNumber: existing.adjustmentNumber,
            operatorId: auth.user.id,
          }, tx)
        } else if (adjustmentType === AdjustmentType.LOCATION_ADJUST) {
          if (!line.fromLocationId || !line.toLocationId) {
            throw new Error(`库位调整缺少必要的库位信息: ${line.skuCode}`)
          }

          await transfer({
            tenantId: auth.user.tenantId,
            clientId: sourceBucket?.clientId || existing.clientId || undefined,
            warehouseId: existing.warehouseId,
            sourceLocationId: line.fromLocationId,
            targetLocationId: line.toLocationId,
            skuId: line.skuId,
            skuCode: line.skuCode,
            quantity: Math.abs(line.quantityChange),
            batchNumber: line.batchNumber,
            lpn: sourceBucket?.lpn || line.lpn,
            asnNumber: sourceBucket?.asnNumber || line.asnNumber || undefined,
            bucketType: (sourceBucket?.bucketType || line.bucketType || 'AVAILABLE') as BucketTypeValue,
            referenceType: 'ADJUSTMENT',
            referenceId: existing.id,
            referenceNumber: existing.adjustmentNumber,
            operatorId: auth.user.id,
          }, tx)
        } else if (adjustmentType === AdjustmentType.QUALITY_ADJUST) {
          if (!line.fromBucketType || !line.toBucketType) {
            throw new Error(`质量调整缺少必要的桶类型信息: ${line.skuCode}`)
          }

          const sourceLocationId = line.fromLocationId || line.locationId
          const targetLocationId = line.toLocationId || line.locationId

          const targetLocation = await tx.binLocation.findFirst({
            where: {
              id: targetLocationId,
              tenantId: auth.user.tenantId,
              warehouseId: existing.warehouseId,
            },
            include: {
              zone: {
                select: {
                  qualityType: true,
                  zoneCode: true,
                },
              },
            },
          })

          if (!targetLocation) {
            throw new Error(`目标库位不存在: ${line.toLocationCode || targetLocationId}`)
          }

          const isQualityMatch = canStoreBucketInZone(
            line.toBucketType as BucketTypeValue,
            targetLocation.zone.qualityType as ZoneQualityTypeValue
          )

          if (!isQualityMatch) {
            throw new Error(
              `质量类型不匹配: ${line.skuCode} 的目标质量类型 ${line.toBucketType} 不能存放到库区 ${targetLocation.zone.zoneCode} (质量类型: ${targetLocation.zone.qualityType})`
            )
          }

          await adjust({
            tenantId: auth.user.tenantId,
            clientId: sourceBucket?.clientId || existing.clientId || undefined,
            warehouseId: existing.warehouseId,
            locationId: sourceLocationId,
            skuId: line.skuId,
            skuCode: line.skuCode,
            batchNumber: line.batchNumber,
            lpn: sourceBucket?.lpn || line.lpn,
            asnNumber: sourceBucket?.asnNumber || line.asnNumber || undefined,
            expiryDate: sourceBucket?.expiryDate || line.expiryDate,
            productionDate: sourceBucket?.productionDate || line.productionDate,
            bucketType: line.fromBucketType as BucketTypeValue,
            quantityDelta: -Math.abs(line.quantityChange),
            reasonCode: existing.adjustmentType,
            reasonDescription: `${existing.reason || '质量调整'} (OUT)`,
            referenceType: 'ADJUSTMENT',
            referenceId: existing.id,
            referenceNumber: existing.adjustmentNumber,
            operatorId: auth.user.id,
          }, tx)

          await adjust({
            tenantId: auth.user.tenantId,
            clientId: sourceBucket?.clientId || existing.clientId || undefined,
            warehouseId: existing.warehouseId,
            locationId: targetLocationId,
            skuId: line.skuId,
            skuCode: line.skuCode,
            batchNumber: line.batchNumber,
            lpn: sourceBucket?.lpn || line.lpn,
            asnNumber: sourceBucket?.asnNumber || line.asnNumber || undefined,
            expiryDate: sourceBucket?.expiryDate || line.expiryDate,
            productionDate: sourceBucket?.productionDate || line.productionDate,
            bucketType: line.toBucketType as BucketTypeValue,
            quantityDelta: Math.abs(line.quantityChange),
            reasonCode: existing.adjustmentType,
            reasonDescription: `${existing.reason || '质量调整'} (IN)`,
            referenceType: 'ADJUSTMENT',
            referenceId: existing.id,
            referenceNumber: existing.adjustmentNumber,
            operatorId: auth.user.id,
          }, tx)
        } else {
          await adjust({
            tenantId: auth.user.tenantId,
            clientId: sourceBucket?.clientId || existing.clientId || undefined,
            warehouseId: existing.warehouseId,
            locationId: line.locationId,
            skuId: line.skuId,
            skuCode: line.skuCode,
            batchNumber: line.batchNumber,
            lpn: sourceBucket?.lpn || line.lpn,
            asnNumber: sourceBucket?.asnNumber || line.asnNumber || undefined,
            expiryDate: sourceBucket?.expiryDate || line.expiryDate,
            productionDate: sourceBucket?.productionDate || line.productionDate,
            bucketType: BucketType.AVAILABLE,
            quantityDelta: line.quantityChange,
            reasonCode: existing.adjustmentType,
            reasonDescription: existing.reason || '库存调整',
            referenceType: 'ADJUSTMENT',
            referenceId: existing.id,
            referenceNumber: existing.adjustmentNumber,
            operatorId: auth.user.id,
          }, tx)
        }
      }

      await tx.inventoryAdjustment.updateMany({
        where: {
          id,
          status: AdjustmentStatus.DRAFT,
        },
        data: {
          status: AdjustmentStatus.EXECUTED,
          executeUserId: auth.user.id,
          executeUserName: auth.user.name || '',
          executeTime: new Date(),
        },
      })
    })

    const adjustment = await prisma.inventoryAdjustment.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      select: {
        id: true,
        adjustmentNumber: true,
        warehouseId: true,
        warehouseName: true,
        status: true,
        adjustmentType: true,
        reason: true,
        totalItems: true,
        totalQuantityChange: true,
        requestUserName: true,
        executeUserName: true,
        executeTime: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
        lines: { select: adjustmentLineSelect },
      },
    })

    return NextResponse.json({
      success: true,
      data: adjustment,
      message: '调整单执行成功',
    })
  } catch (error) {
    const countLockMessage = extractInventoryCountLockMessage(error)
    if (countLockMessage) {
      return NextResponse.json({ success: false, message: countLockMessage }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'ADJUSTMENT_NOT_FOUND') {
      return NextResponse.json({ success: false, message: '调整单不存在' }, { status: 404 })
    }

    if (error instanceof Error && error.message === 'ADJUSTMENT_STATUS_INVALID') {
      return NextResponse.json(
        { success: false, message: '只有草稿状态的调整单可执行' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.startsWith('ADJUSTMENT_SOURCE_AMBIGUOUS:')) {
      return NextResponse.json(
        { success: false, message: error.message.replace('ADJUSTMENT_SOURCE_AMBIGUOUS:', '') },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.startsWith('ADJUSTMENT_SOURCE_NOT_FOUND:')) {
      return NextResponse.json(
        { success: false, message: `未找到来源库存桶，请先补全 ASN 或重新创建调整单: ${error.message.replace('ADJUSTMENT_SOURCE_NOT_FOUND:', '')}` },
        { status: 400 }
      )
    }

    console.error('执行调整单失败:', error)
    const message = error instanceof Error ? error.message : '执行调整单失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})
