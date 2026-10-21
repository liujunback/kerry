import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { adjust, transfer } from '@/lib/services/inventory-operation-service'
import { type BucketTypeValue } from '@/lib/services/inventory-event-service'
import { AdjustmentStatus, AdjustmentType } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const submitSchema = z.object({
  mode: z.enum(['ADJUST', 'TRANSFER']),
  skuId: z.string().uuid('SKU ID格式错误'),
  locationId: z.string().uuid('库位ID格式错误'),
  quantity: z.coerce.number().int().positive('调整数量必须大于0'),
  reason: z.string().trim().min(1, '调整原因不能为空').max(500, '调整原因不能超过500字符'),
  batchNumber: z.string().max(64).optional(),
  lpn: z.string().max(64).optional(),
  asnNumber: z.string().max(64).optional(),
  expiryDate: z.string().optional(),
  bucketType: z.string().max(32).optional(),
  productionDate: z.string().optional(),
  adjustType: z.enum(['INCREASE', 'DECREASE']).optional(),
  targetLocationCode: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'ADJUST' && !data.adjustType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '库存调整必须指定增减类型',
      path: ['adjustType'],
    })
  }

  if (data.mode === 'TRANSFER' && !data.targetLocationCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '库位调整必须指定目标库位',
      path: ['targetLocationCode'],
    })
  }
})

async function generateAdjustmentNumber(tenantId: string) {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)

  const count = await prisma.inventoryAdjustment.count({
    where: {
      tenantId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  })

  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  return `ADJ${dateStr}${String(count + 1).padStart(4, '0')}`
}

