import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import {
acquireLock,
getOrderCreationLockKey,
getReferenceNumberLockKey,
LockAcquisitionError,
withLock,
} from '@/lib/db/distributed-lock'
import { prisma } from '@/lib/db/prisma'
import type { ApiLogContext } from '@/lib/logger'
import { Log,withExternalApiLog } from '@/lib/logger'
import { queueInventoryAllocationWithRetry } from '@/lib/services/inventory-allocation-service'
import { buildOrderInterceptionSummary } from '@/lib/services/order-interception-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { shippingLabelStorage } from '@/lib/services/shipping-label-storage'
import { generateOutboundOrderNumber } from '@/lib/utils/number-generator'
import { createOutboundOrderSchema,outboundOrderListQuerySchema } from '@/lib/validations/outbound'
import { externalCreateOrderSchema,type ExternalCreateOrderInput } from '@/lib/validations/outbound-external'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'

function buildDateRange(from?: string | Date, to?: string | Date) {
  const dateRange: Record<string, Date> = {}

  if (from) {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    dateRange.gte = start
  }

  if (to) {
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    dateRange.lte = end
  }

  return dateRange
}

const EXTERNAL_MASTER_CACHE_TTL_MS = Math.max(
  1000,
  parseInt(process.env.EXTERNAL_MASTER_CACHE_TTL_MS || '60000', 10)
)
const EXTERNAL_MASTER_CACHE_MAX_ITEMS = Math.max(
  1000,
  parseInt(process.env.EXTERNAL_MASTER_CACHE_MAX_ITEMS || '10000', 10)
)

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type ExternalSkuLite = {
  id: string
  skuCode: string
  skuName: string
  unit: string
  isSerialManaged: boolean
}

const externalClientIdCache = new Map<string, CacheEntry<string>>()
const externalWarehouseCache = new Map<string, CacheEntry<{ id: string; warehouseCode: string }>>()
const externalSkuCache = new Map<string, CacheEntry<ExternalSkuLite>>()

function getCacheValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const now = Date.now()
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= now) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function setCacheValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  const now = Date.now()
  cache.set(key, { value, expiresAt: now + EXTERNAL_MASTER_CACHE_TTL_MS })
  if (cache.size > EXTERNAL_MASTER_CACHE_MAX_ITEMS) {
    cache.clear()
  }
}

function buildClientIdCacheKey(tenantId: string, clientCode: string): string {
  return `${tenantId}:${clientCode}`
}

function buildWarehouseCacheKey(tenantId: string, warehouseCode: string): string {
  return `${tenantId}:${warehouseCode}`
}

function buildSkuCacheKey(tenantId: string, clientId: string, skuCode: string): string {
  return `${tenantId}:${clientId}:${skuCode}`
}

async function resolveClientIdWithCache(
  tenantId: string,
  clientCode: string
): Promise<string | null> {
  const cacheKey = buildClientIdCacheKey(tenantId, clientCode)
  const cached = getCacheValue(externalClientIdCache, cacheKey)
  if (cached) {
    return cached
  }

  const client = await prisma.client.findFirst({
    where: { tenantId, clientCode },
    select: { id: true },
  })

  if (!client) return null
  setCacheValue(externalClientIdCache, cacheKey, client.id)
  return client.id
}

async function resolveWarehouseWithCache(
  tenantId: string,
  warehouseCode: string
): Promise<{ id: string; warehouseCode: string } | null> {
  const cacheKey = buildWarehouseCacheKey(tenantId, warehouseCode)
  const cached = getCacheValue(externalWarehouseCache, cacheKey)
  if (cached) {
    return cached
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { tenantId, warehouseCode },
    select: { id: true, warehouseCode: true },
  })

  if (!warehouse) return null
  const value = { id: warehouse.id, warehouseCode: warehouse.warehouseCode }
  setCacheValue(externalWarehouseCache, cacheKey, value)
  return value
}

async function resolveSkuMapWithCache(
  tenantId: string,
  clientId: string,
  skuCodes: string[]
): Promise<Map<string, ExternalSkuLite>> {
  const dedupedCodes = Array.from(new Set(skuCodes))
  const result = new Map<string, ExternalSkuLite>()
  const missingCodes: string[] = []

  for (const code of dedupedCodes) {
    const cacheKey = buildSkuCacheKey(tenantId, clientId, code)
    const cached = getCacheValue(externalSkuCache, cacheKey)
    if (cached) {
      result.set(code, cached)
    } else {
      missingCodes.push(code)
    }
  }

  if (missingCodes.length > 0) {
    const found = await prisma.sku.findMany({
      where: { tenantId, clientId, skuCode: { in: missingCodes } },
      select: { id: true, skuCode: true, skuName: true, unit: true, isSerialManaged: true },
    })

    for (const sku of found) {
      const value: ExternalSkuLite = {
        id: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        unit: sku.unit,
        isSerialManaged: sku.isSerialManaged,
      }
      result.set(sku.skuCode, value)
      const cacheKey = buildSkuCacheKey(tenantId, clientId, sku.skuCode)
      setCacheValue(externalSkuCache, cacheKey, value)
    }
  }

  return result
}

