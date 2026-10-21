import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { endOfDay, format, startOfDay, subDays } from '@/lib/utils/date-formatter'

const REPORT_PERMISSION = 'report:read'
const COMPLETED_ORDER_STATUSES = ['CHECKED_OUT', 'SHIPPED', 'DELIVERED'] as const
const CANCELLED_ORDER_STATUSES = ['CANCELLED'] as const

interface DashboardScope {
  tenantId: string
  warehouseId?: string
  clientId?: string
  clientCode?: string
  channel?: string
  timeType: 'createdAt' | 'expectedOutboundTime'
}

type OrderForAggregation = Awaited<ReturnType<typeof fetchOrdersForAggregation>>[number]

function parseDate(value: string | null, fallback: Date, boundary: 'start' | 'end') {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  return boundary === 'start' ? startOfDay(parsed) : endOfDay(parsed)
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0)
}

function buildOrderWhere(
  scope: DashboardScope,
  dateRange?: { start: Date; end: Date }
): Prisma.OutboundOrderWhereInput {
  const where: Prisma.OutboundOrderWhereInput = {
    tenantId: scope.tenantId,
  }

  if (scope.warehouseId) where.warehouseId = scope.warehouseId
  if (scope.clientId) where.clientId = scope.clientId
  if (scope.clientCode) where.client = { clientCode: { contains: scope.clientCode } }
  if (scope.channel) {
    where.OR = [
      { shippingMethod: { contains: scope.channel } },
      { extension: { is: { channel: { contains: scope.channel } } } },
      { shipments: { some: { carrierName: { contains: scope.channel } } } },
      { shipments: { some: { carrierCode: { contains: scope.channel } } } },
    ]
  }
  if (dateRange) {
    if (scope.timeType === 'expectedOutboundTime') {
      where.timeline = {
        is: {
          expectedOutboundTime: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      }
    } else {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      }
    }
  }

  return where
}

function buildShipmentWhere(
  scope: DashboardScope,
  dateRange: { start: Date; end: Date }
): Prisma.ShipmentWhereInput {
  const where: Prisma.ShipmentWhereInput = {
    tenantId: scope.tenantId,
    createdAt: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
  }

  if (scope.warehouseId) where.warehouseId = scope.warehouseId
  if (scope.clientId || scope.clientCode || scope.channel) {
    where.order = {
      ...(scope.clientId ? { clientId: scope.clientId } : {}),
      ...(scope.clientCode ? { client: { clientCode: { contains: scope.clientCode } } } : {}),
      ...(scope.channel ? { shippingMethod: { contains: scope.channel } } : {}),
    }
  }

  return where
}

function buildPickingExceptionWhere(scope: DashboardScope): Prisma.PickingExceptionCaseWhereInput {
  const where: Prisma.PickingExceptionCaseWhereInput = {
    tenantId: scope.tenantId,
    status: 'OPEN',
  }

  if (scope.warehouseId) where.warehouseId = scope.warehouseId

  return where
}

function buildTrendDays(end: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = subDays(end, 6 - index)
    return {
      date: format(date, 'yyyy-MM-dd'),
      start: startOfDay(date),
      end: endOfDay(date),
    }
  })
}

async function fetchOrdersForAggregation(where: Prisma.OutboundOrderWhereInput) {
  return prismaRead.outboundOrder.findMany({
    where,
    select: {
      id: true,
      clientId: true,
      warehouseId: true,
      orderNumber: true,
      status: true,
      shippingMethod: true,
      numberChangeStatus: true,
      needConsolidation: true,
      isCombined: true,
      createdAt: true,
      totalOrderedQty: true,
      totalPickedQty: true,
      totalPackedQty: true,
      totalShippedQty: true,
      totalSkuCount: true,
      totalVolumeCbm: true,
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: { warehouseName: true } },
      timeline: { select: { expectedOutboundTime: true, checkedOutAt: true } },
      extension: { select: { channel: true } },
      shipments: { select: { carrierName: true, carrierCode: true, packageCount: true } },
      interceptionCases: { select: { status: true, isActive: true } },
    },
  })
}

function isCompleted(status: string) {
  return (COMPLETED_ORDER_STATUSES as readonly string[]).includes(status)
}

function isCancelled(status: string) {
  return (CANCELLED_ORDER_STATUSES as readonly string[]).includes(status)
}

function isDelayed(order: OrderForAggregation, now: Date) {
  return Boolean(order.timeline?.expectedOutboundTime && order.timeline.expectedOutboundTime < now && !isCompleted(order.status) && !isCancelled(order.status))
}

