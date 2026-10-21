import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { addDays, endOfDay, format, startOfDay, subDays } from '@/lib/utils/date-formatter'

const REPORT_PERMISSION = 'report:read'
const ROWS = [
  { status: 'SIGNED', statusName: '已签收' },
  { status: 'RECEIVING', statusName: '收货中' },
  { status: 'RECEIVED', statusName: '收货完成' },
  { status: 'PUTAWAY', statusName: '上架中' },
] as const

interface DashboardScope {
  tenantId: string
  warehouseId?: string
  clientIds: string[]
  asnTypes: string[]
}

type AsnForMatrix = Awaited<ReturnType<typeof fetchAsns>>[number]

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

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0)
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

function buildWhere(scope: DashboardScope, range: { start: Date; end: Date }): Prisma.AsnWhereInput {
  return {
    tenantId: scope.tenantId,
    ...(scope.warehouseId ? { warehouseId: scope.warehouseId } : {}),
    ...(scope.clientIds.length > 0 ? { clientId: { in: scope.clientIds } } : {}),
    ...(scope.asnTypes.length > 0 ? { asnType: { in: scope.asnTypes } } : {}),
    OR: [
      {
        expectedPutawayDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      {
        expectedPutawayDate: null,
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
      },
    ],
    status: { notIn: ['CREATED', 'COMPLETED', 'CANCELLED'] },
  }
}

async function fetchAsns(where: Prisma.AsnWhereInput) {
  return prismaRead.asn.findMany({
    where,
    select: {
      id: true,
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

function classifyStatus(asn: AsnForMatrix) {
  if (asn.signedAt && !asn.receivingStartAt && !asn.putawayStartAt) return 'SIGNED'
  if (asn.status === 'RECEIVING' || (asn.receivingStartAt && !asn.receivingEndAt)) return 'RECEIVING'
  if (asn.receivingEndAt && !asn.putawayStartAt) return 'RECEIVED'
  if (['PUTAWAY', 'PUTTING_AWAY'].includes(asn.status) || asn.putawayStartAt) return 'PUTAWAY'
  if (asn.signedAt) return 'SIGNED'
  return 'RECEIVING'
}

function sumPieces(asn: AsnForMatrix) {
  return asn.asnLines.reduce((total, line) => total + (line.receivedQty || line.expectedQty), 0)
}

function sumVolume(asn: AsnForMatrix) {
  return asn.asnLines.reduce(
    (total, line) => total + (line.receivedQty || line.expectedQty) * decimalToNumber(line.sku?.volumeCbm),
    0
  )
}

function getTargetDate(asn: AsnForMatrix) {
  return asn.expectedPutawayDate || asn.createdAt
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
    const clientIds = [
      ...parseList(searchParams, 'clientIds'),
      ...(searchParams.get('clientId') ? [searchParams.get('clientId') as string] : []),
    ]
    const asnTypes = parseList(searchParams, 'asnTypes')
    const scope: DashboardScope = {
      tenantId: auth.user.tenantId,
      warehouseId: resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId')),
      clientIds: Array.from(new Set(clientIds)),
      asnTypes,
    }
    const dates = buildDateColumns(start, end)
    const asns = await fetchAsns(buildWhere(scope, range))
    const now = new Date()
    const emptyCell = () => ({ ic: 0, pcs: 0, cbm: 0, timeoutIc: 0, isTimeout: false })
    const matrix = new Map<string, Map<string, ReturnType<typeof emptyCell>>>()

    for (const row of ROWS) {
      matrix.set(row.status, new Map(dates.map((date) => [date, emptyCell()])))
    }

    for (const asn of asns) {
      const targetDate = getTargetDate(asn)
      const status = classifyStatus(asn)
      const date = format(targetDate, 'yyyy-MM-dd')
      const cell = matrix.get(status)?.get(date)
      if (!cell) continue

      const isTimeout = targetDate < now && asn.status !== 'COMPLETED'
      cell.ic += 1
      cell.pcs += sumPieces(asn)
      cell.cbm = Number((cell.cbm + sumVolume(asn)).toFixed(3))
      cell.timeoutIc += isTimeout ? 1 : 0
      cell.isTimeout = cell.timeoutIc > 0
    }

    const rows = ROWS.map((row) => {
      const cells = Object.fromEntries(matrix.get(row.status)?.entries() || [])
      const values = Object.values(cells)
      return {
        ...row,
        cells,
        total: {
          ic: values.reduce((total, cell) => total + cell.ic, 0),
          pcs: values.reduce((total, cell) => total + cell.pcs, 0),
          cbm: Number(values.reduce((total, cell) => total + cell.cbm, 0).toFixed(3)),
          timeoutIc: values.reduce((total, cell) => total + cell.timeoutIc, 0),
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        dates,
        rows,
        summary: {
          totalIc: rows.reduce((total, row) => total + row.total.ic, 0),
          totalPcs: rows.reduce((total, row) => total + row.total.pcs, 0),
          totalCbm: Number(rows.reduce((total, row) => total + row.total.cbm, 0).toFixed(3)),
          timeoutIc: rows.reduce((total, row) => total + row.total.timeoutIc, 0),
        },
        lastUpdatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Inbound timeout dashboard report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound timeout dashboard report' },
      { status: 500 }
    )
  }
})
