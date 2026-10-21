import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { endOfDay, format, startOfDay, subDays } from '@/lib/utils/date-formatter'

const REPORT_PERMISSION = 'report:read'
const PUTAWAY_STATUSES = ['PUTAWAY', 'PUTTING_AWAY'] as const

interface DashboardScope {
  tenantId: string
  warehouseId?: string
  clientId?: string
}

type AsnForAggregation = Awaited<ReturnType<typeof fetchAsnsForAggregation>>[number]

function parseDate(value: string | null, fallback: Date, boundary: 'start' | 'end') {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  return boundary === 'start' ? startOfDay(parsed) : endOfDay(parsed)
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0)
}

function buildAsnWhere(
  scope: DashboardScope,
  dateRange?: { start: Date; end: Date }
): Prisma.AsnWhereInput {
  const where: Prisma.AsnWhereInput = {
    tenantId: scope.tenantId,
  }

  if (scope.warehouseId) where.warehouseId = scope.warehouseId
  if (scope.clientId) where.clientId = scope.clientId
  if (dateRange) {
    where.OR = [
      {
        expectedPutawayDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      {
        expectedPutawayDate: null,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    ]
  }

  return where
}

function buildReceivingWhere(
  scope: DashboardScope,
  dateRange: { start: Date; end: Date }
): Prisma.ReceivingRecordWhereInput {
  const where: Prisma.ReceivingRecordWhereInput = {
    tenantId: scope.tenantId,
    receivedAt: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
  }

  if (scope.warehouseId) where.warehouseId = scope.warehouseId
  if (scope.clientId) where.clientId = scope.clientId

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

function sumLineQty(asns: AsnForAggregation[], key: 'expectedQty' | 'receivedQty' | 'putawayQty') {
  return asns.reduce(
    (total, asn) => total + asn.asnLines.reduce((lineTotal, line) => lineTotal + line[key], 0),
    0
  )
}

function sumLineVolume(asns: AsnForAggregation[], key: 'expectedQty' | 'receivedQty' | 'putawayQty') {
  return asns.reduce(
    (total, asn) =>
      total +
      asn.asnLines.reduce(
        (lineTotal, line) => lineTotal + line[key] * decimalToNumber(line.sku?.volumeCbm),
        0
      ),
    0
  )
}

function aggregateStage(
  asns: AsnForAggregation[],
  stage: string,
  stageName: string,
  color: string
) {
  return {
    stage,
    stageName,
    asnCount: asns.length,
    pieces: sumLineQty(asns, 'expectedQty'),
    volumeCbm: Number(sumLineVolume(asns, 'expectedQty').toFixed(3)),
    color,
  }
}

async function fetchAsnsForAggregation(where: Prisma.AsnWhereInput) {
  return prismaRead.asn.findMany({
    where,
    select: {
      id: true,
      warehouseId: true,
      clientId: true,
      status: true,
      signedAt: true,
      receivingStartAt: true,
      receivingEndAt: true,
      putawayStartAt: true,
      expectedPutawayDate: true,
      createdAt: true,
      totalExpectedQty: true,
      totalReceivedQty: true,
      totalPutawayQty: true,
      totalExpectedVolumeCbm: true,
      client: { select: { clientName: true } },
      warehouse: { select: { warehouseName: true } },
      asnLines: {
        select: {
          expectedQty: true,
          receivedQty: true,
          putawayQty: true,
          sku: { select: { volumeCbm: true } },
        },
      },
    },
  })
}

function getAsnRangeBaseDate(asn: AsnForAggregation) {
  return asn.expectedPutawayDate || asn.createdAt
}

function groupByStatus(asns: AsnForAggregation[]) {
  const statusMap = new Map<string, number>()
  for (const asn of asns) {
    statusMap.set(asn.status, (statusMap.get(asn.status) || 0) + 1)
  }

  return Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

function groupByWarehouse(asns: AsnForAggregation[]) {
  const warehouseMap = new Map<string, { warehouse: string; asnCount: number; expectedQty: number; receivedQty: number }>()
  for (const asn of asns) {
    const current = warehouseMap.get(asn.warehouseId) || {
      warehouse: asn.warehouse.warehouseName,
      asnCount: 0,
      expectedQty: 0,
      receivedQty: 0,
    }
    current.asnCount += 1
    current.expectedQty += asn.totalExpectedQty
    current.receivedQty += asn.totalReceivedQty
    warehouseMap.set(asn.warehouseId, current)
  }

  return Array.from(warehouseMap.entries())
    .map(([warehouseId, item]) => ({ warehouseId, ...item }))
    .sort((a, b) => b.asnCount - a.asnCount)
}

function groupByClient(asns: AsnForAggregation[]) {
  const clientMap = new Map<string, { client: string; asnCount: number; expectedQty: number; receivedQty: number }>()
  for (const asn of asns) {
    const current = clientMap.get(asn.clientId) || {
      client: asn.client.clientName,
      asnCount: 0,
      expectedQty: 0,
      receivedQty: 0,
    }
    current.asnCount += 1
    current.expectedQty += asn.totalExpectedQty
    current.receivedQty += asn.totalReceivedQty
    clientMap.set(asn.clientId, current)
  }

  return Array.from(clientMap.entries())
    .map(([clientId, item]) => ({ clientId, ...item }))
    .sort((a, b) => b.asnCount - a.asnCount)
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
    const end = parseDate(searchParams.get('endDate'), endOfDay(today), 'end')
    const start = parseDate(searchParams.get('startDate'), startOfDay(subDays(today, 6)), 'start')
    const scope: DashboardScope = { tenantId, warehouseId, clientId }
    const range = { start, end }
    const todayRange = { start: startOfDay(today), end: endOfDay(today) }
    const rangeAsnWhere = buildAsnWhere(scope, range)
    const openAsnWhere = buildAsnWhere(scope)

    const [
      rangeAsns,
      todayAsn,
      todayReceived,
      pendingSignIn,
      receivingInProgress,
      putawayInProgress,
      discrepancyStats,
      recentAsns,
    ] = await Promise.all([
      fetchAsnsForAggregation(rangeAsnWhere),
      prismaRead.asn.count({ where: buildAsnWhere(scope, todayRange) }),
      prismaRead.receivingRecord.aggregate({
        where: buildReceivingWhere(scope, todayRange),
        _sum: { receivedQty: true },
      }),
      prismaRead.asn.count({ where: { ...openAsnWhere, status: 'CREATED' } }),
      prismaRead.asn.count({ where: { ...openAsnWhere, status: 'RECEIVING' } }),
      prismaRead.asn.count({ where: { ...openAsnWhere, status: { in: [...PUTAWAY_STATUSES] } } }),
      prismaRead.receivingDiscrepancy.aggregate({
        where: {
          tenantId,
          ...(warehouseId ? { warehouseId } : {}),
          ...(clientId ? { clientId } : {}),
          asn: rangeAsnWhere,
        },
        _count: { id: true },
        _sum: { qtyDifference: true },
      }),
      prismaRead.asn.findMany({
        where: rangeAsnWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          asnNumber: true,
          status: true,
          expectedPutawayDate: true,
          createdAt: true,
          totalExpectedQty: true,
          totalReceivedQty: true,
          totalPutawayQty: true,
          client: { select: { clientName: true } },
          warehouse: { select: { warehouseName: true } },
        },
      }),
    ])

    const inTransitAsns = rangeAsns.filter((asn) => asn.status === 'CREATED')
    const arrivedAsns = rangeAsns.filter((asn) => ['ARRIVED', 'RECEIVING', ...PUTAWAY_STATUSES].includes(asn.status))
    const pendingPutawayAsns = rangeAsns.filter((asn) => asn.totalReceivedQty > asn.totalPutawayQty)
    const completedAsns = rangeAsns.filter((asn) => asn.status === 'COMPLETED')
    const completionWarningAsns = rangeAsns.filter((asn) => {
      if (!asn.expectedPutawayDate || ['COMPLETED', 'CANCELLED'].includes(asn.status)) return false
      const oneDayFromNow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      return asn.expectedPutawayDate <= oneDayFromNow
    })

    const totalReceivedQty = sumLineQty(arrivedAsns, 'receivedQty')
    const totalPutawayQty = sumLineQty(rangeAsns, 'putawayQty')
    const putawayCompletionRate = totalReceivedQty > 0 ? Number(((totalPutawayQty / totalReceivedQty) * 100).toFixed(2)) : 0

    const trend = buildTrendDays(end).map((item) => {
      const dayAsns = rangeAsns.filter((asn) => (
        getAsnRangeBaseDate(asn) >= item.start &&
        getAsnRangeBaseDate(asn) <= item.end
      ))

      return {
        date: item.date,
        asnCount: dayAsns.length,
        expectedQty: sumLineQty(dayAsns, 'expectedQty'),
        receivedQty: sumLineQty(dayAsns, 'receivedQty'),
        putawayQty: sumLineQty(dayAsns, 'putawayQty'),
      }
    })

    const stageDistribution = [
      aggregateStage(inTransitAsns, 'NOT_STARTED', '未开始', '#F97316'),
      aggregateStage(
        rangeAsns.filter((asn) => asn.status === 'ARRIVED' || (asn.signedAt && !asn.receivingStartAt)),
        'SIGNING',
        '签收',
        '#06B6D4'
      ),
      aggregateStage(
        rangeAsns.filter((asn) => asn.status === 'RECEIVING' || (asn.receivingStartAt && !asn.receivingEndAt)),
        'RECEIVING',
        '收货',
        '#0EA5E9'
      ),
      aggregateStage(
        rangeAsns.filter((asn) => PUTAWAY_STATUSES.includes(asn.status as typeof PUTAWAY_STATUSES[number])),
        'PUTTING_AWAY',
        '上架',
        '#10B981'
      ),
      aggregateStage(completedAsns, 'COMPLETED', '已上架', '#22C55E'),
      {
        stage: 'RECEIVING_EXCEPTION',
        stageName: '收货异常',
        asnCount: discrepancyStats._count.id,
        pieces: Math.abs(discrepancyStats._sum.qtyDifference || 0),
        volumeCbm: 0,
        color: '#EF4444',
      },
      aggregateStage(completionWarningAsns, 'COMPLETION_WARNING', '订单完结预警', '#F59E0B'),
    ]

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          todayAsn,
          todayReceivedQty: todayReceived._sum.receivedQty || 0,
          pendingSignIn,
          receivingInProgress,
          putawayInProgress,
          discrepancyCount: discrepancyStats._count.id,
          totalAsn: rangeAsns.length,
          totalExpectedQty: sumLineQty(rangeAsns, 'expectedQty'),
          totalReceivedQty,
          totalPutawayQty,
          inTransitPieces: sumLineQty(inTransitAsns, 'expectedQty'),
          inTransitVolumeCbm: Number(sumLineVolume(inTransitAsns, 'expectedQty').toFixed(3)),
          arrivedPieces: totalReceivedQty,
          arrivedVolumeCbm: Number(sumLineVolume(arrivedAsns, 'receivedQty').toFixed(3)),
          pendingPutawayPieces: Math.max(sumLineQty(pendingPutawayAsns, 'receivedQty') - sumLineQty(pendingPutawayAsns, 'putawayQty'), 0),
          pendingPutawayVolumeCbm: Number(Math.max(sumLineVolume(pendingPutawayAsns, 'receivedQty') - sumLineVolume(pendingPutawayAsns, 'putawayQty'), 0).toFixed(3)),
          putawayCompletionRate,
        },
        trend,
        byStatus: groupByStatus(rangeAsns),
        byWarehouse: groupByWarehouse(rangeAsns),
        byClient: groupByClient(rangeAsns),
        stageDistribution,
        recentAsns,
      },
    })
  } catch (error) {
    console.error('Inbound dashboard report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound dashboard report' },
      { status: 500 }
    )
  }
})