export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const parseResult = submitSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.errors[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const data = parseResult.data

    const sourceBucket = await prisma.inventoryBucket.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        skuId: data.skuId,
        locationId: data.locationId,
        batchNumber: data.batchNumber || '',
        lpn: data.lpn || '',
        asnNumber: data.asnNumber || '',
        ...(data.expiryDate
          ? { expiryDate: new Date(data.expiryDate) }
          : { expiryDate: null }),
        ...(data.bucketType ? { bucketType: data.bucketType } : {}),
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        location: {
          select: {
            id: true,
            locationCode: true,
          },
        },
        warehouse: {
          select: {
            warehouseName: true,
          },
        },
      },
    })

    if (!sourceBucket) {
      return NextResponse.json(
        { success: false, message: '库存记录不存在', code: 'INVENTORY_NOT_FOUND' },
        { status: 404 }
      )
    }

    let targetLocationId: string | null = null
    let targetLocationCode: string | null = null

    if (data.mode === 'TRANSFER') {
      const targetLocation = await prisma.binLocation.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          warehouseId: sourceBucket.warehouseId,
          locationCode: data.targetLocationCode,
        },
        select: {
          id: true,
          locationCode: true,
          status: true,
        },
      })

      if (!targetLocation) {
        return NextResponse.json(
          { success: false, message: '目标库位不存在', code: 'TARGET_LOCATION_NOT_FOUND' },
          { status: 404 }
        )
      }

      if (targetLocation.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, message: '目标库位未启用', code: 'TARGET_LOCATION_INACTIVE' },
          { status: 400 }
        )
      }

      if (targetLocation.id === sourceBucket.locationId) {
        return NextResponse.json(
          { success: false, message: '目标库位不能与源库位相同' },
          { status: 400 }
        )
      }

      targetLocationId = targetLocation.id
      targetLocationCode = targetLocation.locationCode
    }

    if (data.mode === 'ADJUST' && data.adjustType === 'DECREASE' && sourceBucket.quantity < data.quantity) {
      return NextResponse.json(
        { success: false, message: '库存不足' },
        { status: 400 }
      )
    }

    if (data.mode === 'TRANSFER' && sourceBucket.quantity < data.quantity) {
      return NextResponse.json(
        { success: false, message: '库存不足' },
        { status: 400 }
      )
    }

    const adjustmentNumber = await generateAdjustmentNumber(auth.user.tenantId)
    const quantityChange = data.mode === 'ADJUST' && data.adjustType === 'DECREASE'
      ? -data.quantity
      : data.quantity
    const adjustmentType = data.mode === 'TRANSFER'
      ? AdjustmentType.LOCATION_ADJUST
      : AdjustmentType.QUANTITY_ADJUST
    const quantityAfter = data.mode === 'TRANSFER'
      ? sourceBucket.quantity - data.quantity
      : sourceBucket.quantity + quantityChange

    const adjustment = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryAdjustment.create({
        data: {
          tenantId: auth.user.tenantId,
          adjustmentNumber,
          warehouseId: sourceBucket.warehouseId,
          warehouseName: sourceBucket.warehouse.warehouseName,
          adjustmentType,
          reason: data.reason,
          status: AdjustmentStatus.DRAFT,
          totalItems: 1,
          totalQuantityChange: data.mode === 'TRANSFER' ? 0 : quantityChange,
          clientId: sourceBucket.clientId,
          requestUserId: auth.user.id,
          requestUserName: auth.user.name || '',
          createdBy: auth.user.id,
          lines: {
            create: {
              inventoryId: sourceBucket.id,
              skuId: sourceBucket.skuId,
              skuCode: sourceBucket.skuCode,
              locationId: sourceBucket.locationId,
              locationCode: sourceBucket.location.locationCode,
              batchNumber: sourceBucket.batchNumber,
              quantityBefore: sourceBucket.quantity,
              quantityChange: data.mode === 'TRANSFER' ? data.quantity : quantityChange,
              quantityAfter,
              reasonNotes: data.reason,
              lpn: sourceBucket.lpn,
              asnNumber: sourceBucket.asnNumber,
              expiryDate: sourceBucket.expiryDate,
              productionDate: sourceBucket.productionDate,
              bucketType: sourceBucket.bucketType,
              fromLocationId: data.mode === 'TRANSFER' ? sourceBucket.locationId : null,
              fromLocationCode: data.mode === 'TRANSFER' ? sourceBucket.location.locationCode : null,
              toLocationId: targetLocationId,
              toLocationCode: targetLocationCode,
            }
          },
        },
        select: {
          id: true,
          adjustmentNumber: true,
          adjustmentType: true,
        },
      })

      if (data.mode === 'TRANSFER') {
        await transfer(
          {
            tenantId: auth.user.tenantId,
            clientId: sourceBucket.clientId,
            warehouseId: sourceBucket.warehouseId,
            sourceLocationId: sourceBucket.locationId,
            targetLocationId: targetLocationId!,
            skuId: sourceBucket.skuId,
            skuCode: sourceBucket.skuCode,
            quantity: data.quantity,
            batchNumber: sourceBucket.batchNumber,
            lpn: sourceBucket.lpn,
            asnNumber: sourceBucket.asnNumber,
            bucketType: sourceBucket.bucketType as BucketTypeValue,
            referenceType: "ADJUSTMENT",
            referenceId: created.id,
            referenceNumber: created.adjustmentNumber,
            operatorId: auth.user.id,
          },
          tx
        )
      } else {
        await adjust(
          {
            tenantId: auth.user.tenantId,
            clientId: sourceBucket.clientId,
            warehouseId: sourceBucket.warehouseId,
            locationId: sourceBucket.locationId,
            skuId: sourceBucket.skuId,
            skuCode: sourceBucket.skuCode,
            bucketType: sourceBucket.bucketType as BucketTypeValue,
            quantityDelta: quantityChange,
            batchNumber: sourceBucket.batchNumber,
            lpn: sourceBucket.lpn,
            asnNumber: sourceBucket.asnNumber,
            reasonCode: adjustmentType,
            reasonDescription: data.reason,
            referenceType: 'ADJUSTMENT',
            referenceId: created.id,
            referenceNumber: created.adjustmentNumber,
            operatorId: auth.user.id,
          },
          tx
        )
      }

      await tx.inventoryAdjustment.updateMany({
        where: { id: created.id },
        data: {
          status: AdjustmentStatus.EXECUTED,
          executeUserId: auth.user.id,
          executeUserName: auth.user.name || '',
          executeTime: new Date(),
        },
      })

      return created
    })

    return NextResponse.json({
      success: true,
      data: {
        adjustmentId: adjustment.id,
        adjustmentNumber: adjustment.adjustmentNumber,
        adjustmentType: adjustment.adjustmentType,
      },
      message: '库存调整已提交',
    })
  } catch (error) {
    console.error('PDA库存调整提交失败:', error)
    const message = error instanceof Error ? error.message : '库存调整提交失败'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
})
