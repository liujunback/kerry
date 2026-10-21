import { authenticateRequest } from '@/lib/api/authenticate-request'
import { prismaRead } from '@/lib/db/prisma'
import { DEFAULT_TIMEZONE } from '@/lib/config/timezone'
import { BucketType } from '@/lib/services/inventory-event-service'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'
import { z,ZodIssue } from 'zod'

type DateLike = Date | string | null | undefined
type DateParts = { year: number; month: number; day: number }

// 定义汇总数据的关联类型
type InventorySummaryRelations = {
  warehouse: { id: string; warehouseCode: string; warehouseName: string } | null
  location: { id: string; locationCode: string; locationType: string | null } | null
  zone: { id: string; zoneCode: string; zoneName: string | null } | null
  sku: { id: string; skuCode: string; skuName: string; barcode: string | null } | null
  client: { id: string; clientCode: string; clientName: string } | null
}

// 查询参数验证
const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
  warehouseId: z.string().optional(),
  warehouseCode: z.string().optional(),
  zoneId: z.string().optional(),
  locationId: z.string().optional(),
  locationCode: z.string().optional(),
  locationCodes: z.string().optional(), // 支持多个货位编码，逗号分隔
  skuId: z.string().optional(),
  skuCode: z.string().optional(),
  clientId: z.string().optional(),
  clientCode: z.string().optional(),
  batchNumber: z.string().optional(),
  batchNo: z.string().optional(),
  lpn: z.string().optional(),
  asnNumber: z.string().optional(),
  lockStatus: z.string().optional(),
  bucketType: z.string().optional(), // 指定桶类型时返回原始桶数据而不汇总
  search: z.string().optional(),
  sortBy: z.enum(['skuCode', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const MS_PER_DAY = 24 * 60 * 60 * 1000
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function getDateParts(value: DateLike): DateParts | null {
  if (!value) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const parts = Object.fromEntries(
      dateKeyFormatter.formatToParts(value).map((part) => [part.type, part.value])
    )
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    }
  }

  const dateText = value.trim()
  const localDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateText)
  if (localDateMatch) {
    return {
      year: Number(localDateMatch[1]),
      month: Number(localDateMatch[2]),
      day: Number(localDateMatch[3]),
    }
  }

  const parsed = new Date(dateText)
  return Number.isNaN(parsed.getTime()) ? null : getDateParts(parsed)
}

function calculateAgeDays(fifoDate: DateLike) {
  const baseDate = getDateParts(fifoDate)
  const today = getDateParts(new Date())
  if (!baseDate || !today) return null

  const baseDay = Date.UTC(baseDate.year, baseDate.month - 1, baseDate.day)
  const currentDay = Date.UTC(today.year, today.month - 1, today.day)
  return Math.max(0, Math.floor((currentDay - baseDay) / MS_PER_DAY))
}