function classifyStage(order: OrderForAggregation) {
  const hasPendingInterception = order.interceptionCases.some((item) => item.isActive && item.status === 'PENDING_INTERCEPTION')
  const hasIntercepted = order.interceptionCases.some((item) => item.isActive && item.status === 'INTERCEPTED')

  if (order.status === 'OUT_OF_STOCK') return 'MATCH_FAILED'
  if (order.numberChangeStatus === 'FAILED') return 'NUMBER_CHANGE_EXCEPTION'
  if (order.status === 'EXCEPTION') return 'PENDING'
  if (hasPendingInterception) return 'PENDING_INTERCEPTION'
  if (['PENDING_WAVE', 'IN_WAVE', 'WAVED'].includes(order.status) || (order.needConsolidation && !order.isCombined)) return 'CONSOLIDATION'
  if (['PENDING_PICK', 'PICKING', 'PICKED'].includes(order.status)) return 'PICKING'
  if (['SORTING', 'SORTED'].includes(order.status)) return 'SORTING'
  if (['PACKING', 'PACKED', 'READY_SHIP', 'CHECKOUT_PENDING'].includes(order.status)) return 'PACKING'
  if (isCompleted(order.status)) return 'HANDOVER'
  if (hasIntercepted) return 'INTERCEPTED'
  if (isCancelled(order.status)) return 'CANCELLED'

  return 'PENDING'
}

function aggregateStages(orders: OrderForAggregation[]) {
  const stageDefs = [
    { stage: 'MATCH_FAILED', stageName: '匹配失败', color: '#EF4444' },
    { stage: 'NUMBER_CHANGE_EXCEPTION', stageName: '换号异常', color: '#F97316' },
    { stage: 'PENDING_INTERCEPTION', stageName: '待拦截', color: '#F59E0B' },
    { stage: 'CONSOLIDATION', stageName: '汇单', color: '#2563EB' },
    { stage: 'PICKING', stageName: '拣货', color: '#10B981' },
    { stage: 'SORTING', stageName: '分拣', color: '#0EA5E9' },
    { stage: 'PACKING', stageName: '打包', color: '#14B8A6' },
    { stage: 'HANDOVER', stageName: '签出', color: '#22C55E' },
    { stage: 'INTERCEPTED', stageName: '已拦截', color: '#64748B' },
    { stage: 'CANCELLED', stageName: '取消', color: '#94A3B8' },
    { stage: 'PENDING', stageName: '待处理', color: '#64748B' },
  ]
  const counts = new Map<string, { count: number; pieces: number }>()

  for (const order of orders) {
    const stage = classifyStage(order)
    const current = counts.get(stage) || { count: 0, pieces: 0 }
    current.count += 1
    current.pieces += order.totalOrderedQty
    counts.set(stage, current)
  }

  return stageDefs.map((item) => {
    const value = counts.get(item.stage) || { count: 0, pieces: 0 }
    return {
      ...item,
      count: value.count,
      pieces: value.pieces,
      percent: orders.length > 0 ? Number(((value.count / orders.length) * 100).toFixed(2)) : 0,
    }
  })
}

function groupByStatus(orders: OrderForAggregation[]) {
  const statusMap = new Map<string, number>()
  for (const order of orders) {
    statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1)
  }

  return Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

function groupByClient(orders: OrderForAggregation[]) {
  const clientMap = new Map<string, { client: string; orderCount: number; orderedQty: number; pickedQty: number; packedQty: number }>()
  for (const order of orders) {
    const current = clientMap.get(order.clientId) || {
      client: order.client.clientName,
      orderCount: 0,
      orderedQty: 0,
      pickedQty: 0,
      packedQty: 0,
    }
    current.orderCount += 1
    current.orderedQty += order.totalOrderedQty
    current.pickedQty += order.totalPickedQty
    current.packedQty += order.totalPackedQty
    clientMap.set(order.clientId, current)
  }

  return Array.from(clientMap.entries())
    .map(([clientId, item]) => ({ clientId, ...item }))
    .sort((a, b) => b.orderCount - a.orderCount)
}

function groupByCarrier(orders: OrderForAggregation[]) {
  const carrierMap = new Map<string, { shipments: number; packages: number }>()
  for (const order of orders) {
    const carrier = order.extension?.channel || order.shippingMethod || order.shipments[0]?.carrierName || order.shipments[0]?.carrierCode || 'Unknown'
    const packages = order.shipments.reduce((total, shipment) => total + shipment.packageCount, 0)
    const current = carrierMap.get(carrier) || { shipments: 0, packages: 0 }
    current.shipments += order.shipments.length
    current.packages += packages
    carrierMap.set(carrier, current)
  }

  return Array.from(carrierMap.entries())
    .map(([carrier, item]) => ({ carrier, ...item }))
    .sort((a, b) => b.shipments - a.shipments)
    .slice(0, 10)
}

