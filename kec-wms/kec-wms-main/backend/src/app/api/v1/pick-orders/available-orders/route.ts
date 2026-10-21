import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { availableOrdersQuerySchema } from '@/lib/validations/pick-order'
import { NextRequest,NextResponse } from 'next/server'

// GET /api/v1/pick-orders/available-orders - 获取可创建拣货单的订单列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = availableOrdersQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      orderNumber: searchParams.get('orderNumber'),
      clientId: searchParams.get('clientId'),
      channelGroup: searchParams.get('channelGroup'),
      orderBusinessType: searchParams.get('orderBusinessType'),
      orderType: searchParams.get('orderType'),
      orderSource: searchParams.get('orderSource'),
      isCombined: searchParams.get('isCombined'),
      createdDateFrom: searchParams.get('createdDateFrom'),
      createdDateTo: searchParams.get('createdDateTo'),
      expectedOutboundFrom: searchParams.get('expectedOutboundFrom'),
      expectedOutboundTo: searchParams.get('expectedOutboundTo'),
      platform: searchParams.get('platform'),
      hasSerialItems: searchParams.get('hasSerialItems'),
      brand: searchParams.get('brand'),
      totalSkuCountMin: searchParams.get('totalSkuCountMin'),
      totalSkuCountMax: searchParams.get('totalSkuCountMax'),
      totalOrderedQtyMin: searchParams.get('totalOrderedQtyMin'),
      totalOrderedQtyMax: searchParams.get('totalOrderedQtyMax'),
      totalWeightKgMin: searchParams.get('totalWeightKgMin'),
      totalWeightKgMax: searchParams.get('totalWeightKgMax'),
      hasNotes: searchParams.get('hasNotes'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const {
      page, pageSize, warehouseId: requestedWarehouseId, orderNumber, clientId, channelGroup,
      orderBusinessType, orderType, orderSource, isCombined,
      createdDateFrom, createdDateTo, expectedOutboundFrom, expectedOutboundTo,
      platform, hasSerialItems, brand,
      totalSkuCountMin, totalSkuCountMax, totalOrderedQtyMin, totalOrderedQtyMax,
      totalWeightKgMin, totalWeightKgMax, hasNotes, sortBy, sortOrder,
    } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    // 构建查询条件 - 只查询已分配状态的订单
    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      status: 'ALLOCATED', // 只查询已分配状态的订单
    }
    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    // 订单号搜索
    if (orderNumber) {
      where.OR = [
        { orderNumber: { contains: orderNumber } },
        { referenceNumber: { contains: orderNumber } },
      ]
    }

    if (clientId) where.clientId = clientId
    if (orderBusinessType) where.orderBusinessType = orderBusinessType
    if (orderType) where.orderType = orderType
    if (orderSource) where.orderSource = orderSource
    if (isCombined !== undefined) where.isCombined = isCombined
    if (platform) where.platform = platform
    if (hasSerialItems !== undefined) where.hasSerialItems = hasSerialItems

    // 渠道组筛选
    if (channelGroup) {
      where.extension = { channel: channelGroup }
    }

    // 品牌筛选（需要关联查询）
    if (brand) {
      where.lines = {
        some: {
          sku: { brand: { contains: brand } },
        },
      }
    }

    // 创建时间范围
    if (createdDateFrom || createdDateTo) {
      where.createdAt = {}
      if (createdDateFrom) (where.createdAt as Record<string, unknown>).gte = createdDateFrom
      if (createdDateTo) {
        // 结束日期需要包含当天，设置为当天的23:59:59.999
        const endDate = new Date(createdDateTo)
        endDate.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, unknown>).lte = endDate
      }
    }

    // 预计出库时间范围
    if (expectedOutboundFrom || expectedOutboundTo) {
      const dateRange: Record<string, unknown> = {}
      if (expectedOutboundFrom) dateRange.gte = expectedOutboundFrom
      if (expectedOutboundTo) dateRange.lte = expectedOutboundTo
      if (where.timeline) {
        (where.timeline as Record<string, unknown>).expectedOutboundTime = dateRange
      } else {
        where.timeline = { expectedOutboundTime: dateRange }
      }
    }

    // SKU种类数范围
    if (totalSkuCountMin !== undefined || totalSkuCountMax !== undefined) {
      where.totalSkuCount = {}
      if (totalSkuCountMin !== undefined) {
        (where.totalSkuCount as Record<string, unknown>).gte = totalSkuCountMin
      }
      if (totalSkuCountMax !== undefined) {
        (where.totalSkuCount as Record<string, unknown>).lte = totalSkuCountMax
      }
    }

    // 商品件数范围
    if (totalOrderedQtyMin !== undefined || totalOrderedQtyMax !== undefined) {
      where.totalOrderedQty = {}
      if (totalOrderedQtyMin !== undefined) {
        (where.totalOrderedQty as Record<string, unknown>).gte = totalOrderedQtyMin
      }
      if (totalOrderedQtyMax !== undefined) {
        (where.totalOrderedQty as Record<string, unknown>).lte = totalOrderedQtyMax
      }
    }

    // 订单重量范围
    if (totalWeightKgMin !== undefined || totalWeightKgMax !== undefined) {
      where.totalWeightKg = {}
      if (totalWeightKgMin !== undefined) {
        (where.totalWeightKg as Record<string, unknown>).gte = totalWeightKgMin
      }
      if (totalWeightKgMax !== undefined) {
        (where.totalWeightKg as Record<string, unknown>).lte = totalWeightKgMax
      }
    }

    // 备注筛选
    if (hasNotes === true) {
      where.notes = { not: null }
    } else if (hasNotes === false) {
      where.OR = [...(where.OR as unknown[] || []), { notes: null }, { notes: '' }]
    }

    // 确定排序字段
    let orderBy: Record<string, unknown>
    if (sortBy === 'allocatedAt') {
      orderBy = { timeline: { allocatedAt: sortOrder } }
    } else if (sortBy === 'expectedOutboundTime') {
      orderBy = { timeline: { expectedOutboundTime: sortOrder } }
    } else {
      orderBy = { [sortBy]: sortOrder }
    }

    const total = await prismaRead.outboundOrder.count({ where })

    const orders = await prismaRead.outboundOrder.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        referenceNumber: true,
        orderBusinessType: true,
        orderType: true,
        status: true,
        isCombined: true,
        totalWeightKg: true,
        totalSkuCount: true,
        totalOrderedQty: true,
        hasSerialItems: true,
        notes: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        timeline: {
          select: {
            allocatedAt: true,
            expectedOutboundTime: true,
          },
        },
        extension: {
          select: {
            channel: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取可选订单列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取可选订单列表失败' },
      { status: 500 }
    )
  }
})
