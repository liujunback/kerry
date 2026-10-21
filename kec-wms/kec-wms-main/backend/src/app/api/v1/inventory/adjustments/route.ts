import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { resolveAdjustmentSourceBucket } from '@/lib/services/inventory-adjustment-line-resolver'
import {
adjustmentListQuerySchema,
AdjustmentStatus,
createAdjustmentSchema,
} from '@/lib/validations/inventory'
import { NextRequest,NextResponse } from 'next/server'

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

// GET /api/v1/inventory/adjustments - 调整单列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = adjustmentListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      status: searchParams.get('status'),
      adjustmentType: searchParams.get('adjustmentType'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, warehouseId: requestedWarehouseId, status, adjustmentType, search, sortBy, sortOrder } =
      queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (status) where.status = status
    if (adjustmentType) where.adjustmentType = adjustmentType
    if (search) {
      where.OR = [
        { adjustmentNumber: { contains: search } },
        { reason: { contains: search } },
      ]
    }

    const total = await prisma.inventoryAdjustment.count({ where })

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where,
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
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: adjustments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取调整单列表失败:', error)
    return NextResponse.json({ success: false, message: '获取调整单列表失败' }, { status: 500 })
  }
})

// POST /api/v1/inventory/adjustments - 创建调整单
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const parseResult = createAdjustmentSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { warehouseId, adjustmentType, reason, lines } = parseResult.data

    // 获取仓库信息
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { warehouseName: true },
    })
    if (!warehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 400 })
    }

    // 生成调整单号
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const count = await prisma.inventoryAdjustment.count({
      where: {
        tenantId: auth.user.tenantId,
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    })
    const adjustmentNumber = `ADJ${dateStr}${String(count + 1).padStart(4, '0')}`

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
      where: { id: { in: locationIds } },
      select: { id: true, locationCode: true },
    })
    const locationMap = new Map(locations.map((l) => [l.id, l.locationCode]))

    const resolvedLines = await Promise.all(
      lines.map(async (line) => ({
        line,
        inventory: await resolveAdjustmentSourceBucket({
          tenantId: auth.user.tenantId,
          warehouseId,
          line,
        }),
      }))
    )

    // 从第一条库存记录中获取 clientId（同一个调整单的所有行应该属于同一个客户）
    const clientId = resolvedLines.find((item) => item.inventory)?.inventory?.clientId || null

    // 创建调整单
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        tenantId: auth.user.tenantId,
        adjustmentNumber,
        warehouseId,
        warehouseName: warehouse.warehouseName,
        adjustmentType,
        reason,
        status: AdjustmentStatus.DRAFT,
        clientId: clientId,
        requestUserId: auth.user.id,
        requestUserName: auth.user.name || '',
        createdBy: auth.user.id,
        lines: {
          create: resolvedLines.map(({ line, inventory }) => {
            const locationId = line.locationId || line.fromLocationId || inventory?.locationId || ''
            const bucketType = line.bucketType || line.fromBucketType || inventory?.bucketType || 'AVAILABLE'
            const quantityBefore = inventory?.quantity || 0
            return {
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
        },
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
        clientId: true,
        createdAt: true,
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        lines: { select: adjustmentLineSelect },
      },
    })

    return NextResponse.json({
      success: true,
      data: adjustment,
      message: '调整单创建成功',
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ADJUSTMENT_SOURCE_AMBIGUOUS:')) {
      return NextResponse.json(
        { success: false, message: error.message.replace('ADJUSTMENT_SOURCE_AMBIGUOUS:', '') },
        { status: 400 }
      )
    }

    console.error('创建调整单失败:', error)
    return NextResponse.json({ success: false, message: '创建调整单失败' }, { status: 500 })
  }
})