// GET /api/v1/outbound-orders - 获取出库订单列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = outboundOrderListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      orderType: searchParams.get('orderType'),
      orderStructureType: searchParams.get('orderStructureType'),
      clientId: searchParams.get('clientId'),
      warehouseId: searchParams.get('warehouseId'),
      waveId: searchParams.get('waveId'),
      priority: searchParams.get('priority'),
      expectedShipDateFrom: searchParams.get('expectedShipDateFrom'),
      expectedShipDateTo: searchParams.get('expectedShipDateTo'),
      createdAtFrom: searchParams.get('createdAtFrom'),
      createdAtTo: searchParams.get('createdAtTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      // 新增筛选参数
      orderSource: searchParams.get('orderSource'),
      platform: searchParams.get('platform'),
      skuCode: searchParams.get('skuCode'),
      barcode: searchParams.get('barcode'),
      isCombined: searchParams.get('isCombined'),
      interceptionStatus: searchParams.get('interceptionStatus'),
      interceptionSource: searchParams.get('interceptionSource'),
      numberChangeStatus: searchParams.get('numberChangeStatus'),
      totalSkuCountMin: searchParams.get('totalSkuCountMin'),
      totalSkuCountMax: searchParams.get('totalSkuCountMax'),
      totalOrderedQtyMin: searchParams.get('totalOrderedQtyMin'),
      totalOrderedQtyMax: searchParams.get('totalOrderedQtyMax'),
      hasNotes: searchParams.get('hasNotes'),
      dateType: searchParams.get('dateType'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const {
      page, pageSize, search, status, orderType, orderStructureType, clientId, warehouseId: requestedWarehouseId,
      waveId, expectedShipDateFrom, expectedShipDateTo,
      createdAtFrom, createdAtTo, sortBy, sortOrder,
      // 新增筛选参数
      orderSource, platform, skuCode, barcode, isCombined,
      interceptionStatus, interceptionSource, numberChangeStatus,
      totalSkuCountMin, totalSkuCountMax, totalOrderedQtyMin, totalOrderedQtyMax,
      hasNotes, dateType, dateFrom, dateTo,
    } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { referenceNumber: { contains: search } },
      ]
    }

    if (status) where.status = status
    if (orderType) where.orderBusinessType = orderType
    if (orderStructureType) where.orderType = orderStructureType
    if (clientId) where.clientId = clientId
    if (warehouseId) where.warehouseId = warehouseId
    if (waveId) where.waveId = waveId

    if (expectedShipDateFrom || expectedShipDateTo) {
      where.expectedShipDate = buildDateRange(expectedShipDateFrom || undefined, expectedShipDateTo || undefined)
    }

    if (createdAtFrom || createdAtTo) {
      where.createdAt = buildDateRange(createdAtFrom || undefined, createdAtTo || undefined)
    }

    // 新增筛选条件
    if (orderSource) where.orderSource = orderSource
    if (platform) where.platform = platform
    if (isCombined !== undefined) where.isCombined = isCombined
    if (numberChangeStatus) where.numberChangeStatus = numberChangeStatus

    const activeInterceptionCaseWhere: Record<string, unknown> = { isActive: true }
    if (interceptionSource) {
      activeInterceptionCaseWhere.source = interceptionSource
    }
    if (interceptionStatus === 'NOT_INTERCEPTED') {
      where.interceptionCases = {
        none: {
          isActive: true,
        },
      }
    } else if (interceptionStatus || interceptionSource) {
      if (interceptionStatus) {
        activeInterceptionCaseWhere.status = interceptionStatus
      }
      where.interceptionCases = {
        some: activeInterceptionCaseWhere,
      }
    }

    // 备注筛选
    if (hasNotes === true) {
      where.notes = { not: null }
    } else if (hasNotes === false) {
      where.OR = [...(where.OR as unknown[] || []), { notes: null }, { notes: '' }]
    }

    // SKU种类数范围
    if (totalSkuCountMin !== undefined || totalSkuCountMax !== undefined) {
      where.totalSkuCount = {}
      if (totalSkuCountMin !== undefined) {
        (where.totalSkuCount as Record<string, unknown>).gte = totalSkuCountMin
      }
      if (totalSkuCountMax !== undefined) {
        (where.totalSkuCount as Record<string, unknown>).lte = totalSkuCountMax
      }
    }

    // 订购数量范围
    if (totalOrderedQtyMin !== undefined || totalOrderedQtyMax !== undefined) {
      where.totalOrderedQty = {}
      if (totalOrderedQtyMin !== undefined) {
        (where.totalOrderedQty as Record<string, unknown>).gte = totalOrderedQtyMin
      }
      if (totalOrderedQtyMax !== undefined) {
        (where.totalOrderedQty as Record<string, unknown>).lte = totalOrderedQtyMax
      }
    }

    // SKU编码/条码筛选（需要关联查询）
    if (skuCode || barcode) {
      const skuWhere: Record<string, unknown> = {}
      if (skuCode) skuWhere.skuCode = { contains: skuCode }
      if (barcode) {
        where.lines = {
          some: {
            ...skuWhere,
            sku: { barcode: { contains: barcode } },
          },
        }
      } else {
        where.lines = { some: skuWhere }
      }
    }

    // 日期类型筛选
    if (dateFrom || dateTo) {
      const dateRange = buildDateRange(dateFrom || undefined, dateTo || undefined)

      switch (dateType) {
        case 'audit':
          where.timeline = { allocatedAt: dateRange }
          break
        case 'shipped':
          where.timeline = { checkedOutAt: dateRange }
          break
        case 'expectedShip':
          where.timeline = { expectedShipDate: dateRange }
          break
        case 'created':
        default:
          where.createdAt = dateRange
          break
      }
    }

    const total = await prisma.outboundOrder.count({ where })

    const orders = await prisma.outboundOrder.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        referenceNumber: true,
        platform: true,
        platformOrderId: true,
        orderBusinessType: true,
        orderType: true,
        orderSource: true,
        status: true,
        outbound_order_address: {
          select: {
            shippingName: true,
            shippingPhone: true,
            shippingLine1: true,
            shippingCity: true,
            shippingProvince: true,
            shippingCountry: true,
            shippingPostalCode: true,
          },
        },
        shippingMethod: true,
        trackingNumber: true,
        totalOrderedQty: true,
        totalAllocatedQty: true,
        totalPickedQty: true,
        totalPackedQty: true,
        totalShippedQty: true,
        totalSkuCount: true,
        totalWeightKg: true,
        hasSerialItems: true,
        isCombined: true,
        numberChangeStatus: true,
        waveId: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        wave: {
          select: {
            id: true,
            waveNumber: true,
            status: true,
          },
        },
        extension: {
          select: {
            channel: true,
            checkOutWeightKg: true,
          },
        },
        timeline: {
          select: {
            allocatedAt: true,
            checkedOutAt: true,
            expectedShipDate: true,
          },
        },
        interceptionCases: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            source: true,
            remark: true,
            status: true,
            markedBy: true,
            markedAt: true,
            blockedAtCheckout: true,
          },
        },
        _count: {
          select: {
            lines: true,
            shipments: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: orders.map((order) => {
        const activeInterceptionCase = order.interceptionCases[0]
        const { interceptionCases, ...rest } = order
        return {
          ...rest,
          ...buildOrderInterceptionSummary(activeInterceptionCase),
        }
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取出库订单列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取出库订单列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/outbound-orders - 创建出库订单
export async function POST(request: NextRequest) {
  try {
    // 快速判断是否为外部 API Key 请求，转交给专用处理函数
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')
    if (apiKey) {
      return await handleExternalOrderCreate(request)
    }

    // 内部 Session 认证
    const authResult = await authenticate(request)
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context
    const tenantId: string = authContext.tenantId
    const userId: string | undefined = authContext.userId

    const body = await request.json()

    // 内部API使用原有逻辑
    const validationResult = createOutboundOrderSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 验证客户是否存在
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, message: '客户不存在', code: 'CLIENT_NOT_FOUND' },
        { status: 400 }
      )
    }

    // 验证仓库是否存在
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: data.warehouseId,
        tenantId,
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
        { status: 400 }
      )
    }

    // 验证SKU并准备明细数据
    const lines = data.lines || []
    const skuIds = lines.map((line) => line.skuId)

    if (skuIds.length > 0) {
      const skus = await prisma.sku.findMany({
        where: {
          id: { in: skuIds },
          clientId: data.clientId,
        },
        select: { id: true },
      })

      const foundSkuIds = new Set(skus.map((s) => s.id))
      const missingSkuIds = skuIds.filter((id) => !foundSkuIds.has(id))

      if (missingSkuIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: '部分SKU不存在或不属于该客户',
            code: 'SKU_NOT_FOUND',
            details: { missingSkuIds },
          },
          { status: 400 }
        )
      }
    }

    // 使用锁保护订单号生成和创建
    const orderLockKey = getOrderCreationLockKey(tenantId, warehouse.warehouseCode)

    const order = await withLock(
      orderLockKey,
      async () => {
        // 生成订单号
        const orderNumber = data.orderNumber || await generateOutboundOrderNumber(
          tenantId,
          warehouse.warehouseCode
        )

        // 检查订单号是否已存在
        const existingOrder = await prisma.outboundOrder.findFirst({
          where: {
            tenantId,
            orderNumber,
          },
        })

        if (existingOrder) {
          throw new Error('ORDER_NUMBER_EXISTS')
        }

        // 计算汇总数据
        const totalOrderedQty = lines.reduce((sum, line) => sum + line.orderedQty, 0)
        const totalSkuCount = lines.length

        // 自动计算订单结构类型
        let orderStructureType: string
        if (totalSkuCount === 1) {
          orderStructureType = totalOrderedQty === 1 ? 'SINGLE_ITEM_SINGLE' : 'SINGLE_ITEM_MULTI'
        } else if (totalSkuCount === 0) {
          orderStructureType = 'SINGLE_ITEM_SINGLE'
        } else {
          orderStructureType = 'MULTI_ITEM'
        }

        // 构建完整地址
        const addr = data.address
        const shippingFullAddress = [
          addr.country || 'CN',
          addr.province,
          addr.city,
          addr.addressLine,
        ].filter(Boolean).join(' ')

        // 创建地址和订单
        return prisma.$transaction(async (tx) => {
          // 先创建 OrderAddress
          const orderAddress = await tx.orderAddress.create({
            data: {
              tenantId,
              shippingName: addr.contactName,
              shippingPhone: addr.contactPhone || null,
              shippingEmail: addr.contactEmail || null,
              shippingLine1: addr.addressLine,
              shippingCity: addr.city || null,
              shippingProvince: addr.province || null,
              shippingCountry: addr.country || 'CN',
              shippingPostalCode: addr.postalCode || null,
              shippingFullAddress,
            },
          })

          // 创建订单
          const newOrder = await tx.outboundOrder.create({
            data: {
              tenantId,
              clientId: data.clientId,
              warehouseId: data.warehouseId,
              orderNumber,
              referenceNumber: data.referenceNumber || null,
              platform: 'MANUAL',
              platformOrderId: data.platformOrderNumber || null,
              orderBusinessType: data.orderType,
              orderType: orderStructureType,
              orderSource: data.orderSource,
              status: 'PENDING',
              outbound_address_id: orderAddress.id,
              shippingMethod: data.shippingMethod || null,
              totalOrderedQty,
              totalSkuCount,
              notes: data.notes || null,
              config: (data.config || {}) as object,
              createdBy: userId,
              updatedBy: userId,
            },
          })

          // 创建订单明细
          if (lines.length > 0) {
            await tx.outboundOrderLine.createMany({
              data: lines.map((line, index) => ({
                tenantId,
                orderId: newOrder.id,
                lineNumber: index + 1,
                skuId: line.skuId,
                skuCode: line.skuCode,
                skuName: line.skuName || undefined,
                orderedQty: line.orderedQty,
                uomId: line.uomId || undefined,
                uomCode: line.uomCode || undefined,
                unitPrice: line.unitPrice || undefined,
                lineAmount: line.unitPrice ? line.unitPrice * line.orderedQty : undefined,
                batchNumber: line.batchNumber || undefined,
                status: 'PENDING',
                notes: line.notes || undefined,
                createdBy: userId,
                updatedBy: userId,
              })),
            })
          }

          // 创建时间节点记录
          await tx.orderTimeline.create({
            data: {
              tenantId,
              orderId: newOrder.id,
            },
          })

          // 查询完整订单信息返回
          return tx.outboundOrder.findUnique({
            where: { id: newOrder.id },
            include: {
              outbound_order_address: {
                select: {
                  shippingName: true,
                  shippingPhone: true,
                  shippingEmail: true,
                  shippingLine1: true,
                  shippingCity: true,
                  shippingProvince: true,
                  shippingCountry: true,
                  shippingPostalCode: true,
                },
              },
              client: {
                select: {
                  id: true,
                  clientCode: true,
                  clientName: true,
                },
              },
              warehouse: {
                select: {
                  id: true,
                  warehouseCode: true,
                  warehouseName: true,
                },
              },
              lines: {
                select: {
                  id: true,
                  lineNumber: true,
                  skuId: true,
                  skuCode: true,
                  skuName: true,
                  orderedQty: true,
                  allocatedQty: true,
                  pickedQty: true,
                  packedQty: true,
                  shippedQty: true,
                  uomCode: true,
                  unitPrice: true,
                  lineAmount: true,
                  batchNumber: true,
                  status: true,
                },
              },
            },
          })
        })
      },
      { ttlMs: 15000, retryCount: 2, prefix: 'order' }
    )

    // 加入库存分配队列（后台异步，不阻塞下单响应）
    if (order) {
      void queueInventoryAllocationWithRetry(
        { id: order.id, orderNumber: order.orderNumber, warehouseId: order.warehouseId, clientId: order.clientId },
        tenantId,
        userId!
      ).catch((error) => {
        console.error('加入库存分配队列失败:', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          error,
        })
      })

      // 记录操作日志
      operationLogService.logOperation({
        tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: order.id,
        entityNumber: order.orderNumber,
        operationType: ORDER_OPERATION_TYPES.CREATE.type,
        operationName: ORDER_OPERATION_TYPES.CREATE.name,
        beforeStatus: undefined,
        afterStatus: 'PENDING',
        operatorId: userId,
        operatorName: undefined,
      })
    }

    return NextResponse.json({
      success: true,
      data: order,
      message: '出库订单创建成功',
    })
  } catch (error) {
    if (error instanceof LockAcquisitionError) {
      console.error('获取锁失败:', error.lockKey)
      return NextResponse.json(
        {
          success: false,
          message: '系统繁忙，请稍后重试',
          code: 'SYSTEM_BUSY',
        },
        { status: 503 }
      )
    }

    if (error instanceof Error && error.message === 'ORDER_NUMBER_EXISTS') {
      return NextResponse.json(
        { success: false, message: '订单号已存在', code: 'ORDER_NUMBER_EXISTS' },
        { status: 400 }
      )
    }

    console.error('创建出库订单失败:', error)
    return NextResponse.json(
      { success: false, message: '创建出库订单失败' },
      { status: 500 }
    )
  }
}

