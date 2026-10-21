import { createHandler } from '@/lib/api/create-handler'
import { requireAuth } from '@/lib/auth/middleware'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20),
  search: z.string().nullish(),
  asnNumber: z.string().nullish(),
  status: z.string().nullish(),
  putawayMode: z.string().nullish(),
  clientId: z.string().nullish(),
  warehouseId: z.string().nullish(),
  dateFrom: z.string().nullish(),
  dateTo: z.string().nullish(),
})

function parseSearchTerms(value?: string | null) {
  return (value || '')
    .split(/[\n,\uFF0C;\uFF1B\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBoundaryDateTime(value: string, boundary: 'start' | 'end') {
  if (!value) return undefined

  let normalizedValue = value

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    normalizedValue = boundary === 'end' ? `${value}T23:59:59.999` : `${value}T00:00:00.000`
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    normalizedValue = boundary === 'end' ? `${value}:59.999` : `${value}:00.000`
  }

  const parsed = new Date(normalizedValue)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed
}

// GET /api/v1/putaway/orders/list
export const GET = createHandler(async (request) => {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const tenantId = authResult.user.tenantId
  const { searchParams } = new URL(request.url)

  const parseResult = querySchema.safeParse({
    page: searchParams.get('page') || undefined,
    pageSize: searchParams.get('pageSize') || undefined,
    search: searchParams.get('search'),
    asnNumber: searchParams.get('asnNumber'),
    status: searchParams.get('status'),
    putawayMode: searchParams.get('putawayMode'),
    clientId: searchParams.get('clientId'),
    warehouseId: searchParams.get('warehouseId'),
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: parseResult.error.errors },
      { status: 400 }
    )
  }

  const {
    page,
    pageSize,
    search,
    asnNumber,
    status,
    putawayMode,
    clientId,
    warehouseId: requestedWarehouseId,
    dateFrom,
    dateTo,
  } = parseResult.data
  const warehouseId = resolveScopedWarehouseId(authResult.user, requestedWarehouseId)

  const where: Prisma.PutawayOrderWhereInput = { tenantId }

  const searchTerms = parseSearchTerms(search)
  if (searchTerms.length === 1) {
    where.OR = [
      { putawayOrderNumber: { contains: searchTerms[0] } },
      { asn: { is: { asnNumber: { contains: searchTerms[0] } } } },
    ]
  } else if (searchTerms.length > 1) {
    where.OR = [
      { putawayOrderNumber: { in: searchTerms } },
      { asn: { is: { asnNumber: { in: searchTerms } } } },
    ]
  }

  const asnNumbers = parseSearchTerms(asnNumber)
  if (asnNumbers.length === 1) {
    where.asn = { is: { asnNumber: { contains: asnNumbers[0] } } }
  } else if (asnNumbers.length > 1) {
    where.asn = { is: { asnNumber: { in: asnNumbers } } }
  }

  if (status) {
    where.status = status
  }

  if (putawayMode) {
    where.putawayMode = putawayMode
  }

  if (clientId) {
    where.clientId = clientId
  }

  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  if (dateFrom || dateTo) {
    const createdAt: Prisma.DateTimeFilter = {}

    if (dateFrom) {
      const startDate = parseBoundaryDateTime(dateFrom, 'start')
      if (startDate) {
        createdAt.gte = startDate
      }
    }

    if (dateTo) {
      const endDate = parseBoundaryDateTime(dateTo, 'end')
      if (endDate) {
        createdAt.lte = endDate
      }
    }

    where.createdAt = createdAt
  }

  const total = await prisma.putawayOrder.count({ where })

  const orders = await prisma.putawayOrder.findMany({
    where,
    include: {
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
      client: {
        select: {
          clientCode: true,
          clientName: true,
        },
      },
      asn: {
        select: {
          asnNumber: true,
        },
      },
      _count: {
        select: {
          lines: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
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
})
