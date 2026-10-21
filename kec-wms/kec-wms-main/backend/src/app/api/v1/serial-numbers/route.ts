import { authenticateRequest } from '@/lib/api/authenticate-request'
import { prismaRead } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const serialNumberQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).catch(20),
  serialNumber: z.string().nullish(),
  skuCode: z.string().nullish(),
  clientId: z.string().nullish(),
  status: z.string().nullish(),
  receivedAsnNumber: z.string().nullish(),
  shippedOrderNumber: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  sortBy: z.enum(['serialNumber', 'status', 'receivedAt', 'putawayAt', 'shippedAt', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

type SerialNumberSortBy = z.infer<typeof serialNumberQuerySchema>['sortBy']

function buildOrderBy(sortBy: SerialNumberSortBy, sortOrder: Prisma.SortOrder): Prisma.SerialNumberOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'serialNumber':
      return [{ serialNumber: sortOrder }, { createdAt: 'desc' }]
    case 'status':
      return [{ status: sortOrder }, { createdAt: 'desc' }]
    case 'receivedAt':
      return [{ receivedAt: sortOrder }, { createdAt: 'desc' }]
    case 'putawayAt':
      return [{ putawayAt: sortOrder }, { createdAt: 'desc' }]
    case 'shippedAt':
      return [{ shippedAt: sortOrder }, { createdAt: 'desc' }]
    case 'updatedAt':
      return [{ updatedAt: sortOrder }, { createdAt: 'desc' }]
    case 'createdAt':
    default:
      return [{ createdAt: sortOrder }, { id: 'asc' }]
  }
}

function toRecordMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

function emptyResponse(page: number, pageSize: number) {
  return NextResponse.json({
    success: true,
    data: [],
    pagination: {
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    },
  })
}

// GET /api/v1/serial-numbers - 序列号全局只读查询
export const GET = async (request: NextRequest) => {
  try {
    const authResult = await authenticateRequest(request, 'inventory:read')
    if (!authResult.success) {
      return authResult.response
    }

    const auth = authResult.auth
    const searchParams = request.nextUrl.searchParams
    const queryResult = serialNumberQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      serialNumber: searchParams.get('serialNumber'),
      skuCode: searchParams.get('skuCode'),
      clientId: searchParams.get('clientId'),
      status: searchParams.get('status'),
      receivedAsnNumber: searchParams.get('receivedAsnNumber'),
      shippedOrderNumber: searchParams.get('shippedOrderNumber'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const query = queryResult.data
    const where: Prisma.SerialNumberWhereInput = {
      tenantId: auth.tenantId,
    }

    const requestedClientId = query.clientId || undefined
    if (auth.clientId && requestedClientId && auth.clientId !== requestedClientId) {
      return NextResponse.json({ success: false, message: '无权访问该客户' }, { status: 403 })
    }

    if (auth.clientId) {
      where.clientId = auth.clientId
    } else if (requestedClientId) {
      where.clientId = requestedClientId
    }

    if (auth.warehouseId) {
      where.warehouseId = auth.warehouseId
    }

    if (query.serialNumber) {
      where.serialNumber = { contains: query.serialNumber.trim() }
    }

    if (query.skuCode) {
      where.sku = {
        skuCode: { contains: query.skuCode.trim() },
      }
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) where.createdAt.gte = new Date(query.startDate)
      if (query.endDate) where.createdAt.lte = new Date(query.endDate)
    }

    if (query.receivedAsnNumber) {
      const asns = await prismaRead.asn.findMany({
        where: {
          tenantId: auth.tenantId,
          asnNumber: { contains: query.receivedAsnNumber.trim() },
          ...(auth.warehouseId ? { warehouseId: auth.warehouseId } : {}),
          ...(auth.clientId ? { clientId: auth.clientId } : {}),
        },
        select: { id: true },
      })

      if (asns.length === 0) {
        return emptyResponse(query.page, query.pageSize)
      }

      where.receivedAsnId = { in: asns.map((asn) => asn.id) }
    }

    if (query.shippedOrderNumber) {
      const orders = await prismaRead.outboundOrder.findMany({
        where: {
          tenantId: auth.tenantId,
          orderNumber: { contains: query.shippedOrderNumber.trim() },
          ...(auth.warehouseId ? { warehouseId: auth.warehouseId } : {}),
          ...(auth.clientId ? { clientId: auth.clientId } : {}),
        },
        select: { id: true },
      })

      if (orders.length === 0) {
        return emptyResponse(query.page, query.pageSize)
      }

      where.shippedOrderId = { in: orders.map((order) => order.id) }
    }

    const total = await prismaRead.serialNumber.count({ where })
    const records = await prismaRead.serialNumber.findMany({
      where,
      select: {
        id: true,
        serialNumber: true,
        status: true,
        warehouseId: true,
        receivedAt: true,
        receivedAsnId: true,
        shippedAt: true,
        shippedOrderId: true,
        putawayOrderId: true,
        putawayAt: true,
        createdAt: true,
        updatedAt: true,
        sku: {
          select: {
            id: true,
            skuCode: true,
            skuName: true,
          },
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
      },
      orderBy: buildOrderBy(query.sortBy, query.sortOrder),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    })

    const warehouseIds = [...new Set(records.map((record) => record.warehouseId).filter((id): id is string => Boolean(id)))]
    const receivedAsnIds = [...new Set(records.map((record) => record.receivedAsnId).filter((id): id is string => Boolean(id)))]
    const shippedOrderIds = [...new Set(records.map((record) => record.shippedOrderId).filter((id): id is string => Boolean(id)))]

    const [warehouses, receivedAsns, shippedOrders] = await Promise.all([
      warehouseIds.length
        ? prismaRead.warehouse.findMany({
            where: { id: { in: warehouseIds }, tenantId: auth.tenantId },
            select: { id: true, warehouseCode: true, warehouseName: true },
          })
        : Promise.resolve([]),
      receivedAsnIds.length
        ? prismaRead.asn.findMany({
            where: { id: { in: receivedAsnIds }, tenantId: auth.tenantId },
            select: { id: true, asnNumber: true },
          })
        : Promise.resolve([]),
      shippedOrderIds.length
        ? prismaRead.outboundOrder.findMany({
            where: { id: { in: shippedOrderIds }, tenantId: auth.tenantId },
            select: { id: true, orderNumber: true },
          })
        : Promise.resolve([]),
    ])

    const warehouseMap = toRecordMap(warehouses)
    const receivedAsnMap = toRecordMap(receivedAsns)
    const shippedOrderMap = toRecordMap(shippedOrders)

    return NextResponse.json({
      success: true,
      data: records.map((record) => ({
        id: record.id,
        serialNumber: record.serialNumber,
        status: record.status,
        sku: record.sku,
        client: record.client,
        warehouse: record.warehouseId ? warehouseMap.get(record.warehouseId) || null : null,
        receivedAsn: record.receivedAsnId ? receivedAsnMap.get(record.receivedAsnId) || null : null,
        shippedOrder: record.shippedOrderId ? shippedOrderMap.get(record.shippedOrderId) || null : null,
        putawayOrderId: record.putawayOrderId,
        receivedAt: record.receivedAt,
        putawayAt: record.putawayAt,
        shippedAt: record.shippedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
  } catch (error) {
    console.error('获取序列号列表失败:', error)
    return NextResponse.json({ success: false, message: '获取序列号列表失败' }, { status: 500 })
  }
}