function getOrderTime(order: OrderForAggregation, timeType: DashboardScope['timeType']) {
  return timeType === 'expectedOutboundTime'
    ? order.timeline?.expectedOutboundTime
    : order.createdAt
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, REPORT_PERMISSION)
  if (permissionResponse) return permissionResponse

  try {
    const { searchParams } = new URL(request.url)
    const today = new Date()
    const tenantId = auth.user.tenantId
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const clientId = searchParams.get('clientId') || undefined
    const clientCode = searchParams.get('clientCode')?.trim() || undefined
    const channel = searchParams.get('channel')?.trim() || undefined
    const timeType = searchParams.get('timeType') === 'expectedOutboundTime' ? 'expectedOutboundTime' : 'createdAt'
    const end = parseDate(searchParams.get('endDate'), endOfDay(today), 'end')
    const start = parseDate(searchParams.get('startDate'), startOfDay(subDays(end, 6)), 'start')
    const scope: DashboardScope = { tenantId, warehouseId, clientId, clientCode, channel, timeType }
    const range = { start, end }
    const todayRange = { start: startOfDay(today), end: endOfDay(today) }
    const rangeOrderWhere = buildOrderWhere(scope, range)
    const pickingExceptionWhere = buildPickingExceptionWhere(scope)

    const rangeOrders = await fetchOrdersForAggregation(rangeOrderWhere)
    if (clientId || clientCode || channel) {
      pickingExceptionWhere.orderId = { in: rangeOrders.map((order) => order.id) }
    }

    const [todayOrders, todayShipped, pickingExceptionCount, shipmentStats, recentOrders] = await Promise.all([
      prismaRead.outboundOrder.count({ where: buildOrderWhere(scope, todayRange) }),
      prismaRead.outboundOrder.count({
        where: {
          ...buildOrderWhere(scope, todayRange),
          status: { in: [...COMPLETED_ORDER_STATUSES] },
        },
      }),
      prismaRead.pickingExceptionCase.count({ where: pickingExceptionWhere }),
      prismaRead.shipment.aggregate({
        where: buildShipmentWhere(scope, range),
        _count: { id: true },
        _sum: { packageCount: true },
      }),
      prismaRead.outboundOrder.findMany({
        where: rangeOrderWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          totalOrderedQty: true,
          totalPickedQty: true,
          totalPackedQty: true,
          client: { select: { clientCode: true, clientName: true } },
          warehouse: { select: { warehouseName: true } },
          timeline: { select: { expectedOutboundTime: true } },
          extension: { select: { channel: true } },
        },
      }),
    ])

    const now = new Date()
    const cancelledOrders = rangeOrders.filter((order) => isCancelled(order.status))
    const completedOrders = rangeOrders.filter((order) => isCompleted(order.status))
    const pendingOutbound = rangeOrders.filter((order) => !isCompleted(order.status) && !isCancelled(order.status))
    const delayedOrders = rangeOrders.filter((order) => isDelayed(order, now))
    const denominator = rangeOrders.length - cancelledOrders.length
    const completionRate = denominator > 0 ? Number(((completedOrders.length / denominator) * 100).toFixed(2)) : 0

    const trend = buildTrendDays(end).map((item) => {
      const dayOrders = rangeOrders.filter((order) => {
        const time = getOrderTime(order, timeType)
        return time && time >= item.start && time <= item.end
      })

      return {
        date: item.date,
        orderCount: dayOrders.length,
        shippedCount: dayOrders.filter((order) => isCompleted(order.status)).length,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          todayOrders,
          todayShipped,
          pendingAllocation: rangeOrders.filter((order) => ['CREATED', 'PENDING', 'OUT_OF_STOCK', 'ON_HOLD'].includes(order.status)).length,
          pendingWave: rangeOrders.filter((order) => ['ALLOCATED', 'PENDING_WAVE', 'IN_WAVE', 'WAVED'].includes(order.status)).length,
          pickingInProgress: rangeOrders.filter((order) => ['PENDING_PICK', 'PICKING', 'PICKED', 'SORTING', 'SORTED'].includes(order.status)).length,
          packingInProgress: rangeOrders.filter((order) => ['PACKING', 'PACKED', 'CHECKOUT_PENDING'].includes(order.status)).length,
          pickingExceptionCount,
          totalOrders: rangeOrders.length,
          pendingOutbound: pendingOutbound.length,
          delayedOrders: delayedOrders.length,
          completionRate,
          totalOrderedQty: rangeOrders.reduce((total, order) => total + order.totalOrderedQty, 0),
          totalPickedQty: rangeOrders.reduce((total, order) => total + order.totalPickedQty, 0),
          totalPackedQty: rangeOrders.reduce((total, order) => total + order.totalPackedQty, 0),
          totalShippedQty: rangeOrders.reduce((total, order) => total + order.totalShippedQty, 0),
          totalVolumeCbm: Number(rangeOrders.reduce((total, order) => total + decimalToNumber(order.totalVolumeCbm), 0).toFixed(3)),
          shipmentCount: shipmentStats._count.id,
          packageCount: shipmentStats._sum.packageCount || 0,
        },
        trend,
        byStatus: groupByStatus(rangeOrders),
        byCarrier: groupByCarrier(rangeOrders),
        byClient: groupByClient(rangeOrders),
        stageDistribution: aggregateStages(rangeOrders),
        recentOrders,
      },
    })
  } catch (error) {
    console.error('Outbound dashboard report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outbound dashboard report' },
      { status: 500 }
    )
  }
})
