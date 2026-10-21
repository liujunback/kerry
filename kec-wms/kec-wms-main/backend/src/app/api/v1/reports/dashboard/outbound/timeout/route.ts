import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { addDays, endOfDay, format, startOfDay, subDays } from '@/lib/utils/date-formatter'

const REPORT_PERMISSION = 'report:read'
const COMPLETED_STATUSES = ['SHIPPED', 'DELIVERED', 'CANCELLED']
const BUCKETS = ['9H', '-1D', '-2D', '-3D', '-4D', '-5D', '-5D+'] as const
const OUTBOUND_TIMEOUT_STATUSES = [
  'MATCH_FAILED',
  'NUMBER_CHANGE_EXCEPTION',
  'OUTBOUND_EXCEPTION',
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
] as const
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

type Metric = 'OC' | 'PCS' | 'PPO'
type TimeoutStatus = (typeof OUTBOUND_TIMEOUT_STATUSES)[number]

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

function parseList(searchParams: URLSearchParams, key: string) {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function buildDateColumns(start: Date, end: Date) {
  const dates: string[] = []
  let cursor = startOfDay(start)
  const last = startOfDay(end)
  while (cursor <= last) {
    dates.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return dates
}

function buildWhere(
  tenantId: string,
  warehouseId: string | undefined,
  searchParams: URLSearchParams,
  range: { start: Date; end: Date }
): Prisma.OutboundOrderWhereInput {
  const clientCode = searchParams.get('clientCode')?.trim()
  const channel = searchParams.get('channel')?.trim()
  const orderTypes = parseList(searchParams, 'orderTypes')
  const platforms = parseList(searchParams, 'platforms')
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
              gte: range.start,
              lte: range.end,
              lt: now,
            },
          },
        },
      },
      {
        timeline: { is: null },
        createdAt: {
          gte: range.start,
          lte: range.end,
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
          gte: range.start,
          lte: range.end,
          lt: now,
        },
      },
    ],
  })

  return {
    tenantId,
    ...(warehouseId ? { warehouseId } : {}),
    ...(clientCode ? { client: { clientCode: { contains: clientCode } } } : {}),
    ...(orderTypes.length > 0 ? { orderType: { in: orderTypes } } : {}),
    ...(platforms.length > 0 ? { orderSource: { in: platforms } } : {}),
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    status: { notIn: COMPLETED_STATUSES },
  }
}

async function fetchOrders(where: Prisma.OutboundOrderWhereInput) {
  return prismaRead.outboundOrder.findMany({
    where,
    select: {
      id: true,
      status: true,
      numberChangeStatus: true,
      createdAt: true,
      totalOrderedQty: true,
      totalSkuCount: true,
      timeline: { select: { expectedOutboundTime: true } },
    },
  })
}

function resolveTimeoutStatus(order: Awaited<ReturnType<typeof fetchOrders>>[number]): TimeoutStatus | null {
  if (order.status === 'OUT_OF_STOCK') return 'MATCH_FAILED'
  if (order.numberChangeStatus === 'FAILED') return 'NUMBER_CHANGE_EXCEPTION'
  if (order.status === 'EXCEPTION') return 'OUTBOUND_EXCEPTION'
  if (DIRECT_ORDER_STATUSES.has(order.status)) return order.status as TimeoutStatus
  return null
}

