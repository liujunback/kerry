import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { endOfDay, startOfDay } from '@/lib/utils/date-formatter'

const REPORT_PERMISSION = 'report:read'
const COMPLETED_STATUSES = ['SHIPPED', 'DELIVERED', 'CANCELLED']
const DIRECT_ORDER_STATUSES = new Set([
  'PENDING',
  'ALLOCATED',
  'PENDING_WAVE',
  'IN_WAVE',
  'WAVED',
  'PICKING',
  'PICKED',
  'SORTING',
  'SORTED',
  'PACKING',
  'PACKED',
  'READY_SHIP',
])

type OrderForDetails = Awaited<ReturnType<typeof fetchOrders>>[number]

function normalizeDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function parseDate(value: string | null, fallback: Date, boundary: 'start' | 'end') {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  return boundary === 'start' ? startOfDay(parsed) : endOfDay(parsed)
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function buildWhere(
  tenantId: string,
  warehouseId: string | undefined,
  searchParams: URLSearchParams
): Prisma.OutboundOrderWhereInput {
  const date = searchParams.get('date')
  const clientCode = searchParams.get('clientCode')?.trim()
  const channel = searchParams.get('channel')?.trim()
  const start = parseDate(date, startOfDay(new Date()), 'start')
  const end = parseDate(date, endOfDay(new Date()), 'end')
  const now = new Date()
  const andClauses: Prisma.OutboundOrderWhereInput[] = []

  if (channel) {
    andClauses.push({
      OR: [
        { shippingMethod: { contains: channel } },
        { extension: { is: { channel: { contains: channel } } } },
        { shipments: { some: { carrierName: { contains: channel } } } },
        { shipments: { some: { carrierCode: { contains: channel } } } },
      ],
    })
  }

  andClauses.push({
    OR: [
      {
        timeline: {
          is: {
            expectedOutboundTime: {
              gte: start,
              lte: end,
              lt: now,
            },
          },
        },
      },
      {
        timeline: { is: null },
        createdAt: {
          gte: start,
          lte: end,
          lt: now,
        },
      },
      {
        timeline: {
          is: {
            expectedOutboundTime: null,
          },
        },
        createdAt: {
          gte: start,
          lte: end,
          lt: now,
        },
      },
    ],
  })

  return {
    tenantId,
    ...(warehouseId ? { warehouseId } : {}),
    ...(clientCode ? { client: { clientCode: { contains: clientCode } } } : {}),
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    status: { notIn: COMPLETED_STATUSES },
  }
}

async function fetchOrders(where: Prisma.OutboundOrderWhereInput) {
  return prismaRead.outboundOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 2000,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      numberChangeStatus: true,
      totalSkuCount: true,
      totalOrderedQty: true,
      createdAt: true,
      client: { select: { clientCode: true, clientName: true } },
      timeline: { select: { expectedOutboundTime: true } },
    },
  })
}

function resolveTimeoutStatus(order: Awaited<ReturnType<typeof fetchOrders>>[number]) {
  if (order.status === 'OUT_OF_STOCK') return 'MATCH_FAILED'
  if (order.numberChangeStatus === 'FAILED') return 'NUMBER_CHANGE_EXCEPTION'
  if (order.status === 'EXCEPTION') return 'OUTBOUND_EXCEPTION'
  if (DIRECT_ORDER_STATUSES.has(order.status)) return order.status
  return null
}

function getBucket(expectedOutboundTime: Date, now: Date) {
  const hours = (now.getTime() - expectedOutboundTime.getTime()) / (60 * 60 * 1000)
  if (hours <= 9) return '9H'
  if (hours <= 24) return '-1D'
  if (hours <= 48) return '-2D'
  if (hours <= 72) return '-3D'
  if (hours <= 96) return '-4D'
  if (hours <= 120) return '-5D'
  return '-5D+'
}

function formatDuration(ms: number) {
  if (ms <= 0) return '-'
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return days > 0 ? `${days}天${restHours}小时` : `${restHours}小时`
}

function mapOrder(order: OrderForDetails, now: Date, status: string, timeoutBaseAt: Date) {
  const timeoutMs = now.getTime() - timeoutBaseAt.getTime()

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    clientCode: order.client.clientCode,
    clientName: order.client.clientName,
    skuCount: order.totalSkuCount,
    pieces: order.totalOrderedQty,
    expectedOutboundTime: timeoutBaseAt,
    status,
    timeoutHours: timeoutMs > 0 ? Number((timeoutMs / (60 * 60 * 1000)).toFixed(1)) : 0,
    timeoutText: formatDuration(timeoutMs),
    detailHref: `/orders/${order.id}`,
  }
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, REPORT_PERMISSION)
  if (permissionResponse) return permissionResponse

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const status = searchParams.get('status') || ''
    const bucket = searchParams.get('bucket') || ''
    const page = parsePositiveInt(searchParams.get('page'), 1, 10000)
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100)
    const now = new Date()
    const orders = await fetchOrders(buildWhere(auth.user.tenantId, warehouseId, searchParams))
    const filtered = orders
      .map((order) => {
        const timeoutStatus = resolveTimeoutStatus(order)
        if (!timeoutStatus) return null
        const timeoutBaseAt = normalizeDate(order.timeline?.expectedOutboundTime) || normalizeDate(order.createdAt)
        if (!timeoutBaseAt) return null
        return { order, timeoutStatus, timeoutBaseAt }
      })
      .filter((item): item is { order: OrderForDetails; timeoutStatus: string; timeoutBaseAt: Date } => Boolean(item))
      .filter(({ timeoutStatus, timeoutBaseAt }) => {
        const statusMatched = status ? timeoutStatus === status : true
        const bucketMatched = bucket ? getBucket(timeoutBaseAt, now) === bucket : true
        return statusMatched && bucketMatched
      })
    const start = (page - 1) * pageSize
    const items = filtered
      .slice(start, start + pageSize)
      .map(({ order, timeoutStatus, timeoutBaseAt }) => mapOrder(order, now, timeoutStatus, timeoutBaseAt))

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize),
        },
      },
    })
  } catch (error) {
    console.error('Outbound timeout dashboard details error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outbound timeout dashboard details' },
      { status: 500 }
    )
  }
})
