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
  warehouseId: z.string().nullish(),
  clientId: z.string().nullish(),
  receivingMethod: z.enum(['SKU', 'CONTAINER']).nullish(),
})

const BATCH_SPLIT_REGEX = /[\s,\uFF0C;\uFF1B]+/

function parseBatchValues(value?: string | null) {
  if (!value) return []
  return value
    .split(BATCH_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean)
}

// GET /api/v1/putaway/pending-lines - 获取待上架收货记录列表（按 ASN Line 汇总显示）
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId
    const searchParams = request.nextUrl.searchParams

    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      search: searchParams.get('search') || undefined,
      asnNumber: searchParams.get('asnNumber') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      receivingMethod: searchParams.get('receivingMethod') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, asnNumber, warehouseId: requestedWarehouseId, clientId, receivingMethod } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    // 构建查询条件 - 查询未分配到上架单的收货记录
    const where: Record<string, unknown> = {
      tenantId,
      isPutawayAllocated: false,  // 只查询未创建上架单的收货记录
      status: 'COMPLETED',  // 只查询已完成的收货记录
      asn: {
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
    }

    // 过滤收货方式
    if (receivingMethod) {
      where.receivingMode = receivingMethod
    }

    // ASN 单号搜索
    if (asnNumber) {
      const asnNumbers = parseBatchValues(asnNumber)
      where.asn = {
        ...(where.asn as Record<string, unknown>),
        ...(asnNumbers.length > 1
          ? { asnNumber: { in: asnNumbers } }
          : { asnNumber: { contains: asnNumber } }),
      }
    }

    // 搜索条件
    if (search) {
      const skuValues = parseBatchValues(search)
      where.OR = skuValues.length > 1
        ? [{ skuCode: { in: skuValues } }]
        : [
            { skuCode: { contains: search } },
            { skuName: { contains: search } },
          ]
    }

    // 过滤仓库
    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    // 过滤客户
    if (clientId) {
      where.clientId = clientId
    }

    // 查询收货记录
    const receivingRecords = await prisma.receivingRecord.findMany({
      where,
      include: {
        asn: {
          include: {
            warehouse: true,
            client: true,
          },
        },
        asnLine: true,
        sku: true,
      },
      orderBy: { receivedAt: 'desc' },
    })

    type ReceivingRecordGroup = {
      asnLineId: string
      asnLine: (typeof receivingRecords)[number]['asnLine']
      asn: (typeof receivingRecords)[number]['asn']
      sku: (typeof receivingRecords)[number]['sku']
      records: typeof receivingRecords
      totalGoodQty: number
      totalDamagedQty: number
      totalQty: number
      batchNumbers: Set<string>
      expiryDates: Set<string>
      receivedAt: Date | null
      receivedBy: string
    }

    // 按 ASN Line 汇总显示
    // 动态计算该 ASN Line 下所有未分配收货记录的良品和次品总数
    const lineMap = new Map<string, ReceivingRecordGroup>()

    for (const record of receivingRecords) {
      // 按 ASN Line 分组
      const key = record.asnLineId || record.id

      if (!lineMap.has(key)) {
        lineMap.set(key, {
          asnLineId: record.asnLineId || '',
          asnLine: record.asnLine,
          asn: record.asn,
          sku: record.sku,
          records: [],
          totalGoodQty: 0,
          totalDamagedQty: 0,
          totalQty: 0,
          batchNumbers: new Set(),
          expiryDates: new Set(),
          receivedAt: record.receivedAt,
          receivedBy: record.receivedBy,
        })
      }

      const group = lineMap.get(key)!
      group.records.push(record)
      group.totalGoodQty += record.goodQty
      group.totalDamagedQty += record.damagedQty
      group.totalQty += record.receivedQty

      // 收集批次号和有效期信息
      if (record.batchNumber) {
        group.batchNumbers.add(record.batchNumber)
      }
      if (record.expiryDate) {
        group.expiryDates.add(new Date(record.expiryDate).toISOString())
      }
    }

    // 转换为数组并分页
    const allLines = Array.from(lineMap.values())
    const total = allLines.length
    const skip = (page - 1) * pageSize
    const paginatedLines = allLines.slice(skip, skip + pageSize)

    // 获取收货人信息
    const receiverIds = [...new Set(paginatedLines.map(line => line.receivedBy).filter(Boolean))]
    const receivers = receiverIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: receiverIds } },
          select: { id: true, fullName: true },
        })
      : []
    const receiverMap = new Map(receivers.map(r => [r.id, r.fullName]))

    // 格式化返回数据
    const data = paginatedLines.map(line => {
      // 处理批次号：如果只有一个批次，显示批次号；如果多个批次，显示"多批次"
      const batchNumbersArray = Array.from(line.batchNumbers)
      const batchNumber = batchNumbersArray.length === 1 ? batchNumbersArray[0] :
                         batchNumbersArray.length > 1 ? '多批次' : null

      // 处理有效期：如果只有一个有效期，显示；如果多个，显示第一个
      const expiryDatesArray = Array.from(line.expiryDates)
      const expiryDate = expiryDatesArray.length > 0 ? new Date(expiryDatesArray[0]) : null

      return {
        id: line.asnLineId || line.records[0].id,
        lineNumber: line.asnLine?.lineNumber || 0,
        skuCode: line.records[0].skuCode,
        skuName: line.records[0].skuName,
        status: line.asnLine?.status || 'RECEIVED',
        receivedQty: line.totalQty,
        putawayQty: 0,
        pendingQty: line.totalQty,
        pendingGoodQty: line.totalGoodQty,
        pendingDamagedQty: line.totalDamagedQty,
        totalGoodQty: line.totalGoodQty,
        totalDamagedQty: line.totalDamagedQty,
        batchNumber,
        expiryDate,
        receivedAt: line.receivedAt,
        receivedByName: receiverMap.get(line.receivedBy) || null,
        asn: {
          id: line.asn.id,
          asnNumber: line.asn.asnNumber,
          warehouse: line.asn.warehouse,
          client: line.asn.client,
        },
        sku: line.sku,
      }
    })

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
    console.error('获取待上架收货记录失败:', error)
    return NextResponse.json(
      { success: false, message: '获取待上架收货记录失败' },
      { status: 500 }
    )
  }
})