function getTimeoutBaseAt(order: Awaited<ReturnType<typeof fetchOrders>>[number]) {
  return normalizeDate(order.timeline?.expectedOutboundTime) || normalizeDate(order.createdAt)
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

function createCell() {
  return { oc: 0, pcs: 0, ppo: 0, avgTimeoutHours: 0 }
}

function metricValue(cell: ReturnType<typeof createCell>, metric: Metric) {
  if (metric === 'PCS') return cell.pcs
  if (metric === 'PPO') return cell.ppo
  return cell.oc
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, REPORT_PERMISSION)
  if (permissionResponse) return permissionResponse

  try {
    const { searchParams } = new URL(request.url)
    const today = new Date()
    const end = parseDate(searchParams.get('endDate'), endOfDay(today), 'end')
    const start = parseDate(searchParams.get('startDate'), startOfDay(subDays(today, 6)), 'start')
    const range = { start, end }
    const metric = (['OC', 'PCS', 'PPO'].includes(searchParams.get('metric') || '')
      ? searchParams.get('metric')
      : 'OC') as Metric
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const dates = buildDateColumns(start, end)
    const orders = await fetchOrders(buildWhere(auth.user.tenantId, warehouseId, searchParams, range))
    const now = new Date()
    const statusMap = new Map<TimeoutStatus, Map<string, Map<string, ReturnType<typeof createCell>>>>()
    const timeoutSums = new Map<TimeoutStatus, Map<string, Map<string, number>>>()
    const totals = new Map<TimeoutStatus, { oc: number; pcs: number }>()

    for (const order of orders) {
      const timeoutBaseAt = getTimeoutBaseAt(order)
      if (!timeoutBaseAt) continue
      const timeoutStatus = resolveTimeoutStatus(order)
      if (!timeoutStatus) continue
      const date = format(timeoutBaseAt, 'yyyy-MM-dd')
      const bucket = getBucket(timeoutBaseAt, now)
      const statusCells = statusMap.get(timeoutStatus) || new Map()
      const dateCells = statusCells.get(date) || new Map(BUCKETS.map((item) => [item, createCell()]))
      const cell = dateCells.get(bucket) || createCell()
      const timeoutHours = (now.getTime() - timeoutBaseAt.getTime()) / (60 * 60 * 1000)

      cell.oc += 1
      cell.pcs += order.totalOrderedQty
      cell.ppo = cell.oc > 0 ? Number((cell.pcs / cell.oc).toFixed(2)) : 0
      dateCells.set(bucket, cell)
      statusCells.set(date, dateCells)
      statusMap.set(timeoutStatus, statusCells)

      const statusSums = timeoutSums.get(timeoutStatus) || new Map()
      const dateSums = statusSums.get(date) || new Map(BUCKETS.map((item) => [item, 0]))
      dateSums.set(bucket, (dateSums.get(bucket) || 0) + timeoutHours)
      statusSums.set(date, dateSums)
      timeoutSums.set(timeoutStatus, statusSums)

      const currentTotal = totals.get(timeoutStatus) || { oc: 0, pcs: 0 }
      currentTotal.oc += 1
      currentTotal.pcs += order.totalOrderedQty
      totals.set(timeoutStatus, currentTotal)
    }

    const rows = OUTBOUND_TIMEOUT_STATUSES.map((status) => {
      const dateMap = statusMap.get(status) || new Map()
      const cells = Object.fromEntries(
        dates.map((date) => {
          const bucketMap = dateMap.get(date) || new Map(BUCKETS.map((item) => [item, createCell()]))
          const buckets = Object.fromEntries(
            BUCKETS.map((bucket) => {
              const cell = bucketMap.get(bucket) || createCell()
              const timeoutTotal = timeoutSums.get(status)?.get(date)?.get(bucket) || 0
              return [bucket, {
                ...cell,
                avgTimeoutHours: cell.oc > 0 ? Number((timeoutTotal / cell.oc).toFixed(1)) : 0,
                value: metricValue(cell, metric),
              }]
            })
          )
          return [date, buckets]
        })
      )
      const total = totals.get(status) || { oc: 0, pcs: 0 }
      const totalOc = total.oc
      const totalPcs = total.pcs

      return {
        status,
        statusName: status,
        cells,
        total: {
          oc: totalOc,
          pcs: totalPcs,
          ppo: totalOc > 0 ? Number((totalPcs / totalOc).toFixed(2)) : 0,
          value: metric === 'PCS' ? totalPcs : metric === 'PPO' ? (totalOc > 0 ? Number((totalPcs / totalOc).toFixed(2)) : 0) : totalOc,
        },
      }
    })

    const summaryTotalOrders = rows.reduce((sum, row) => sum + row.total.oc, 0)
    const totalPcs = rows.reduce((sum, row) => sum + row.total.pcs, 0)

    return NextResponse.json({
      success: true,
      data: {
        dates,
        buckets: [...BUCKETS],
        metric,
        rows,
        summary: {
          totalOrders: summaryTotalOrders,
          totalPieces: totalPcs,
          ppo: summaryTotalOrders > 0 ? Number((totalPcs / summaryTotalOrders).toFixed(2)) : 0,
        },
        lastUpdatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Outbound timeout dashboard report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch outbound timeout dashboard report' },
      { status: 500 }
    )
  }
})