// GET /api/v1/inventory - 库存明细查询（按库位汇总）
export const GET = async (request: NextRequest) => {
  try {
    const authResult = await authenticateRequest(request, 'inventory:read')
    if (!authResult.success) {
      return authResult.response
    }

    const auth = authResult.auth
    const searchParams = request.nextUrl.searchParams
    const queryResult = inventoryQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      warehouseCode: searchParams.get('warehouseCode') || undefined,
      zoneId: searchParams.get('zoneId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      locationCode: searchParams.get('locationCode') || undefined,
      locationCodes: searchParams.get('locationCodes') || undefined,
      skuId: searchParams.get('skuId') || undefined,
      skuCode: searchParams.get('skuCode') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      clientCode: searchParams.get('clientCode') || undefined,
      batchNumber: searchParams.get('batchNumber') || undefined,
      batchNo: searchParams.get('batchNo') || undefined,
      lpn: searchParams.get('lpn') || undefined,
      asnNumber: searchParams.get('asnNumber') || undefined,
      lockStatus: searchParams.get('lockStatus') || undefined,
      bucketType: searchParams.get('bucketType') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    })

    if (!queryResult.success) {
      console.error('库存列表参数验证失败:', {
        params: Object.fromEntries(searchParams.entries()),
        errors: queryResult.error.errors,
      })
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          errors: queryResult.error.errors.map((err: ZodIssue) => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.code === 'invalid_type' ? err.received : undefined,
          }))
        },
        { status: 400 }
      )
    }

    const query = queryResult.data
    const requestedBatchNumber = query.batchNumber || query.batchNo
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
    const where: Prisma.InventoryBucketWhereInput = {
      tenantId: auth.tenantId,
      quantity: { gt: 0 },
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (query.zoneId) where.zoneId = query.zoneId
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
    if (clientId) where.clientId = clientId
    // 当指定 bucketType 时使用精确匹配，否则使用模糊匹配
    if (requestedBatchNumber) {
      where.batchNumber = query.bucketType ? requestedBatchNumber : { contains: requestedBatchNumber }
    }
    if (query.lpn) where.lpn = query.bucketType ? query.lpn : { contains: query.lpn }
    if (query.asnNumber) where.asnNumber = query.bucketType ? query.asnNumber : { contains: query.asnNumber }
    if (query.bucketType) where.bucketType = query.bucketType

    if (query.search) {
      where.OR = [
        { skuCode: { contains: query.search } },
        { batchNumber: { contains: query.search } },
        { lpn: { contains: query.search } },
      ]
    }

    // 查询所有桶数据
    const buckets = await prismaRead.inventoryBucket.findMany({
      where,
      include: {
        warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
        location: { select: { id: true, locationCode: true, locationType: true } },
        zone: { select: { id: true, zoneCode: true, zoneName: true } },
        sku: { select: { id: true, skuCode: true, skuName: true, barcode: true } },
        client: { select: { id: true, clientCode: true, clientName: true } },
      },
    })

    // 如果指定了 bucketType，直接返回桶数据而不汇总
    if (query.bucketType) {
      // 排序
      const sortedBuckets = buckets.sort((a, b) => {
        if (query.sortBy === 'skuCode') {
          return query.sortOrder === 'asc'
            ? a.skuCode.localeCompare(b.skuCode)
            : b.skuCode.localeCompare(a.skuCode)
        } else {
          return query.sortOrder === 'asc'
            ? a.updatedAt.getTime() - b.updatedAt.getTime()
            : b.updatedAt.getTime() - a.updatedAt.getTime()
        }
      })

      const total = sortedBuckets.length

      // 分页
      const paginatedData = sortedBuckets.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize
      )

      // 转换 BigInt 字段为字符串以支持 JSON 序列化
      const serializedData = paginatedData.map(bucket => ({
        ...bucket,
        version: bucket.version.toString(),
        ageDays: calculateAgeDays(bucket.fifoDate),
      }))

      return NextResponse.json({
        success: true,
        data: serializedData,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      })
    }

    // 按库位汇总（warehouseId + locationId + skuId + batchNumber + lpn + expiryDate + asnNumber）
    const summaryMap = new Map<string, {
      id: string
      warehouseId: string
      locationId: string
      zoneId: string
      skuId: string
      skuCode: string
      batchNumber: string
      lpn: string
      asnNumber: string
      clientId: string | null
      quantityAvailable: number
      quantityAllocated: number
      quantityPicking: number
      quantityFrozen: number
      quantityDefective: number
      quantityException: number
      quantityQcHold: number
      quantityCountHold: number
      quantityCountSurplus: number
      quantityCountShortage: number
      expiryDate: Date | null
      fifoDate: DateLike
      ageDays: number | null
      updatedAt: Date
      lockStatus: string
      _count: { serialNumbers: number }
    } & InventorySummaryRelations>()

    for (const bucket of buckets) {
      // 效期格式化为日期字符串，null 值用空字符串表示
      // expiryDate 可能是 Date 对象或被 timezone-extension 转换后的字符串
      let expiryKey = ''
      if (bucket.expiryDate) {
        if (bucket.expiryDate instanceof Date) {
          expiryKey = bucket.expiryDate.toISOString().split('T')[0]
        } else {
          // 字符串格式如 "2024-12-31 00:00:00"，取前 10 位
          expiryKey = String(bucket.expiryDate).substring(0, 10)
        }
      }
      const key = `${bucket.warehouseId}:${bucket.locationId}:${bucket.skuId}:${bucket.batchNumber}:${bucket.lpn}:${expiryKey}:${bucket.asnNumber || ''}`
      let summary = summaryMap.get(key)

      if (!summary) {
        summary = {
          id: bucket.id,
          warehouseId: bucket.warehouseId,
          locationId: bucket.locationId,
          zoneId: bucket.zoneId,
          skuId: bucket.skuId,
          skuCode: bucket.skuCode,
          batchNumber: bucket.batchNumber,
          lpn: bucket.lpn,
          asnNumber: bucket.asnNumber,
          clientId: bucket.clientId,
          quantityAvailable: 0,
          quantityAllocated: 0,
          quantityPicking: 0,
          quantityFrozen: 0,
          quantityDefective: 0,
          quantityException: 0,
          quantityQcHold: 0,
          quantityCountHold: 0,
          quantityCountSurplus: 0,
          quantityCountShortage: 0,
          expiryDate: bucket.expiryDate,
          fifoDate: bucket.fifoDate,
          ageDays: calculateAgeDays(bucket.fifoDate),
          updatedAt: bucket.updatedAt,
          warehouse: bucket.warehouse,
          location: bucket.location,
          zone: bucket.zone,
          sku: bucket.sku,
          client: bucket.client,
          lockStatus: 'UNLOCKED',
          _count: { serialNumbers: 0 },
        }
        summaryMap.set(key, summary)
      }

      // 汇总各桶类型的数量
      switch (bucket.bucketType) {
        case BucketType.AVAILABLE:
          summary.quantityAvailable += bucket.quantity
          break
        case BucketType.ALLOCATED:
          summary.quantityAllocated += bucket.quantity
          break
        case BucketType.PICKING:
          summary.quantityPicking += bucket.quantity
          break
        case BucketType.FROZEN:
          summary.quantityFrozen += bucket.quantity
          summary.lockStatus = 'LOCKED'
          break
        case BucketType.DEFECTIVE:
          summary.quantityDefective += bucket.quantity
          break
        case BucketType.EXCEPTION:
          summary.quantityException += bucket.quantity
          break
        case BucketType.QC_HOLD:
          summary.quantityQcHold += bucket.quantity
          summary.lockStatus = 'LOCKED'
          break
        case BucketType.COUNT_HOLD:
          summary.quantityCountHold += bucket.quantity
          summary.lockStatus = 'LOCKED'
          break
        case BucketType.COUNT_SURPLUS:
          summary.quantityCountSurplus += bucket.quantity
          break
        case BucketType.COUNT_SHORTAGE:
          summary.quantityCountShortage += bucket.quantity
          break
      }

      // 更新最新的时间戳
      if (bucket.updatedAt > summary.updatedAt) {
        summary.updatedAt = bucket.updatedAt
      }
    }

    // 转换为数组并应用筛选
    let summaries = Array.from(summaryMap.values())

    // 应用 lockStatus 筛选
    if (query.lockStatus && query.lockStatus !== 'all') {
      summaries = summaries.filter(s => s.lockStatus === query.lockStatus)
    }

    // 排序
    summaries.sort((a, b) => {
      if (query.sortBy === 'skuCode') {
        return query.sortOrder === 'asc'
          ? a.skuCode.localeCompare(b.skuCode)
          : b.skuCode.localeCompare(a.skuCode)
      } else {
        // updatedAt 可能是 Date 对象或字符串（被 timezone-extension 转换）
        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt as string).getTime()
        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt as string).getTime()
        return query.sortOrder === 'asc' ? aTime - bTime : bTime - aTime
      }
    })

    const total = summaries.length

    // 分页
    const paginatedData = summaries.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize
    )

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
  } catch (error) {
    console.error('获取库存列表失败:', error)
    return NextResponse.json({ success: false, message: '获取库存列表失败' }, { status: 500 })
  }
}
