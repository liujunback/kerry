import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { resolveAdjustmentSourceBucket } from '@/lib/services/inventory-adjustment-line-resolver'
import { AdjustmentStatus,updateAdjustmentSchema } from '@/lib/validations/inventory'
import { NextRequest,NextResponse } from 'next/server'
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

// GET /api/v1/inventory/adjustments/[id] - 调整单详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

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
        requestUserId: true,
        requestUserName: true,
        executeUserId: true,
        executeUserName: true,
        executeTime: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        lines: { select: adjustmentLineSelect },
      },
    })

    if (!adjustment) {
      return NextResponse.json({ success: false, message: '调整单不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: adjustment })
  } catch (error) {
    console.error('获取调整单详情失败:', error)
    return NextResponse.json({ success: false, message: '获取调整单详情失败' }, { status: 500 })
  }
})

// PUT /api/v1/inventory/adjustments/[id] - 更新调整单
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const body = await request.json()
    const parseResult = updateAdjustmentSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const existing = await prisma.inventoryAdjustment.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      select: {
        id: true,
        status: true,
        warehouseId: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: '调整单不存在' }, { status: 404 })
    }

    if (existing.status !== AdjustmentStatus.DRAFT) {
      return NextResponse.json(
        { success: false, message: '只有草稿状态的调整单可以编辑' },
        { status: 400 }
      )
    }

    const { reason, lines } = parseResult.data

    // 更新调整单
    const updateData: Record<string, unknown> = {}
    if (reason) updateData.reason = reason

    if (lines) {
      // 获取SKU信息
      const skuIds = [...new Set(lines.map((l) => l.skuId))]
      const skus = await prisma.sku.findMany({
        where: { id: { in: skuIds } },
        select: { id: true, skuCode: true },
      })
      const skuMap = new Map(skus.map((s) => [s.id, s.skuCode]))

      // 获取库位信息（包括 fromLocationId 和 toLocationId）
      const locationIds = [
        ...new Set([
          ...lines.map((l) => l.locationId).filter(Boolean),
          ...lines.map((l) => l.fromLocationId).filter(Boolean),
          ...lines.map((l) => l.toLocationId).filter(Boolean),
        ] as string[])
      ]
      const locations = await prisma.binLocation.findMany({
        where: {
          id: { in: locationIds },
          tenantId: auth.user.tenantId,
          ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        },
        select: { id: true, locationCode: true },
      })
      const locationMap = new Map(locations.map((l) => [l.id, l.locationCode]))

      const resolvedLines = await Promise.all(
        lines.map(async (line) => ({
          line,
          inventory: await resolveAdjustmentSourceBucket({
            tenantId: auth.user.tenantId,
            warehouseId: existing.warehouseId,
            line,
          }),
        }))
      )

      // 删除旧明细，创建新明细
      await prisma.inventoryAdjustmentLine.deleteMany({
        where: { adjustmentId: id },
      })

      await prisma.inventoryAdjustmentLine.createMany({
        data: resolvedLines.map(({ line, inventory }) => {
          const locationId = line.locationId || line.fromLocationId || inventory?.locationId || ''
          const bucketType = line.bucketType || line.fromBucketType || inventory?.bucketType || 'AVAILABLE'
          const quantityBefore = inventory?.quantity || 0
          return {
            adjustmentId: id,
            inventoryId: inventory?.id || line.inventoryId || '',
            skuId: line.skuId,
            skuCode: skuMap.get(line.skuId) || '',
            locationId: locationId,
            locationCode: locationMap.get(locationId) || '',
            batchNumber: line.batchNumber,
            quantityBefore,
            quantityChange: line.adjustQuantity,
            quantityAfter: quantityBefore + line.adjustQuantity,
            reasonNotes: line.reason,
            asnNumber: line.asnNumber || inventory?.asnNumber || '',
            lpn: inventory?.lpn || line.lpn || '',
            expiryDate: inventory?.expiryDate || (line.expiryDate ? new Date(line.expiryDate) : null),
            productionDate: inventory?.productionDate || (line.productionDate ? new Date(line.productionDate) : null),
            bucketType: bucketType,
            fromBucketType: line.fromBucketType,
            toBucketType: line.toBucketType,
            fromLocationId: line.fromLocationId,
            fromLocationCode: line.fromLocationCode,
            toLocationId: line.toLocationId,
            toLocationCode: line.toLocationCode,
          }
        }),
      })
    }

    await prisma.inventoryAdjustment.updateMany({
      where: { id },
      data: updateData,
    })

    const adjustment = await prisma.inventoryAdjustment.findFirst({
      where: { id },
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
        clientId: true,
        createdAt: true,
        updatedAt: true,
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        lines: { select: adjustmentLineSelect },
      },
    })

    return NextResponse.json({
      success: true,
      data: adjustment,
      message: '调整单更新成功',
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ADJUSTMENT_SOURCE_AMBIGUOUS:')) {
      return NextResponse.json(
        { success: false, message: error.message.replace('ADJUSTMENT_SOURCE_AMBIGUOUS:', '') },
        { status: 400 }
      )
    }

    console.error('更新调整单失败:', error)
    return NextResponse.json({ success: false, message: '更新调整单失败' }, { status: 500 })
  }
})

// DELETE /api/v1/inventory/adjustments/[id] - 删除调整单
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const existing = await prisma.inventoryAdjustment.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: '调整单不存在' }, { status: 404 })
    }

    if (existing.status !== AdjustmentStatus.DRAFT) {
      return NextResponse.json(
        { success: false, message: '只有草稿状态的调整单可以删除' },
        { status: 400 }
      )
    }

    await prisma.inventoryAdjustment.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '调整单删除成功' })
  } catch (error) {
    console.error('删除调整单失败:', error)
    return NextResponse.json({ success: false, message: '删除调整单失败' }, { status: 500 })
  }
})
