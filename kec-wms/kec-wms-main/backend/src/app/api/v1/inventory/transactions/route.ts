import { authenticateRequest } from '@/lib/api/authenticate-request'
import { prismaRead } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

// 查询参数验证
const eventQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).catch(20),
  warehouseId: z.string().nullish(),
  warehouseCode: z.string().nullish(),
  clientId: z.string().nullish(),
  clientCode: z.string().nullish(),
  locationId: z.string().nullish(),
  locationCode: z.string().nullish(),
  locationCodes: z.string().nullish(), // 支持多个货位编码，逗号分隔
  skuId: z.string().nullish(),
  skuCode: z.string().nullish(),
  asnNumber: z.string().nullish(),
  eventType: z.string().nullish(),
  bucketType: z.string().nullish(),
  referenceType: z.string().nullish(),
  referenceId: z.string().nullish(),
  referenceNumber: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  sortBy: z.enum(['createdAt', 'eventNumber', 'quantityDelta']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// GET /api/v1/inventory/transactions - 库存事件历史查询（事件溯源版本）
export const GET = async (request: NextRequest) => {
  try {
    const authResult = await authenticateRequest(request, 'inventory:read')
    if (!authResult.success) {
      return authResult.response
    }

    const auth = authResult.auth
    const searchParams = request.nextUrl.searchParams
    const queryResult = eventQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      warehouseCode: searchParams.get('warehouseCode'),
      clientId: searchParams.get('clientId') || searchParams.get('customerId'),
      clientCode: searchParams.get('clientCode'),
      locationId: searchParams.get('locationId'),
      locationCode: searchParams.get('locationCode'),
      locationCodes: searchParams.get('locationCodes'),
      skuId: searchParams.get('skuId'),
      skuCode: searchParams.get('skuCode'),
      asnNumber: searchParams.get('asnNumber'),
      eventType: searchParams.get('eventType') || searchParams.get('transactionType'),
      bucketType: searchParams.get('bucketType'),
      referenceType: searchParams.get('referenceType'),
      referenceId: searchParams.get('referenceId'),
      referenceNumber: searchParams.get('referenceNumber'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    })

    if (!queryResult.success) {
      console.error('参数验证失败:', JSON.stringify(queryResult.error.errors, null, 2))
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const query = queryResult.data
    let warehouseId = query.warehouseId || auth.warehouseId
    let clientId = query.clientId || auth.clientId

    if (query.warehouseCode) {
      const warehouse = await prismaRead.warehouse.findFirst({
        where: { tenantId: auth.tenantId, warehouseCode: query.warehouseCode },
        select: { id: true },
      })
      if (!warehouse) {
        return NextResponse.json({ success: false, message: 'warehouseCode 不存在' }, { status: 400 })
      }
      if (query.warehouseId && query.warehouseId !== warehouse.id) {
        return NextResponse.json({ success: false, message: 'warehouseId 与 warehouseCode 不一致' }, { status: 400 })
      }
      warehouseId = warehouse.id
    }

    if (auth.warehouseId && warehouseId && auth.warehouseId !== warehouseId) {
      return NextResponse.json({ success: false, message: '无权访问该仓库' }, { status: 403 })
    }

    if (query.clientCode) {
      const client = await prismaRead.client.findFirst({
        where: { tenantId: auth.tenantId, clientCode: query.clientCode },
        select: { id: true },
      })
      if (!client) {
        return NextResponse.json({ success: false, message: 'clientCode 不存在' }, { status: 400 })
      }
      if (query.clientId && query.clientId !== client.id) {
        return NextResponse.json({ success: false, message: 'clientId 与 clientCode 不一致' }, { status: 400 })
      }
      clientId = client.id
    }

    if (auth.clientId && clientId && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, message: '无权访问该客户' }, { status: 403 })
    }

    const locationWhere: Prisma.BinLocationWhereInput = {}
    if (query.locationCode) {
      locationWhere.locationCode = query.locationCode
    }

    // 构建查询条件
    const where: Prisma.InventoryEventWhereInput = {
      tenantId: auth.tenantId,
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (clientId) where.clientId = clientId
    if (query.locationId) where.locationId = query.locationId

    // 支持多个货位编码筛选
    if (query.locationCodes) {
      const codes = query.locationCodes.split(/[,，\s]+/).map(c => c.trim()).filter(Boolean)
      if (codes.length > 0) {
        locationWhere.locationCode = { in: codes }
      }
    }
    if (Object.keys(locationWhere).length > 0) where.location = locationWhere

    if (query.skuId) where.skuId = query.skuId
    if (query.skuCode) where.skuCode = { contains: query.skuCode }
    if (query.asnNumber) where.asnNumber = { contains: query.asnNumber }
    if (query.eventType) where.eventType = query.eventType
    if (query.bucketType) where.bucketType = query.bucketType
    if (query.referenceType) where.referenceType = query.referenceType
    if (query.referenceId) where.referenceId = query.referenceId
    if (query.referenceNumber) where.referenceNumber = { contains: query.referenceNumber }

    // 日期范围筛选
    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) where.createdAt.gte = new Date(query.startDate)
      if (query.endDate) where.createdAt.lte = new Date(query.endDate)
    }

    // 查询总数
    const total = await prismaRead.inventoryEvent.count({ where })

    // 查询列表
    const events = await prismaRead.inventoryEvent.findMany({
      where,
      include: {
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        location: { select: { id: true, locationCode: true } },
        sku: { select: { id: true, skuCode: true, skuName: true } },
        client: { select: { id: true, clientCode: true, clientName: true } },
      },
      orderBy: [
        { [query.sortBy]: query.sortOrder },
        ...(query.sortBy === 'eventNumber' ? [{ createdAt: query.sortOrder }] : [{ eventNumber: query.sortOrder }]),
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    })

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
  } catch (error) {
    console.error('获取库存事件失败:', error)
    return NextResponse.json({ success: false, message: '获取库存事件失败' }, { status: 500 })
  }
}