const EXTERNAL_REF_LOCK_OPTIONS = {
  ttlMs: 10000,
  retryCount: 0,
  prefix: 'ref',
} as const
const EXTERNAL_BUSY_RETRY_AFTER_SECONDS = 1

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function getUniqueConstraintTargets(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = (error.meta as { target?: unknown } | undefined)?.target
  if (Array.isArray(target)) {
    return target.map((item) => String(item).toLowerCase())
  }
  if (typeof target === 'string') {
    return [target.toLowerCase()]
  }
  return []
}

function isReferenceNumberConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
  const target = getUniqueConstraintTargets(error).join('|')
  return target.includes('uq_outbound_order_tenant_client_reference')
    || (target.includes('tenant') && target.includes('client') && target.includes('reference'))
}

function isOrderNumberConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
  const target = getUniqueConstraintTargets(error).join('|')
  return target.includes('order_number')
    || target.includes('ordernumber')
}

function isTransactionStartTimeoutError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2028') {
      return true
    }
    return typeof error.message === 'string'
      && error.message.includes('Unable to start a transaction in the given time')
  }

  return error instanceof Error
    && error.message.includes('Unable to start a transaction in the given time')
}

function createExternalSystemBusyResponse(lockKey: string, logCtx: ApiLogContext): NextResponse {
  Log.channel('file-external-api').warning('[ExternalOrder] 锁竞争触发系统繁忙', {
    ...logCtx,
    lock_key: lockKey,
    lock_options: {
      retry_after_seconds: EXTERNAL_BUSY_RETRY_AFTER_SECONDS,
      ref_lock: EXTERNAL_REF_LOCK_OPTIONS,
    },
  })

  return NextResponse.json(
    {
      success: false,
      message: '系统繁忙，请稍后重试',
      code: 'SYSTEM_BUSY',
    },
    {
      status: 503,
      headers: { 'Retry-After': String(EXTERNAL_BUSY_RETRY_AFTER_SECONDS) },
    }
  )
}

