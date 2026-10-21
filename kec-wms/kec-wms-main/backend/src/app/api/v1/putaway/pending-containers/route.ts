import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

// 查询参数 Schema
const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(1000).optional().default(20),
  search: z.string().nullish(),
  asnNumber: z.string().nullish(),
  containerType: z.string().nullish(),
  warehouseId: z.string().nullish(),
  receivingMethod: z.enum(['SKU', 'CONTAINER']).nullish(),
})

// GET /api/v1/putaway/pending-containers - 获取待上架容器物品列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId
    const searchParams = request.nextUrl.searchParams

    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      search: searchParams.get('search') || undefined,
      asnNumber: searchParams.get('asnNumber') || undefined,
      containerType: searchParams.get('containerType') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      receivingMethod: searchParams.get('receivingMethod') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, asnNumber, containerType, warehouseId: requestedWarehouseId, receivingMethod } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    // 如果需要过滤收货方式，先获取符合条件的 ASN ID
    let asnIdsWithReceivingMethod: string[] | null = null
    if (receivingMethod) {
      const asns = await prisma.asn.findMany({
        where: {
          tenantId,
          receiving_method: receivingMethod,
        },
        select: { id: true },
      })
      asnIdsWithReceivingMethod = asns.map(a => a.id)
    }

    // 如果需要过滤 ASN 单号，获取符合条件的 ASN ID
    let asnIdsWithAsnNumber: string[] | null = null
    if (asnNumber) {
      const asns = await prisma.asn.findMany({
        where: {
          tenantId,
          asnNumber: { contains: asnNumber },
        },
        select: { id: true },
      })
      asnIdsWithAsnNumber = asns.map(a => a.id)
    }

    // 构建容器查询条件：已关箱且有未上架物品的容器
    const containerWhere: Record<string, unknown> = {
      tenantId,
      closedAt: { not: null }, // 已关箱
      usage: 'INBOUND', // 入库容器
    }

    if (containerType) {
      containerWhere.containerType = containerType
    }

    if (warehouseId) {
      containerWhere.warehouseId = warehouseId
    }

    // 过滤收货方式对应的 ASN（通过 containerItems 关联）
    if (asnIdsWithReceivingMethod !== null) {
      containerWhere.containerItems = {
        some: {
          asnId: { in: asnIdsWithReceivingMethod },
        },
      }
    }

    // 查询符合条件的容器
    const containers = await prisma.container.findMany({
      where: containerWhere,
      include: {
        warehouse: { select: { warehouseCode: true, warehouseName: true } },
      },
      orderBy: { closedAt: 'desc' },
    })

    const validContainerIds = containers.map(c => c.id)

    if (validContainerIds.length === 0) {
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

    // 构建容器物品查询条件：未关联上架单行的物品
    const itemWhere: Record<string, unknown> = {
      tenantId,
      containerId: { in: validContainerIds },
      putawayOrderLineId: null, // 只查询未关联上架单行的物品
      asn: {
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
    }

    // ASN 单号过滤
    if (asnIdsWithAsnNumber !== null) {
      itemWhere.asnId = { in: asnIdsWithAsnNumber }
    }

    // 搜索条件：支持容器号、SKU编码、SKU名称
    if (search) {
      const matchingContainers = containers.filter(c =>
        c.containerCode.toLowerCase().includes(search.toLowerCase())
      )
      const matchingContainerIds = matchingContainers.map(c => c.id)

      itemWhere.OR = [
        { containerId: { in: matchingContainerIds } },
        { skuCode: { contains: search } },
        { skuName: { contains: search } },
      ]
    }

    // 获取总数
    const total = await prisma.containerItem.count({ where: itemWhere })

    // 查询容器物品列表
    const items = await prisma.containerItem.findMany({
      where: itemWhere,
      include: {
        container: {
          include: {
            warehouse: { select: { warehouseCode: true, warehouseName: true } },
          },
        },
        asn: {
          include: {
            client: { select: { clientCode: true, clientName: true } },
          },
        },
        sku: {
          select: { barcode: true },
        },
      },
      orderBy: [
        { container: { closedAt: 'desc' } },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 获取收货人信息
    const receiverIds = [...new Set(items.map(i => i.receivedBy))]
    const receivers = await prisma.user.findMany({
      where: { id: { in: receiverIds } },
      select: { id: true, fullName: true },
    })
    const receiverMap = new Map(receivers.map(r => [r.id, r.fullName]))

    // 格式化返回数据
    const data = items.map(item => ({
      id: item.id,
      containerId: item.containerId,
      containerCode: item.container.containerCode,
      asnNumber: item.asn.asnNumber,
      skuCode: item.skuCode,
      skuName: item.skuName,
      barcode: item.sku?.barcode || null,
      warehouse: item.container.warehouse,
      client: item.asn.client,
      expiryDate: item.expiryDate,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      qualityType: item.qualityType,
      closedAt: item.container.closedAt,
      receivedBy: receiverMap.get(item.receivedBy) || '-',
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取待上架容器物品失败:', error)
    return NextResponse.json(
      { success: false, message: '获取待上架容器物品失败' },
      { status: 500 }
    )
  }
})
