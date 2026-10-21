import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { BucketType } from '@/lib/services/inventory-event-service'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'
import { z,ZodIssue } from 'zod'

// 查询参数验证
const inventorySummaryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
  warehouseId: z.string().optional(),
  clientId: z.string().optional(),
  skuCode: z.string().optional(),
  search: z.string().optional(),
  hasAvailable: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val === 'true' || val === '1',
    z.boolean().optional()
  ),
  hasAllocated: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val === 'true' || val === '1',
    z.boolean().optional()
  ),
  hasFrozen: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val === 'true' || val === '1',
    z.boolean().optional()
  ),
  sortBy: z.enum(['skuCode', 'available', 'total']).default('skuCode'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// GET /api/v1/inventory/summary - 库存汇总查询（事件溯源版本）
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = inventorySummaryQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      skuCode: searchParams.get('skuCode') || undefined,
      search: searchParams.get('search') || undefined,
      hasAvailable: searchParams.get('hasAvailable') || undefined,
      hasAllocated: searchParams.get('hasAllocated') || undefined,
      hasFrozen: searchParams.get('hasFrozen') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    })

    if (!queryResult.success) {
      console.error('库存汇总参数验证失败:', {
        params: Object.fromEntries(searchParams.entries()),
        errors: queryResult.error.errors,
      })
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          errors: queryResult.error.errors.map((err: ZodIssue) => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.code === 'invalid_type' ? err.received : undefined,
          }))
        },
        { status: 400 }
      )
    }

    const query = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, query.warehouseId)

    // 构建基础查询条件
    const baseWhere: Prisma.InventoryBucketWhereInput = {
      tenantId: auth.user.tenantId,
      quantity: { gt: 0 },
    }

    if (warehouseId) baseWhere.warehouseId = warehouseId
    if (query.clientId) baseWhere.clientId = query.clientId
    if (query.skuCode) baseWhere.skuCode = { contains: query.skuCode }
    if (query.search) {
      baseWhere.OR = [{ skuCode: { contains: query.search } }]
    }

    // 按 SKU + 仓库 + 客户 分组聚合
    const groupedData = await prismaRead.inventoryBucket.groupBy({
      by: ['warehouseId', 'skuId', 'skuCode', 'clientId', 'bucketType'],
      where: baseWhere,
      _sum: { quantity: true },
    })

    // 按 SKU + 仓库 + 客户 汇总各桶类型数量
    const summaryMap = new Map<string, {
      warehouseId: string
      skuId: string
      skuCode: string
      clientId: string | null
      available: number
      allocated: number
      picking: number
      frozen: number
      defective: number
      exception: number
      qcHold: number
      countHold: number
      countSurplus: number
      countShortage: number
      total: number
      pendingReceiveQty: number
      pendingPutawayQty: number
    }>()

    for (const item of groupedData) {
      const key = `${item.warehouseId}:${item.skuId}:${item.clientId || ''}`
      let summary = summaryMap.get(key)
      if (!summary) {
        summary = {
          warehouseId: item.warehouseId,
          skuId: item.skuId,
          skuCode: item.skuCode,
          clientId: item.clientId,
          available: 0,
          allocated: 0,
          picking: 0,
          frozen: 0,
          defective: 0,
          exception: 0,
          qcHold: 0,
          countHold: 0,
          countSurplus: 0,
          countShortage: 0,
          total: 0,
          pendingReceiveQty: 0,
          pendingPutawayQty: 0,
        }
        summaryMap.set(key, summary)
      }

      const qty = item._sum.quantity || 0

      switch (item.bucketType) {
        case BucketType.AVAILABLE:
          summary.available = qty
          summary.total += qty
          break
        case BucketType.ALLOCATED:
          summary.allocated = qty
          summary.total += qty
          break
        case BucketType.PICKING:
          summary.picking = qty
          summary.total += qty
          break
        case BucketType.FROZEN:
          summary.frozen = qty
          summary.total += qty
          break
        case BucketType.DEFECTIVE:
          summary.defective = qty
          summary.total += qty
          break
        case BucketType.EXCEPTION:
          summary.exception = qty
          summary.total += qty
          break
        case BucketType.QC_HOLD:
          summary.qcHold = qty
          summary.total += qty
          break
        case BucketType.COUNT_HOLD:
          summary.countHold = qty
          summary.total += qty
          break
        case BucketType.COUNT_SURPLUS:
          summary.countSurplus = qty
          break
        case BucketType.COUNT_SHORTAGE:
          summary.countShortage = qty
          break
      }
    }

    // 转换为数组并应用筛选
    let summaries = Array.from(summaryMap.values())

    if (query.hasAvailable) {
      summaries = summaries.filter((s) => s.available > 0)
    }
    if (query.hasAllocated) {
      summaries = summaries.filter((s) => s.allocated > 0)
    }
    if (query.hasFrozen) {
      summaries = summaries.filter((s) => s.frozen > 0)
    }

    // 排序
    summaries.sort((a, b) => {
      let aVal: number | string, bVal: number | string
      if (query.sortBy === 'skuCode') {
        aVal = a.skuCode
        bVal = b.skuCode
      } else if (query.sortBy === 'available') {
        aVal = a.available
        bVal = b.available
      } else {
        aVal = a.total
        bVal = b.total
      }
      if (query.sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    })

    const total = summaries.length

    // 分页
    const paginatedData = summaries.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize
    )

    const paginatedKeys = new Set(paginatedData.map((s) => `${s.warehouseId}:${s.skuId}:${s.clientId || ''}`))
    const pendingReceiveRows = await prismaRead.asnLine.findMany({
      where: {
        tenantId: auth.user.tenantId,
        asn: {
          tenantId: auth.user.tenantId,
          ...(warehouseId ? { warehouseId } : {}),
          ...(query.clientId ? { clientId: query.clientId } : {}),
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      select: {
        skuId: true,
        expectedQty: true,
        receivedQty: true,
        asn: {
          select: {
            warehouseId: true,
            clientId: true,
          },
        },
      },
    })
    const pendingPutawayRecordGroups = await prismaRead.receivingRecord.groupBy({
      by: ['warehouseId', 'clientId', 'skuId', 'skuCode'],
      where: {
        tenantId: auth.user.tenantId,
        status: 'COMPLETED',
        isPutawayAllocated: false,
        receivingMode: { not: 'CONTAINER' },
        asn: {
          tenantId: auth.user.tenantId,
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
        ...(warehouseId ? { warehouseId } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
      },
      _sum: {
        receivedQty: true,
      },
    })
    const pendingPutawayContainerItemRows = await prismaRead.containerItem.findMany({
      where: {
        tenantId: auth.user.tenantId,
        putawayOrderLineId: null,
        asn: {
          tenantId: auth.user.tenantId,
          ...(warehouseId ? { warehouseId } : {}),
          ...(query.clientId ? { clientId: query.clientId } : {}),
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      },
      select: {
        skuId: true,
        quantity: true,
        asn: {
          select: {
            warehouseId: true,
            clientId: true,
          },
        },
      },
    })
    const pendingPutawayLineRows = await prismaRead.putawayOrderLine.findMany({
      where: {
        tenantId: auth.user.tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        remainingQty: { gt: 0 },
        asn: {
          tenantId: auth.user.tenantId,
          ...(warehouseId ? { warehouseId } : {}),
          ...(query.clientId ? { clientId: query.clientId } : {}),
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      },
      select: {
        skuId: true,
        remainingQty: true,
        asn: {
          select: {
            warehouseId: true,
            clientId: true,
          },
        },
      },
    })

    for (const row of pendingReceiveRows) {
      const pendingQty = Math.max(0, row.expectedQty - row.receivedQty)
      if (pendingQty <= 0) continue
      const key = `${row.asn.warehouseId}:${row.skuId}:${row.asn.clientId || ''}`
      if (!paginatedKeys.has(key)) continue
      const summary = paginatedData.find((item) => `${item.warehouseId}:${item.skuId}:${item.clientId || ''}` === key)
      if (summary) summary.pendingReceiveQty += pendingQty
    }

    for (const group of pendingPutawayRecordGroups) {
      const key = `${group.warehouseId}:${group.skuId}:${group.clientId || ''}`
      if (!paginatedKeys.has(key)) continue
      const summary = paginatedData.find((item) => `${item.warehouseId}:${item.skuId}:${item.clientId || ''}` === key)
      if (summary) summary.pendingPutawayQty += group._sum.receivedQty || 0
    }

    for (const row of pendingPutawayContainerItemRows) {
      const pendingQty = row.quantity || 0
      if (pendingQty <= 0) continue
      const key = `${row.asn.warehouseId}:${row.skuId}:${row.asn.clientId || ''}`
      if (!paginatedKeys.has(key)) continue
      const summary = paginatedData.find((item) => `${item.warehouseId}:${item.skuId}:${item.clientId || ''}` === key)
      if (summary) summary.pendingPutawayQty += pendingQty
    }

    for (const row of pendingPutawayLineRows) {
      const pendingQty = row.remainingQty || 0
      if (pendingQty <= 0) continue
      const key = `${row.asn.warehouseId}:${row.skuId}:${row.asn.clientId || ''}`
      if (!paginatedKeys.has(key)) continue
      const summary = paginatedData.find((item) => `${item.warehouseId}:${item.skuId}:${item.clientId || ''}` === key)
      if (summary) summary.pendingPutawayQty += pendingQty
    }

    // 获取仓库和客户信息
    const warehouseIds = [...new Set(paginatedData.map((s) => s.warehouseId))]
    const clientIds = [...new Set(paginatedData.map((s) => s.clientId).filter(Boolean))] as string[]

    const [warehouses, clients] = await Promise.all([
      prismaRead.warehouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, warehouseCode: true, warehouseName: true },
      }),
      clientIds.length > 0
        ? prismaRead.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, clientCode: true, clientName: true },
          })
        : [],
    ])

    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))
    const clientMap = new Map(clients.map((c) => [c.id, c]))

    // 格式化输出
    const result = paginatedData.map((s) => ({
      id: `${s.warehouseId}:${s.skuId}:${s.clientId || ''}`,
      warehouseId: s.warehouseId,
      skuId: s.skuId,
      skuCode: s.skuCode,
      clientId: s.clientId,
      quantityAvailable: s.available,
      quantityAllocated: s.allocated,
      quantityPicking: s.picking,
      quantityFrozen: s.frozen,
      quantityDefective: s.defective,
      quantityException: s.exception,
      quantityQcHold: s.qcHold,
      quantityCountHold: s.countHold,
      quantityCountSurplus: s.countSurplus,
      quantityCountShortage: s.countShortage,
      pendingReceiveQty: s.pendingReceiveQty,
      pendingPutawayQty: s.pendingPutawayQty,
      totalOnHand: s.total,
      warehouse: warehouseMap.get(s.warehouseId) || null,
      client: s.clientId ? clientMap.get(s.clientId) || null : null,
    }))

    // 计算全局汇总
    const globalTotals = summaries.reduce(
      (acc, s) => ({
        receiving: acc.receiving,
        pendingReceive: acc.pendingReceive + s.pendingReceiveQty,
        pendingPutaway: acc.pendingPutaway + s.pendingPutawayQty,
        available: acc.available + s.available,
        defective: acc.defective + s.defective,
        exception: acc.exception + s.exception,
        reserved: acc.reserved + s.allocated,
        frozen: acc.frozen + s.frozen,
        shipped: acc.shipped,
        totalOnHand: acc.totalOnHand + s.total,
      }),
      { receiving: 0, pendingReceive: 0, pendingPutaway: 0, available: 0, defective: 0, exception: 0, reserved: 0, frozen: 0, shipped: 0, totalOnHand: 0 }
    )

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      totals: globalTotals,
    })
  } catch (error) {
    console.error('获取库存汇总失败:', error)
    return NextResponse.json({ success: false, message: '获取库存汇总失败' }, { status: 500 })
  }
})