type ExternalStepTiming = Record<string, number>

function recordStepTiming(
  stepTiming: ExternalStepTiming,
  stepName: string,
  startedAt: number
): void {
  stepTiming[stepName] = Date.now() - startedAt
}

// 外部API入口：withExternalApiLog 包裹，结束后统一写一条完整日志
const handleExternalOrderCreate = withExternalApiLog(
  'ExternalOrder.create',
  async (request, logCtx) => {
    const requestStartedAt = Date.now()
    const stepTiming: ExternalStepTiming = {}
    logCtx.step_timing = stepTiming

    const authenticateStartedAt = Date.now()
    const authResult = await authenticate(request)
    recordStepTiming(stepTiming, 'authenticate_ms', authenticateStartedAt)

    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }
    const authContext = authResult.context
    const tenantId = authContext.tenantId
    const userId = authContext.userId

    if (!hasApiScope(authContext, 'order:create')) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    const parseBodyStartedAt = Date.now()
    const body = await request.json()
    recordStepTiming(stepTiming, 'parse_body_ms', parseBodyStartedAt)

    const auditContextScopeStartedAt = Date.now()
    const response = await withUnifiedAuditContext(request, authContext, async () => {
      const validatePayloadStartedAt = Date.now()
      const validationResult = externalCreateOrderSchema.safeParse(body)
      recordStepTiming(stepTiming, 'validate_payload_ms', validatePayloadStartedAt)
      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: validationResult.error.errors },
          { status: 400 }
        )
      }

      const data: ExternalCreateOrderInput = {
        ...validationResult.data,
        externalOrderNo: validationResult.data.externalOrderNo?.trim() || null,
      }

      // 解析clientCode到clientId
      const resolveClientStartedAt = Date.now()
      let clientId = authContext?.clientId
      if (!clientId) {
        const resolvedClientId = await resolveClientIdWithCache(tenantId, data.clientCode)
        if (!resolvedClientId) {
          return NextResponse.json(
            { success: false, message: '客户不存在', code: 'CLIENT_NOT_FOUND' },
            { status: 400 }
          )
        }
        clientId = resolvedClientId
      }
      recordStepTiming(stepTiming, 'resolve_client_ms', resolveClientStartedAt)

      // 解析warehouseCode到warehouseId
      const resolveWarehouseStartedAt = Date.now()
      let warehouseId = authContext?.warehouseId
      let warehouseCode = data.warehouseCode
      if (!warehouseId) {
        const resolvedWarehouse = await resolveWarehouseWithCache(tenantId, data.warehouseCode)
        if (!resolvedWarehouse) {
          return NextResponse.json(
            { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
            { status: 400 }
          )
        }
        warehouseId = resolvedWarehouse.id
        warehouseCode = resolvedWarehouse.warehouseCode
      }
      recordStepTiming(stepTiming, 'resolve_warehouse_ms', resolveWarehouseStartedAt)

      // 解析所有skuCode到skuId
      const resolveSkusStartedAt = Date.now()
      const skuCodes = data.items.map((item) => item.skuCode)
      const skuMap = await resolveSkuMapWithCache(tenantId, clientId, skuCodes)
      recordStepTiming(stepTiming, 'resolve_skus_ms', resolveSkusStartedAt)

      const missingSkuCodes = skuCodes.filter((code) => !skuMap.has(code))
      if (missingSkuCodes.length > 0) {
        return NextResponse.json(
          { success: false, message: '部分SKU不存在', code: 'SKU_NOT_FOUND', details: { missingSkuCodes } },
          { status: 400 }
        )
      }

      // 填充请求上下文（包装器结束时统一写日志）
      logCtx.external_order_no = data.externalOrderNo
      logCtx.warehouse_code = warehouseCode
      logCtx.item_count = data.items.length
      logCtx.total_qty = data.items.reduce((s, i) => s + i.quantity, 0)
      logCtx.platform = data.source?.platform

      try {
        // 如果有 externalOrderNo，先检查是否已存在
        if (data.externalOrderNo) {
          const refLockKey = getReferenceNumberLockKey(tenantId, clientId, data.externalOrderNo)
          const acquireRefLockStartedAt = Date.now()
          const refLock = await acquireLock(refLockKey, EXTERNAL_REF_LOCK_OPTIONS)
          recordStepTiming(stepTiming, 'acquire_ref_lock_ms', acquireRefLockStartedAt)

          if (!refLock.acquired) {
            return NextResponse.json(
              { success: false, message: '外部订单号正在处理中，请勿重复提交', code: 'EXTERNAL_ORDER_NO_PROCESSING' },
              { status: 409 }
            )
          }

          try {
            const checkRefExistsStartedAt = Date.now()
            const existingByRef = await prisma.outboundOrder.findFirst({
              where: { tenantId, clientId, referenceNumber: data.externalOrderNo },
              select: { orderNumber: true },
            })
            recordStepTiming(stepTiming, 'check_ref_exists_ms', checkRefExistsStartedAt)
            if (existingByRef) {
              return NextResponse.json(
                { success: false, message: '外部订单号已存在', code: 'EXTERNAL_ORDER_NO_EXISTS', data: { existingOrderNumber: existingByRef.orderNumber } },
                { status: 409 }
              )
            }

            const createOrderStartedAt = Date.now()
            const createdResponse = await createExternalOrder(tenantId, clientId, warehouseId, warehouseCode, userId, data, skuMap, logCtx)
            recordStepTiming(stepTiming, 'create_external_order_ms', createOrderStartedAt)
            return createdResponse
          } finally {
            const releaseRefLockStartedAt = Date.now()
            await refLock.release()
            recordStepTiming(stepTiming, 'release_ref_lock_ms', releaseRefLockStartedAt)
          }
        }

        // 没有 referenceNumber 的情况，直接创建
        const createOrderStartedAt = Date.now()
        const createdResponse = await createExternalOrder(tenantId, clientId, warehouseId, warehouseCode, userId, data, skuMap, logCtx)
        recordStepTiming(stepTiming, 'create_external_order_ms', createOrderStartedAt)
        return createdResponse
      } catch (error) {
        if (error instanceof LockAcquisitionError) {
          return createExternalSystemBusyResponse(error.lockKey, logCtx)
        }

        if (isUniqueConstraintError(error)) {
          if (isReferenceNumberConflict(error) && data.externalOrderNo) {
            const existingByRef = await prisma.outboundOrder.findFirst({
              where: { tenantId, clientId, referenceNumber: data.externalOrderNo },
              select: { orderNumber: true },
            })
            return NextResponse.json(
              {
                success: false,
                message: '外部订单号已存在',
                code: 'EXTERNAL_ORDER_NO_EXISTS',
                data: { existingOrderNumber: existingByRef?.orderNumber },
              },
              { status: 409 }
            )
          }

          if (isOrderNumberConflict(error)) {
            return NextResponse.json(
              { success: false, message: '订单号已存在', code: 'ORDER_NUMBER_EXISTS' },
              { status: 400 }
            )
          }
        }

        if (error instanceof Error && error.message === 'ORDER_NUMBER_EXISTS') {
          return NextResponse.json(
            { success: false, message: '订单号已存在', code: 'ORDER_NUMBER_EXISTS' },
            { status: 400 }
          )
        }

        Log.channel('file-external-api').error('[ExternalOrder.create] 创建失败', {
          ...logCtx,
          error,
        })
        return NextResponse.json(
          { success: false, message: '创建出库订单失败' },
          { status: 500 }
        )
      }
    })
    recordStepTiming(stepTiming, 'audit_context_scope_ms', auditContextScopeStartedAt)
    stepTiming.total_handler_ms = Date.now() - requestStartedAt
    return response
  }
)

