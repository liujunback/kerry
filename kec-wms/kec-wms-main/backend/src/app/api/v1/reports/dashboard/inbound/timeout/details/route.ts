import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { format } from '@/lib/utils/date-formatter'

const REPORT_PERMISSION = 'report:read'

type AsnForDetails = Awaited<ReturnType<typeof fetchAsns>>[number]

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

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function buildWhere(
  tenantId: string,
  warehouseId: string | undefined,
  searchParams: URLSearchParams
): Prisma.AsnWhereInput {
  const clientId = searchParams.get('clientId') || undefined
  const asnType = searchParams.get('asnType') || undefined

  return {
    tenantId,
    ...(warehouseId ? { warehouseId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(asnType ? { asnType } : {}),
    status: { notIn: ['CREATED', 'COMPLETED', 'CANCELLED'] },
  }
}

async function fetchAsns(where: Prisma.AsnWhereInput) {
  return prismaRead.asn.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 2000,
    select: {
      id: true,
      asnNumber: true,
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
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: { warehouseName: true } },
    },
  })
}

function classifyStatus(asn: AsnForDetails) {
  if (asn.signedAt && !asn.receivingStartAt && !asn.putawayStartAt) return 'SIGNED'
  if (asn.status === 'RECEIVING' || (asn.receivingStartAt && !asn.receivingEndAt)) return 'RECEIVING'
  if (asn.receivingEndAt && !asn.putawayStartAt) return 'RECEIVED'
  if (['PUTAWAY', 'PUTTING_AWAY'].includes(asn.status) || asn.putawayStartAt) return 'PUTAWAY'
  if (asn.signedAt) return 'SIGNED'
  return 'RECEIVING'
}

function getTargetDate(asn: AsnForDetails) {
  return normalizeDate(asn.expectedPutawayDate) || normalizeDate(asn.createdAt)
}

function formatDuration(ms: number) {
  if (ms <= 0) return '-'
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return days > 0 ? `${days}天${restHours}小时` : `${restHours}小时`
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, REPORT_PERMISSION)
  if (permissionResponse) return permissionResponse

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const status = searchParams.get('status') || ''
    const date = searchParams.get('date') || ''
    const page = parsePositiveInt(searchParams.get('page'), 1, 10000)
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100)
    const now = new Date()
    const timeoutOnly = searchParams.get('isTimeout') === 'true'
    const where = buildWhere(auth.user.tenantId, warehouseId, searchParams)
    const asns = await fetchAsns(where)
    const filtered = asns.filter((asn) => {
      const targetDate = getTargetDate(asn)
      if (!targetDate) return false
      const dateMatched = date ? format(targetDate, 'yyyy-MM-dd') === date : true
      const statusMatched = status ? classifyStatus(asn) === status : true
      const isTimeout = targetDate < now && asn.status !== 'COMPLETED'
      return dateMatched && statusMatched && (!timeoutOnly || isTimeout)
    })
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize).map((asn) => {
      const targetDate = getTargetDate(asn)
      if (!targetDate) return null
      const timeoutMs = now.getTime() - targetDate.getTime()
      return {
        id: asn.id,
        asnNumber: asn.asnNumber,
        clientCode: asn.client?.clientCode || '',
        clientName: asn.client?.clientName || '',
        warehouseName: asn.warehouse?.warehouseName || '',
        expectedQty: asn.totalExpectedQty,
        receivedQty: asn.totalReceivedQty,
        putawayQty: asn.totalPutawayQty,
        expectedPutawayDate: targetDate,
        status: asn.status,
        statusGroup: classifyStatus(asn),
        isTimeout: timeoutMs > 0 && asn.status !== 'COMPLETED',
        timeoutHours: timeoutMs > 0 ? Number((timeoutMs / (60 * 60 * 1000)).toFixed(1)) : 0,
        timeoutText: formatDuration(timeoutMs),
      }
    }).filter((item): item is NonNullable<typeof item> => Boolean(item))

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
    console.error('Inbound timeout dashboard details error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inbound timeout dashboard details',
        ...(process.env.NODE_ENV !== 'production'
          ? { detail: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { status: 500 }
    )
  }
})