// 外部API创建订单的辅助函数
async function createExternalOrder(
  tenantId: string,
  clientId: string,
  warehouseId: string,
  warehouseCode: string,
  userId: string | undefined,
  data: ExternalCreateOrderInput,
  skuMap: Map<string, { id: string; skuCode: string; skuName: string; unit: string; isSerialManaged: boolean }>,
  logCtx: ApiLogContext
) {
  const createStartedAt = Date.now()
  const createStepTiming: ExternalStepTiming = {}
  logCtx.create_step_timing = createStepTiming

  // 填充请求上下文（包装器结束时统一写日志）
  logCtx.external_order_no = data.externalOrderNo
  logCtx.warehouse_code = warehouseCode
  logCtx.item_count = data.items.length
  logCtx.total_qty = data.items.reduce((s, i) => s + i.quantity, 0)
  logCtx.platform = data.source?.platform

  const preparePayloadStartedAt = Date.now()
  // 计算汇总数据
  const totalOrderedQty = data.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalSkuCount = data.items.length

  // 自动计算订单结构类型
  let orderStructureType: string
  if (totalSkuCount === 1) {
    orderStructureType = totalOrderedQty === 1 ? 'SINGLE_ITEM_SINGLE' : 'SINGLE_ITEM_MULTI'
  } else {
    orderStructureType = 'MULTI_ITEM'
  }

  // 检测是否含序列号商品
  const hasSerialItems = data.items.some(item => {
    const sku = skuMap.get(item.skuCode)
    return sku?.isSerialManaged === true
  })

  // 构建完整地址
  const addr = data.consignee.address
  const shippingFullAddress = [
    addr.country || 'CN',
    addr.province,
    addr.city,
    addr.line1,
    addr.line2,
  ].filter(Boolean).join(' ')
  recordStepTiming(createStepTiming, 'prepare_payload_ms', preparePayloadStartedAt)

  const createOrderWithOrderNumber = async (orderNumber: string) => {
    const txWriteStartedAt = Date.now()
    const newOrderId = await prisma.$transaction(async (tx) => {
      // 创建 OrderAddress 记录
      const orderAddress = await tx.orderAddress.create({
        data: {
          tenantId,
          shippingName: data.consignee.name,
          shippingPhone: data.consignee.phone || null,
          shippingEmail: data.consignee.email || null,
          shippingCompany: data.consignee.company || null,
          shippingLine1: addr.line1,
          shippingLine2: addr.line2 || null,
          shippingCity: addr.city || null,
          shippingProvince: addr.province || null,
          shippingPostalCode: addr.postalCode || null,
          shippingCountry: addr.country || 'CN',
          shippingFullAddress,
        },
      })

      // 创建订单
      const newOrder = await tx.outboundOrder.create({
        data: {
          tenantId,
          clientId,
          warehouseId,
          orderNumber,
          referenceNumber: data.externalOrderNo || null,
          platform: data.source?.platform || 'OTHER',
          platformOrderId: data.source?.platformOrderId || null,
          orderBusinessType: data.orderType || 'STANDARD',
          orderType: orderStructureType,
          orderSource: 'API',
          status: 'PENDING',
          outbound_address_id: orderAddress.id,
          shippingMethod: data.shipping?.method || null,
          trackingNumber: data.shipping?.trackingNumber || null,
          totalOrderedQty,
          totalSkuCount,
          hasSerialItems,
          notes: data.remark || null,
          config: (data.customFields || {}) as object,
          createdBy: userId,
          updatedBy: userId,
        },
      })

      // 创建订单明细
      const lineData: Prisma.OutboundOrderLineCreateManyInput[] = data.items.map((item, index) => {
        const sku = skuMap.get(item.skuCode)!
        return {
          tenantId,
          orderId: newOrder.id,
          lineNumber: item.lineNo || index + 1,
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          orderedQty: item.quantity,
          uomCode: item.unit ?? sku.unit,
          unitPrice: item.unitPrice || undefined,
          lineAmount: item.unitPrice ? item.unitPrice * item.quantity : undefined,
          batchNumber: item.batchNo || undefined,
          status: 'PENDING',
          notes: item.remark || undefined,
          createdBy: userId,
          updatedBy: userId,
        }
      })
      await tx.outboundOrderLine.createMany({ data: lineData })

      // 创建扩展信息
      await tx.outboundOrderExtension.create({
        data: {
          tenantId,
          orderId: newOrder.id,
          totalAmount: data.payment?.totalAmount || null,
          currency: data.payment?.currency || 'CNY',
          channel: data.source?.channel || null,
          shippingLabelUrl: null,
          shippingLabelType: null,
        },
      })

      // 创建时间节点记录
      await tx.orderTimeline.create({
        data: {
          tenantId,
          orderId: newOrder.id,
          expectedShipDate: data.shipping?.expectedShipDate || null,
          expectedDeliveryDate: data.shipping?.expectedDeliveryDate || null,
        },
      })

      return newOrder.id
    }, {
      maxWait: 10000,
      timeout: 15000,
    })
    const txWriteMs = Date.now() - txWriteStartedAt

    // 事务外查询完整订单信息，减少事务占用时间
    const fetchCreatedOrderStartedAt = Date.now()
    const order = await prisma.outboundOrder.findUnique({
      where: { id: newOrderId },
      select: {
        id: true,
        orderNumber: true,
        referenceNumber: true,
        platform: true,
        platformOrderId: true,
        orderBusinessType: true,
        orderType: true,
        orderSource: true,
        status: true,
        hasSerialItems: true,
        outbound_order_address: {
          select: {
            shippingName: true,
            shippingPhone: true,
            shippingEmail: true,
            shippingCompany: true,
            shippingLine1: true,
            shippingLine2: true,
            shippingCity: true,
            shippingProvince: true,
            shippingPostalCode: true,
            shippingCountry: true,
          },
        },
        shippingMethod: true,
        trackingNumber: true,
        totalOrderedQty: true,
        totalSkuCount: true,
        notes: true,
        createdAt: true,
        client: {
          select: {
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            warehouseCode: true,
            warehouseName: true,
          },
        },
        lines: {
          select: {
            lineNumber: true,
            skuCode: true,
            skuName: true,
            orderedQty: true,
            uomCode: true,
            unitPrice: true,
            lineAmount: true,
            batchNumber: true,
            status: true,
          },
        },
        extension: {
          select: {
            totalAmount: true,
            currency: true,
            channel: true,
            shippingLabelUrl: true,
            shippingLabelType: true,
          },
        },
        timeline: {
          select: {
            expectedShipDate: true,
            expectedDeliveryDate: true,
          },
        },
      },
    })
    const fetchCreatedOrderMs = Date.now() - fetchCreatedOrderStartedAt

    return { order, txWriteMs, fetchCreatedOrderMs }
  }

  const maxOrderNumberRetries = data.orderNo ? 3 : 8
  let order: NonNullable<Awaited<ReturnType<typeof createOrderWithOrderNumber>>['order']> | null = null
  let orderNumberAttempts = 0
  let orderNumberGenerateCheckMs = 0

  const orderNumberFlowStartedAt = Date.now()
  for (let attempt = 1; attempt <= maxOrderNumberRetries; attempt++) {
    orderNumberAttempts = attempt
    const generateAndCheckStartedAt = Date.now()
    const orderNumber = data.orderNo || await generateOutboundOrderNumber(tenantId, warehouseCode)

    // 仅自定义订单号做前置查重；自动生成号依赖唯一约束冲突重试，减少一次查询
    if (data.orderNo) {
      const existingOrder = await prisma.outboundOrder.findFirst({
        where: { tenantId, orderNumber },
        select: { id: true },
      })

      if (existingOrder) {
        orderNumberGenerateCheckMs += Date.now() - generateAndCheckStartedAt
        return NextResponse.json(
          { success: false, message: '订单号已存在', code: 'ORDER_NUMBER_EXISTS' },
          { status: 400 }
        )
      }
    }
    orderNumberGenerateCheckMs += Date.now() - generateAndCheckStartedAt

    try {
      const createdResult = await createOrderWithOrderNumber(orderNumber)
      order = createdResult.order
      createStepTiming.tx_write_ms = createdResult.txWriteMs
      createStepTiming.fetch_created_order_ms = createdResult.fetchCreatedOrderMs
      break
    } catch (error) {
      if (isTransactionStartTimeoutError(error)) {
        if (attempt >= maxOrderNumberRetries) {
          return createExternalSystemBusyResponse(`tx-start-timeout:${tenantId}:${warehouseCode}`, logCtx)
        }
        continue
      }

      if (!data.orderNo && isUniqueConstraintError(error) && isOrderNumberConflict(error)) {
        if (attempt >= maxOrderNumberRetries) {
          return createExternalSystemBusyResponse(`order-number-conflict:${tenantId}:${warehouseCode}`, logCtx)
        }
        continue
      }
      throw error
    }
  }
  recordStepTiming(createStepTiming, 'order_number_flow_ms', orderNumberFlowStartedAt)
  createStepTiming.order_number_attempts = orderNumberAttempts
  createStepTiming.order_number_generate_check_ms = orderNumberGenerateCheckMs

  if (!order) {
    return createExternalSystemBusyResponse(`order-number-empty:${tenantId}:${warehouseCode}`, logCtx)
  }

  const shippingLabelStartedAt = Date.now()
  // 处理发货面单（锁外、事务外）
  if (data.shipping?.shippingLabel) {
    const label = data.shipping.shippingLabel
    let shippingLabelUrl: string | null = null
    let shippingLabelType: string | null = null

    if (label.base64) {
      try {
        const result = await shippingLabelStorage.saveBase64Image(
          tenantId,
          order!.id,
          label.base64
        )
        shippingLabelUrl = result.url
        shippingLabelType = result.type
      } catch (error) {
        Log.channel('file-external-api').error('[ExternalOrder] 保存面单Base64失败', {
          order_number: order!.orderNumber,
          external_order_no: data.externalOrderNo,
          error,
        })
      }
    } else if (label.url) {
      if (shippingLabelStorage.validateUrl(label.url)) {
        shippingLabelUrl = label.url
        shippingLabelType = 'URL'
      } else {
        Log.channel('file-external-api').warning('[ExternalOrder] 无效的面单URL格式', {
          order_number: order!.orderNumber,
          external_order_no: data.externalOrderNo,
          url: label.url,
        })
      }
    }

    if (shippingLabelUrl && shippingLabelType) {
      try {
        await prisma.outboundOrderExtension.update({
          where: { orderId: order!.id },
          data: { shippingLabelUrl, shippingLabelType },
        })
        if (order?.extension) {
          order.extension.shippingLabelUrl = shippingLabelUrl
          order.extension.shippingLabelType = shippingLabelType
        }
      } catch (error) {
        Log.channel('file-external-api').error('[ExternalOrder] 更新面单扩展信息失败', {
          order_number: order!.orderNumber,
          external_order_no: data.externalOrderNo,
          error,
        })
      }
    }
  }
  recordStepTiming(createStepTiming, 'shipping_label_ms', shippingLabelStartedAt)

  // 加入库存分配队列（后台异步，不阻塞下单响应）
  const queueDispatchStartedAt = Date.now()
  void queueInventoryAllocationWithRetry(
    { id: order!.id, orderNumber: order!.orderNumber, warehouseId, clientId },
    tenantId,
    userId || 'system'
  ).catch((error) => {
    Log.channel('file-external-api').error('[ExternalOrder] 加入库存分配队列失败', {
      order_number: order!.orderNumber,
      external_order_no: order?.referenceNumber,
      error,
    })
  })
  recordStepTiming(createStepTiming, 'queue_dispatch_ms', queueDispatchStartedAt)

  // 记录操作日志
  const operationLogDispatchStartedAt = Date.now()
  operationLogService.logOperation({
    tenantId,
    entityType: 'OUTBOUND_ORDER',
    entityId: order!.id,
    entityNumber: order!.orderNumber,
    operationType: ORDER_OPERATION_TYPES.CREATE.type,
    operationName: ORDER_OPERATION_TYPES.CREATE.name,
    beforeStatus: undefined,
    afterStatus: 'PENDING',
    operatorId: userId || 'system',
    operatorName: undefined,
    metadata: {
      source: 'EXTERNAL_API',
      referenceNumber: order?.referenceNumber,
    },
  })
  recordStepTiming(createStepTiming, 'operation_log_dispatch_ms', operationLogDispatchStartedAt)

  // 格式化响应为通用结构
  const responseBuildStartedAt = Date.now()
  const addr2 = order?.outbound_order_address
  const response = {
    orderId: order?.id,
    orderNo: order?.orderNumber,
    externalOrderNo: order?.referenceNumber,
    status: order?.status,
    orderType: order?.orderBusinessType,
    orderStructureType: order?.orderType,
    hasSerialItems: order?.hasSerialItems,
    totalQuantity: order?.totalOrderedQty,
    totalSkuCount: order?.totalSkuCount,
    createdAt: order?.createdAt,
    source: {
      platform: order?.platform,
      platformOrderId: order?.platformOrderId,
      channel: order?.extension?.channel,
    },
    consignee: addr2 ? {
      name: addr2.shippingName,
      phone: addr2.shippingPhone,
      email: addr2.shippingEmail,
      company: addr2.shippingCompany,
      address: {
        line1: addr2.shippingLine1,
        line2: addr2.shippingLine2,
        city: addr2.shippingCity,
        province: addr2.shippingProvince,
        postalCode: addr2.shippingPostalCode,
        country: addr2.shippingCountry,
      },
    } : null,
    shipping: {
      method: order?.shippingMethod,
      expectedShipDate: order?.timeline?.expectedShipDate,
      expectedDeliveryDate: order?.timeline?.expectedDeliveryDate,
    },
    payment: order?.extension ? {
      totalAmount: order.extension.totalAmount,
      currency: order.extension.currency,
    } : null,
    items: order?.lines.map(line => ({
      lineNo: line.lineNumber,
      skuCode: line.skuCode,
      skuName: line.skuName,
      quantity: line.orderedQty,
      unit: line.uomCode,
      unitPrice: line.unitPrice,
      lineAmount: line.lineAmount,
      batchNo: line.batchNumber,
      status: line.status,
    })),
    remark: order?.notes,
    client: order?.client,
    warehouse: order?.warehouse,
  }
  recordStepTiming(createStepTiming, 'response_build_ms', responseBuildStartedAt)

  // 填充响应上下文（包装器结束时统一写日志）
  logCtx.order_number = order!.orderNumber
  logCtx.order_id = order!.id
  createStepTiming.total_create_ms = Date.now() - createStartedAt

  return NextResponse.json({
    success: true,
    code: 'SUCCESS',
    message: '订单创建成功',
    data: response,
  })
}
