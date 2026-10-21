import { prisma, type TransactionClient } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { isUniqueConstraintError } from '@/lib/db/prisma-error-utils'
import { withSkuLock } from '@/lib/services/inventory-lock-service'
import { putaway } from '@/lib/services/inventory-operation-service'
import {
  triggerSnapshotUpdate,
  updateLocationSnapshot,
  updateSkuSummary,
} from '@/lib/services/inventory-snapshot-service'
import {
  generateReturnNumber,
  generateReturnPutawayDetailNumber,
  generateReturnPutawayOrderNumber,
} from '@/lib/utils/number-generator'
import {
  ReturnDispositionAction,
  ReturnQuality,
  ReturnStatus,
  ReturnType,
  type CreateReturnOrderInput,
  type CreateReturnPutawayOrderInput,
  type DispositionInput,
  type ExecuteReturnPutawayInput,
  type ReturnListQuery,
  type SaveCountLineInput,
} from '@/lib/validations/returns'

type AuthContext = {
  tenantId: string
  userId?: string
  warehouseId?: string
  username?: string
}

type ReturnStatusValue = (typeof ReturnStatus)[keyof typeof ReturnStatus]

const RETURN_LINE_STATUS_ORDER: ReturnStatusValue[] = [
  ReturnStatus.PENDING_SIGN,
  ReturnStatus.SIGNED,
  ReturnStatus.COUNTING,
  ReturnStatus.WAIT_DISPOSITION,
  ReturnStatus.DISPOSITION_RECEIVED,
  ReturnStatus.PENDING_PUTAWAY,
  ReturnStatus.PUTAWAYING,
  ReturnStatus.COMPLETED,
]

type ReturnLogisticsConflict = {
  returnNo: string
  status: string
}

const RETURN_STATUS_LABELS: Record<string, string> = {
  [ReturnStatus.PENDING_SIGN]: '待签收',
  [ReturnStatus.SIGNED]: '已签收',
  [ReturnStatus.COUNTING]: '清点中',
  [ReturnStatus.WAIT_DISPOSITION]: '待处理方式',
  [ReturnStatus.DISPOSITION_RECEIVED]: '已收处理方式',
  [ReturnStatus.PENDING_PUTAWAY]: '待上架',
  [ReturnStatus.PUTAWAYING]: '上架中',
  [ReturnStatus.COMPLETED]: '已完成',
}

const returnWarehouseSelect = {
  id: true,
  warehouseCode: true,
  warehouseName: true,
} satisfies Prisma.WarehouseSelect

function normalizeText(value?: string | null) {
  return value?.trim() || undefined
}

function parseSearchTerms(value?: string | null) {
  return (value || '')
    .split(/[\n,\uFF0C;\uFF1B\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildReturnLogisticsDuplicateMessage(existing?: ReturnLogisticsConflict | null) {
  if (existing) {
    const statusLabel = RETURN_STATUS_LABELS[existing.status] || existing.status
    return `物流单号已存在退件单：${existing.returnNo}，当前状态 ${statusLabel}，不能重复签收`
  }

  return '物流单号已存在退件单，不能重复签收'
}

function isReturnLogisticsUniqueConstraintError(error: unknown) {
  return isUniqueConstraintError(error, ['logisticsNo'])
}

function parseBoundaryDateTime(value: string | undefined, boundary: 'start' | 'end') {
  if (!value) return undefined

  let normalized = value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    normalized = boundary === 'end' ? `${value}T23:59:59.999` : `${value}T00:00:00.000`
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    normalized = boundary === 'end' ? `${value}:59.999` : `${value}:00.000`
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

async function hasOutboundOrderCheckedOut(tenantId: string, outboundOrderId: string) {
  const timeline = await prisma.orderTimeline.findFirst({
    where: {
      tenantId,
      orderId: outboundOrderId,
      checkedOutAt: { not: null },
    },
    select: { id: true },
  })
  if (timeline) return true

  const checkoutRecord = await prisma.checkoutRecord.findFirst({
    where: {
      tenantId,
      orderId: outboundOrderId,
      checkoutOrder: {
        checkedOutAt: { not: null },
      },
    },
    select: { id: true },
  })

  return !!checkoutRecord
}

async function assertOutboundOrderCheckedOut(tenantId: string, outboundOrder: { id: string; orderNumber: string }) {
  if (await hasOutboundOrderCheckedOut(tenantId, outboundOrder.id)) return
  throw new Error(`原出库订单 ${outboundOrder.orderNumber} 尚未签出，不能退件签收`)
}

async function getReturnSignInResult(tx: TransactionClient, returnOrderId: string) {
  const order = await tx.returnOrder.findUnique({
    where: { id: returnOrderId },
    include: {
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: returnWarehouseSelect },
      lines: {
        select: {
          skuCode: true,
          skuName: true,
          expectedQty: true,
          countedQty: true,
        },
        orderBy: { lineNumber: 'asc' },
      },
    },
  })

  if (!order) throw new Error('退件单不存在')

  const signedByUser = order.signedBy
    ? await tx.user.findFirst({
        where: { id: order.signedBy, tenantId: order.tenantId },
        select: { username: true, fullName: true },
      })
    : null

  return {
    ...order,
    signedByUser,
  }
}

function getScopedWarehouseId(auth: AuthContext, requestedWarehouseId?: string) {
  return auth.warehouseId || requestedWarehouseId
}

function getLineStatusRollup(lines: Array<{ status: string; countedQty: number }>): ReturnStatusValue {
  if (lines.length === 0) return ReturnStatus.PENDING_SIGN

  const activeLines = lines.filter(
    (line) => line.countedQty > 0 || (line.status !== ReturnStatus.PENDING_SIGN && line.status !== ReturnStatus.SIGNED)
  )
  const effectiveLines = activeLines.length > 0 ? activeLines : lines

  if (effectiveLines.every((line) => line.status === ReturnStatus.COMPLETED)) {
    return ReturnStatus.COMPLETED
  }
  if (effectiveLines.some((line) => line.status === ReturnStatus.COUNTING)) {
    return ReturnStatus.COUNTING
  }
  if (effectiveLines.some((line) => line.status === ReturnStatus.WAIT_DISPOSITION)) {
    return ReturnStatus.WAIT_DISPOSITION
  }

  let maxIndex = 0
  for (const line of effectiveLines) {
    const index = RETURN_LINE_STATUS_ORDER.indexOf(line.status as ReturnStatusValue)
    if (index > maxIndex) maxIndex = index
  }

  return RETURN_LINE_STATUS_ORDER[maxIndex] || ReturnStatus.PENDING_SIGN
}

async function refreshReturnOrderRollup(tx: TransactionClient, returnOrderId: string) {
  const lines = await tx.returnOrderLine.findMany({
    where: { returnOrderId },
    select: {
      status: true,
      expectedQty: true,
      countedQty: true,
      putawayQty: true,
    },
  })

  const status = getLineStatusRollup(lines)
  const data: Prisma.ReturnOrderUpdateInput = {
    status,
    totalExpectedQty: lines.reduce((sum, line) => sum + line.expectedQty, 0),
    totalCountedQty: lines.reduce((sum, line) => sum + line.countedQty, 0),
    totalPutawayQty: lines.reduce((sum, line) => sum + line.putawayQty, 0),
    totalLineCount: lines.length,
  }

  if (status === ReturnStatus.COMPLETED) {
    data.completeTime = new Date()
  }

  return tx.returnOrder.update({
    where: { id: returnOrderId },
    data,
  })
}

async function findWarehouse(tenantId: string, warehouseId: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, tenantId },
    select: { id: true, warehouseCode: true, warehouseName: true },
  })
  if (!warehouse) throw new Error('仓库不存在')
  return warehouse
}

async function findSkuByBarcode(tenantId: string, clientId: string, barcode: string) {
  return prisma.sku.findFirst({
    where: {
      tenantId,
      clientId,
      status: 'ACTIVE',
      OR: [
        { skuCode: barcode },
        { barcode },
        { barcodes: { some: { barcode } } },
      ],
    },
    select: {
      id: true,
      skuCode: true,
      skuName: true,
      barcode: true,
      isBatchManaged: true,
      isExpiryManaged: true,
      clientId: true,
    },
  })
}

async function findContainer(tenantId: string, warehouseId: string, containerCode: string) {
  const container = await prisma.container.findFirst({
    where: {
      tenantId,
      warehouseId,
      containerCode,
      enabledStatus: 'ENABLED',
    },
    select: { id: true, containerCode: true, usage: true },
  })
  if (!container) throw new Error('容器不存在或未启用')
  if (container.usage !== 'RETURN_INBOUND') throw new Error('退件清点只能绑定退件入库用途容器')
  return container
}

async function findReturnTempLocation(tenantId: string, warehouseId: string, locationCode: string) {
  const location = await prisma.binLocation.findFirst({
    where: {
      tenantId,
      warehouseId,
      locationCode,
    },
    include: { zone: { select: { qualityType: true, zoneName: true } } },
  })
  if (!location) {
    throw new Error(`退件暂存库位不存在：${locationCode}`)
  }
  if (location.status !== 'ACTIVE') {
    throw new Error(`退件暂存库位未启用：${locationCode}`)
  }
  if (location.lockStatus !== 'UNLOCKED') {
    throw new Error(`退件暂存库位已锁定：${locationCode}`)
  }
  if (!location.isReceivable) {
    throw new Error(`退件暂存库位不可收货：${locationCode}`)
  }
  if (location.locationType !== 'STAGING') {
    throw new Error(`退件暂存库位类型必须是暂存库位：${locationCode}`)
  }
  return location
}

async function findTargetLocation(tenantId: string, warehouseId: string, locationCode: string) {
  const location = await prisma.binLocation.findFirst({
    where: {
      tenantId,
      warehouseId,
      locationCode,
      status: 'ACTIVE',
      lockStatus: 'UNLOCKED',
    },
    include: { zone: { select: { qualityType: true, zoneName: true } } },
  })
  if (!location) throw new Error('目标库位不存在或不可用')
  return location
}

async function releaseReturnContainerIfReady(tx: TransactionClient, tenantId: string, containerId?: string | null) {
  if (!containerId) return

  const activeReturnLines = await tx.returnOrderLine.count({
    where: {
      tenantId,
      containerId,
      countedQty: { gt: 0 },
      status: { not: ReturnStatus.COMPLETED },
    },
  })

  const activePutawayLines = await tx.returnPutawayLine.count({
    where: {
      tenantId,
      containerId,
      status: { not: 'COMPLETED' },
    },
  })

  if (activeReturnLines === 0 && activePutawayLines === 0) {
    await tx.container.update({
      where: { id: containerId },
      data: {
        workStatus: 'IDLE',
        currentAsnId: null,
        currentBatchNumber: null,
        currentQualityStatus: null,
        currentSkuId: null,
        closedAt: null,
      },
    })
  }
}

export async function listReturnOrders(auth: AuthContext, query: ReturnListQuery) {
  const warehouseId = getScopedWarehouseId(auth)
  const where: Prisma.ReturnOrderWhereInput = { tenantId: auth.tenantId }
  if (warehouseId) where.warehouseId = warehouseId
  if (query.status) where.status = query.status
  if (query.returnType) where.returnType = query.returnType
  if (query.clientId) where.clientId = query.clientId

  const searchTerms = parseSearchTerms(query.search)
  if (searchTerms.length === 1) {
    const keyword = searchTerms[0]
    where.OR = [
      { returnNo: { contains: keyword } },
      { preReturnNo: { contains: keyword } },
      { logisticsNo: { contains: keyword } },
      { outboundOrderNo: { contains: keyword } },
      { platformOrderNo: { contains: keyword } },
    ]
  } else if (searchTerms.length > 1) {
    where.OR = [
      { returnNo: { in: searchTerms } },
      { logisticsNo: { in: searchTerms } },
      { outboundOrderNo: { in: searchTerms } },
      { platformOrderNo: { in: searchTerms } },
    ]
  }

  const createdAt: Prisma.DateTimeFilter = {}
  const start = parseBoundaryDateTime(query.dateFrom, 'start')
  const end = parseBoundaryDateTime(query.dateTo, 'end')
  if (start) createdAt.gte = start
  if (end) createdAt.lte = end
  if (Object.keys(createdAt).length > 0) where.createdAt = createdAt

  const [total, items] = await Promise.all([
    prisma.returnOrder.count({ where }),
    prisma.returnOrder.findMany({
      where,
      include: {
        client: { select: { clientCode: true, clientName: true } },
        warehouse: { select: { warehouseCode: true, warehouseName: true } },
        _count: { select: { lines: true, putawayOrders: true } },
      },
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
}

export async function getReturnOrderDetail(auth: AuthContext, id: string) {
  const order = await prisma.returnOrder.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
      ...(auth.warehouseId ? { warehouseId: auth.warehouseId } : {}),
    },
    include: {
      client: { select: { id: true, clientCode: true, clientName: true } },
      warehouse: { select: { id: true, warehouseCode: true, warehouseName: true } },
      outboundOrder: { select: { id: true, orderNumber: true, referenceNumber: true, platformOrderId: true } },
      lines: {
        include: {
          dispositions: true,
        },
        orderBy: { lineNumber: 'asc' },
      },
      putawayOrders: {
        include: { lines: { orderBy: { lineNumber: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!order) throw new Error('退件单不存在')
  return order
}

export async function createReturnOrder(auth: AuthContext, input: CreateReturnOrderInput) {
  const warehouseId = getScopedWarehouseId(auth, input.warehouseId)
  if (!warehouseId) throw new Error('缺少当前仓库')

  const warehouse = await findWarehouse(auth.tenantId, warehouseId)
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, tenantId: auth.tenantId, isActive: true },
    select: { id: true },
  })
  if (!client) throw new Error('客户不存在或未启用')

  const existing = await prisma.returnOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      logisticsNo: input.logisticsNo,
    },
    select: { returnNo: true, status: true },
  })
  if (existing) throw new Error(buildReturnLogisticsDuplicateMessage(existing))

  const skuIds = input.lines.map((line) => line.skuId)
  const skus = await prisma.sku.findMany({
    where: { tenantId: auth.tenantId, clientId: input.clientId, id: { in: skuIds }, status: 'ACTIVE' },
    select: { id: true, skuCode: true, skuName: true, barcode: true },
  })
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]))
  for (const line of input.lines) {
    if (!skuMap.has(line.skuId)) throw new Error('退件明细包含不存在或未启用的SKU')
  }

  const returnNo = await generateReturnNumber(auth.tenantId, warehouse.warehouseCode)

  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.returnOrder.create({
        data: {
          tenantId: auth.tenantId,
          clientId: input.clientId,
          warehouseId,
          returnNo,
          returnType: ReturnType.BUYER_RETURN,
          preReturnNo: normalizeText(input.preReturnNo),
          logisticsNo: input.logisticsNo,
          status: ReturnStatus.PENDING_SIGN,
          notes: normalizeText(input.notes),
          totalExpectedQty: input.lines.reduce((sum, line) => sum + line.expectedQty, 0),
          totalLineCount: input.lines.length,
          createdBy: auth.userId,
        },
      })

      for (const [index, line] of input.lines.entries()) {
        const sku = skuMap.get(line.skuId)!
        const lineNumber = index + 1
        await tx.returnOrderLine.create({
          data: {
            tenantId: auth.tenantId,
            returnOrderId: order.id,
            lineNumber,
            returnLineNo: `${returnNo}-${String(lineNumber).padStart(3, '0')}`,
            skuId: sku.id,
            skuCode: sku.skuCode,
            skuName: sku.skuName,
            barcode: sku.barcode,
            expectedQty: line.expectedQty,
            status: ReturnStatus.PENDING_SIGN,
            notes: normalizeText(line.notes),
            createdBy: auth.userId,
          },
        })
      }

      return refreshReturnOrderRollup(tx, order.id)
    })
  } catch (error) {
    if (isReturnLogisticsUniqueConstraintError(error)) {
      throw new Error(buildReturnLogisticsDuplicateMessage())
    }

    throw error
  }
}

export async function lookupReturnSignIn(auth: AuthContext, logisticsNo: string) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  const preReturn = await prisma.returnOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      logisticsNo,
      status: ReturnStatus.PENDING_SIGN,
    },
    include: {
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: returnWarehouseSelect },
      lines: { orderBy: { lineNumber: 'asc' } },
    },
  })
  if (preReturn) {
    return { matchType: 'PRE_RETURN', returnOrder: preReturn, outboundOrder: null }
  }

  const signedReturn = await prisma.returnOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      logisticsNo,
    },
    select: {
      returnNo: true,
      status: true,
    },
  })
  if (signedReturn) {
    throw new Error(buildReturnLogisticsDuplicateMessage(signedReturn))
  }

  const outboundOrder = await prisma.outboundOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      OR: [
        { orderNumber: logisticsNo },
        { referenceNumber: logisticsNo },
        { platformOrderId: logisticsNo },
        { trackingNumber: logisticsNo },
        { extension: { is: { logisticsTrackingNumber: logisticsNo } } },
        { shipments: { some: { trackingNumber: logisticsNo } } },
        { checkoutRecords: { some: { trackingNumber: logisticsNo } } },
      ],
    },
    include: {
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: returnWarehouseSelect },
      extension: { select: { logisticsTrackingNumber: true } },
      lines: { orderBy: { lineNumber: 'asc' } },
    },
  })

  if (!outboundOrder) {
    return { matchType: 'NOT_FOUND', returnOrder: null, outboundOrder: null }
  }
  await assertOutboundOrderCheckedOut(auth.tenantId, outboundOrder)

  return { matchType: 'OUTBOUND_ORDER', returnOrder: null, outboundOrder }
}

export async function confirmReturnSignIn(auth: AuthContext, input: { logisticsNo: string; returnOrderId?: string; outboundOrderId?: string }) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  if (input.returnOrderId) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.returnOrder.findFirst({
        where: {
          id: input.returnOrderId,
          tenantId: auth.tenantId,
          warehouseId,
          logisticsNo: input.logisticsNo,
          status: ReturnStatus.PENDING_SIGN,
        },
        include: { lines: true },
      })
      if (!order) throw new Error('可签收的预报退件单不存在')

      await tx.returnOrderLine.updateMany({
        where: { returnOrderId: order.id },
        data: { status: ReturnStatus.SIGNED },
      })

      await tx.returnOrder.update({
        where: { id: order.id },
        data: {
          status: ReturnStatus.SIGNED,
          signTime: new Date(),
          signedBy: auth.userId,
        },
      })

      await refreshReturnOrderRollup(tx, order.id)
      return getReturnSignInResult(tx, order.id)
    })
  }

  if (!input.outboundOrderId) throw new Error('缺少原出库订单')

  const existing = await prisma.returnOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      logisticsNo: input.logisticsNo,
    },
    select: { returnNo: true, status: true },
  })
  if (existing) throw new Error(buildReturnLogisticsDuplicateMessage(existing))

  const outboundOrder = await prisma.outboundOrder.findFirst({
    where: { id: input.outboundOrderId, tenantId: auth.tenantId, warehouseId },
    include: {
      warehouse: { select: { warehouseCode: true } },
      lines: { orderBy: { lineNumber: 'asc' } },
    },
  })
  if (!outboundOrder) throw new Error('原出库订单不存在')
  await assertOutboundOrderCheckedOut(auth.tenantId, outboundOrder)

  const returnNo = await generateReturnNumber(auth.tenantId, outboundOrder.warehouse.warehouseCode)

  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.returnOrder.create({
        data: {
          tenantId: auth.tenantId,
          clientId: outboundOrder.clientId,
          warehouseId,
          returnNo,
          returnType: ReturnType.COURIER_RETURN,
          logisticsNo: input.logisticsNo,
          outboundOrderId: outboundOrder.id,
          outboundOrderNo: outboundOrder.orderNumber,
          platformOrderNo: outboundOrder.platformOrderId,
          status: ReturnStatus.SIGNED,
          signTime: new Date(),
          signedBy: auth.userId,
          totalExpectedQty: outboundOrder.lines.reduce((sum, line) => sum + line.orderedQty, 0),
          totalLineCount: outboundOrder.lines.length,
          createdBy: auth.userId,
        },
      })

      for (const [index, line] of outboundOrder.lines.entries()) {
        const lineNumber = index + 1
        await tx.returnOrderLine.create({
          data: {
            tenantId: auth.tenantId,
            returnOrderId: order.id,
            lineNumber,
            returnLineNo: `${returnNo}-${String(lineNumber).padStart(3, '0')}`,
            skuId: line.skuId,
            skuCode: line.skuCode,
            skuName: line.skuName,
            expectedQty: line.orderedQty,
            batchNumber: line.batchNumber,
            expiryDate: line.requiredExpiryDate,
            status: ReturnStatus.SIGNED,
            createdBy: auth.userId,
          },
        })
      }

      await refreshReturnOrderRollup(tx, order.id)
      return getReturnSignInResult(tx, order.id)
    })
  } catch (error) {
    if (isReturnLogisticsUniqueConstraintError(error)) {
      throw new Error(buildReturnLogisticsDuplicateMessage())
    }

    throw error
  }
}

export async function lookupReturnCounting(auth: AuthContext, logisticsNo: string) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  const order = await prisma.returnOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      logisticsNo,
      status: { in: [ReturnStatus.SIGNED, ReturnStatus.COUNTING, ReturnStatus.WAIT_DISPOSITION] },
    },
    include: {
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: returnWarehouseSelect },
      lines: { orderBy: { lineNumber: 'asc' } },
    },
  })
  if (!order) throw new Error('可清点的退件单不存在')
  return order
}

export async function saveReturnCountLine(auth: AuthContext, returnOrderId: string, input: SaveCountLineInput) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  const order = await prisma.returnOrder.findFirst({
    where: {
      id: returnOrderId,
      tenantId: auth.tenantId,
      warehouseId,
      status: { in: [ReturnStatus.SIGNED, ReturnStatus.COUNTING] },
    },
  })
  if (!order) throw new Error('退件单状态不允许清点')

  const sku = await findSkuByBarcode(auth.tenantId, order.clientId, input.barcode)
  if (!sku) throw new Error('SKU不存在或不属于该客户')
  if (sku.isBatchManaged && !normalizeText(input.batchNumber)) throw new Error('该SKU启用批次管理，必须录入batchno')
  if (sku.isExpiryManaged && !input.expiryDate) throw new Error('该SKU启用效期管理，必须录入有效期')

  const container = await findContainer(auth.tenantId, warehouseId, input.containerCode)
  const tempLocation = await findReturnTempLocation(auth.tenantId, warehouseId, input.tempLocationCode)

  return prisma.$transaction(async (tx) => {
    const reusableLine = await tx.returnOrderLine.findFirst({
      where: {
        returnOrderId,
        skuId: sku.id,
        countedQty: 0,
        status: { in: [ReturnStatus.SIGNED, ReturnStatus.PENDING_SIGN, ReturnStatus.COUNTING] },
      },
      orderBy: { lineNumber: 'asc' },
    })

    const lineData = {
      skuName: sku.skuName,
      barcode: sku.barcode || input.barcode,
      countedQty: input.countedQty,
      quality: input.quality,
      batchNumber: normalizeText(input.batchNumber),
      expiryDate: input.expiryDate || null,
      containerId: container.id,
      containerCode: container.containerCode,
      tempLocationId: tempLocation.id,
      tempLocationCode: tempLocation.locationCode,
      photoUrls: input.photoUrls,
      status: ReturnStatus.COUNTING,
      notes: normalizeText(input.notes),
    }

    let line
    if (reusableLine) {
      line = await tx.returnOrderLine.update({
        where: { id: reusableLine.id },
        data: lineData,
      })
    } else {
      const lineNumber = await tx.returnOrderLine.count({ where: { returnOrderId } }) + 1
      line = await tx.returnOrderLine.create({
        data: {
          tenantId: auth.tenantId,
          returnOrderId,
          lineNumber,
          returnLineNo: `${order.returnNo}-${String(lineNumber).padStart(3, '0')}`,
          skuId: sku.id,
          skuCode: sku.skuCode,
          expectedQty: 0,
          createdBy: auth.userId,
          ...lineData,
        },
      })
    }

    await tx.container.update({
      where: { id: container.id },
      data: {
        workStatus: 'OCCUPIED',
        lastOccupiedTime: new Date(),
        currentSkuId: sku.id,
        currentQualityStatus: input.quality,
        currentBatchNumber: normalizeText(input.batchNumber),
      },
    })

    await tx.returnOrder.update({
      where: { id: returnOrderId },
      data: { status: ReturnStatus.COUNTING },
    })

    await refreshReturnOrderRollup(tx, returnOrderId)
    return line
  })
}

export async function completeReturnCounting(auth: AuthContext, returnOrderId: string) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  return prisma.$transaction(async (tx) => {
    const order = await tx.returnOrder.findFirst({
      where: {
        id: returnOrderId,
        tenantId: auth.tenantId,
        warehouseId,
        status: { in: [ReturnStatus.COUNTING, ReturnStatus.SIGNED, ReturnStatus.WAIT_DISPOSITION] },
      },
      include: { lines: true },
    })
    if (!order) throw new Error('退件单状态不允许完成清点')
    if (order.status === ReturnStatus.WAIT_DISPOSITION) {
      return getReturnSignInResult(tx, returnOrderId)
    }

    const countedLines = order.lines.filter((line) => line.countedQty > 0)
    if (countedLines.length === 0) throw new Error('没有清点明细，不能完成清点')

    for (const line of countedLines) {
      if (!line.containerId || !line.containerCode) throw new Error(`明细 ${line.skuCode} 未绑定容器`)
      if (!line.tempLocationId || !line.tempLocationCode) throw new Error(`明细 ${line.skuCode} 未绑定退件暂存库位`)
      const photoUrls = Array.isArray(line.photoUrls) ? line.photoUrls : []
      if (line.quality === ReturnQuality.DAMAGED && photoUrls.length === 0) {
        throw new Error(`破损明细 ${line.skuCode} 必须上传照片`)
      }
    }

    await tx.returnOrderLine.updateMany({
      where: { returnOrderId, countedQty: { gt: 0 } },
      data: { status: ReturnStatus.WAIT_DISPOSITION },
    })

    await tx.returnOrder.update({
      where: { id: returnOrderId },
      data: { countCompleteTime: new Date() },
    })

    await refreshReturnOrderRollup(tx, returnOrderId)
    return getReturnSignInResult(tx, returnOrderId)
  })
}

export async function saveReturnDispositions(auth: AuthContext, returnOrderId: string, input: DispositionInput) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  return prisma.$transaction(async (tx) => {
    const order = await tx.returnOrder.findFirst({
      where: {
        id: returnOrderId,
        tenantId: auth.tenantId,
        warehouseId,
        status: { in: [ReturnStatus.WAIT_DISPOSITION, ReturnStatus.DISPOSITION_RECEIVED] },
      },
      select: { id: true },
    })
    if (!order) throw new Error('退件单状态不允许录入处理方式')

    for (const item of input.items) {
      const line = await tx.returnOrderLine.findFirst({
        where: {
          id: item.returnLineId,
          returnOrderId,
          tenantId: auth.tenantId,
          countedQty: { gt: 0 },
          status: { in: [ReturnStatus.WAIT_DISPOSITION, ReturnStatus.DISPOSITION_RECEIVED] },
        },
        include: { dispositions: true },
      })
      if (!line) throw new Error('退件明细不存在或状态不允许处理')
      if (item.action === ReturnDispositionAction.GOOD_PUTAWAY && line.quality !== ReturnQuality.GOOD) {
        throw new Error('良品上架只能用于good明细')
      }
      if (item.action === ReturnDispositionAction.DAMAGED_PUTAWAY && line.quality !== ReturnQuality.DAMAGED) {
        throw new Error('damaged上架只能用于damaged明细')
      }

      const usedQty = line.dispositions.reduce((sum, disposition) => sum + disposition.quantity, 0)
      if (usedQty + item.quantity > line.countedQty) {
        throw new Error(`明细 ${line.skuCode} 的处理方式数量超过已清点数量`)
      }

      const isDestroy = item.action === ReturnDispositionAction.DESTROY
      const nextUsedQty = usedQty + item.quantity

      await tx.returnLineDisposition.create({
        data: {
          tenantId: auth.tenantId,
          returnOrderId,
          returnLineId: line.id,
          action: item.action,
          quality: line.quality || ReturnQuality.GOOD,
          quantity: item.quantity,
          remainingQty: isDestroy ? 0 : item.quantity,
          status: isDestroy ? ReturnStatus.COMPLETED : ReturnStatus.DISPOSITION_RECEIVED,
          notes: normalizeText(item.notes),
          createdBy: auth.userId,
        },
      })

      await tx.returnOrderLine.update({
        where: { id: line.id },
        data: {
          status: nextUsedQty >= line.countedQty
            ? isDestroy
              ? ReturnStatus.COMPLETED
              : ReturnStatus.DISPOSITION_RECEIVED
            : ReturnStatus.WAIT_DISPOSITION,
          dispositionAction: item.action,
        },
      })
    }

    await tx.returnOrder.update({
      where: { id: returnOrderId },
      data: { strategyReceivedTime: new Date() },
    })

    return refreshReturnOrderRollup(tx, returnOrderId)
  })
}

export async function listReturnPutawayCandidates(auth: AuthContext) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  return prisma.returnLineDisposition.findMany({
    where: {
      tenantId: auth.tenantId,
      status: ReturnStatus.DISPOSITION_RECEIVED,
      remainingQty: { gt: 0 },
      action: { in: [ReturnDispositionAction.GOOD_PUTAWAY, ReturnDispositionAction.DAMAGED_PUTAWAY] },
      returnOrder: { warehouseId },
    },
    include: {
      returnOrder: {
        select: {
          id: true,
          returnNo: true,
          logisticsNo: true,
          client: { select: { clientCode: true, clientName: true } },
        },
      },
      returnLine: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createReturnPutawayOrder(auth: AuthContext, input: CreateReturnPutawayOrderInput) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  const dispositions = await prisma.returnLineDisposition.findMany({
    where: {
      id: { in: input.dispositionIds },
      tenantId: auth.tenantId,
      status: ReturnStatus.DISPOSITION_RECEIVED,
      remainingQty: { gt: 0 },
      action: { in: [ReturnDispositionAction.GOOD_PUTAWAY, ReturnDispositionAction.DAMAGED_PUTAWAY] },
      returnOrder: { warehouseId },
    },
    include: {
      returnOrder: { include: { warehouse: { select: { warehouseCode: true } } } },
      returnLine: true,
    },
  })

  if (dispositions.length !== input.dispositionIds.length) {
    throw new Error('存在不可生成上架单的处理方式')
  }

  const groupedDispositions = [...dispositions.reduce((groups, disposition) => {
    const current = groups.get(disposition.returnOrderId) || []
    current.push(disposition)
    groups.set(disposition.returnOrderId, current)
    return groups
  }, new Map<string, typeof dispositions>()).values()]

  const firstReturnOrder = dispositions[0].returnOrder
  const firstPutawayOrderNumber = await generateReturnPutawayOrderNumber(auth.tenantId, firstReturnOrder.warehouse.warehouseCode)
  const firstSequence = Number.parseInt(firstPutawayOrderNumber.slice(-4), 10)
  if (Number.isNaN(firstSequence)) {
    throw new Error('退件上架单号生成失败')
  }
  const numberPrefix = firstPutawayOrderNumber.slice(0, -4)

  return prisma.$transaction(async (tx) => {
    const orders = []

    for (const [orderIndex, group] of groupedDispositions.entries()) {
      const returnOrder = group[0].returnOrder
      const returnOrderId = group[0].returnOrderId
      const totalQty = group.reduce((sum, item) => sum + item.remainingQty, 0)
      const putawayOrderNumber = `${numberPrefix}${(firstSequence + orderIndex).toString().padStart(4, '0')}`

      const order = await tx.returnPutawayOrder.create({
        data: {
          tenantId: auth.tenantId,
          putawayOrderNumber,
          warehouseId: returnOrder.warehouseId,
          clientId: returnOrder.clientId,
          returnOrderId,
          totalQty,
          pendingQty: totalQty,
          lineCount: group.length,
          status: 'PENDING',
          createdBy: auth.userId,
        },
      })

      for (const [index, disposition] of group.entries()) {
        const returnLine = disposition.returnLine
        await tx.returnPutawayLine.create({
          data: {
            tenantId: auth.tenantId,
            putawayOrderId: order.id,
            returnOrderId,
            returnLineId: returnLine.id,
            dispositionId: disposition.id,
            lineNumber: index + 1,
            skuId: returnLine.skuId,
            skuCode: returnLine.skuCode,
            skuName: returnLine.skuName,
            barcode: returnLine.barcode,
            quality: disposition.quality,
            action: disposition.action,
            quantity: disposition.remainingQty,
            remainingQty: disposition.remainingQty,
            batchNumber: returnLine.batchNumber,
            expiryDate: returnLine.expiryDate,
            containerId: returnLine.containerId,
            containerCode: returnLine.containerCode,
            sourceLocationCode: returnLine.tempLocationCode,
            status: 'PENDING',
          },
        })

        await tx.returnLineDisposition.update({
          where: { id: disposition.id },
          data: { status: ReturnStatus.PENDING_PUTAWAY },
        })

        await tx.returnOrderLine.update({
          where: { id: returnLine.id },
          data: { status: ReturnStatus.PENDING_PUTAWAY },
        })
      }

      await refreshReturnOrderRollup(tx, returnOrderId)
      orders.push(order)
    }

    return {
      putawayOrderNumber: orders[0]?.putawayOrderNumber,
      putawayOrderNumbers: orders.map((order) => order.putawayOrderNumber),
      orders,
    }
  })
}

export async function listReturnPutawayOrders(auth: AuthContext) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')

  return prisma.returnPutawayOrder.findMany({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      status: { in: ['PENDING', 'PARTIAL'] },
      lines: {
        some: {
          action: { in: [ReturnDispositionAction.GOOD_PUTAWAY, ReturnDispositionAction.DAMAGED_PUTAWAY] },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          remainingQty: { gt: 0 },
        },
      },
    },
    include: {
      returnOrder: { select: { returnNo: true, logisticsNo: true, warehouse: { select: returnWarehouseSelect } } },
      client: { select: { clientCode: true, clientName: true } },
      warehouse: { select: returnWarehouseSelect },
      lines: {
        where: {
          action: { in: [ReturnDispositionAction.GOOD_PUTAWAY, ReturnDispositionAction.DAMAGED_PUTAWAY] },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          remainingQty: { gt: 0 },
        },
        orderBy: { lineNumber: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function executeReturnPutaway(auth: AuthContext, input: ExecuteReturnPutawayInput) {
  const warehouseId = getScopedWarehouseId(auth)
  if (!warehouseId) throw new Error('缺少当前仓库')
  if (!auth.userId) throw new Error('缺少当前用户')
  const operatorId = auth.userId

  const order = await prisma.returnPutawayOrder.findFirst({
    where: {
      tenantId: auth.tenantId,
      warehouseId,
      putawayOrderNumber: input.putawayOrderNumber,
      status: { in: ['PENDING', 'PARTIAL'] },
    },
    include: { returnOrder: true, warehouse: { select: returnWarehouseSelect } },
  })
  if (!order) throw new Error('退件上架单不存在或已完成')

  const sku = await findSkuByBarcode(auth.tenantId, order.clientId, input.barcode)
  if (!sku) throw new Error('SKU不存在或不属于该客户')

  const targetLocation = await findTargetLocation(auth.tenantId, warehouseId, input.targetLocationCode)
  if (input.quality === ReturnQuality.GOOD && targetLocation.zone.qualityType !== 'GOOD') {
    throw new Error('良品只能上架到良品库区')
  }
  if (input.quality === ReturnQuality.DAMAGED && targetLocation.zone.qualityType === 'GOOD') {
    throw new Error('不良品不能上架到良品库区')
  }

  const line = await prisma.returnPutawayLine.findFirst({
    where: {
      tenantId: auth.tenantId,
      putawayOrderId: order.id,
      skuId: sku.id,
      quality: input.quality,
      containerCode: input.containerCode,
      action: { in: [ReturnDispositionAction.GOOD_PUTAWAY, ReturnDispositionAction.DAMAGED_PUTAWAY] },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      remainingQty: { gt: 0 },
      returnOrder: { logisticsNo: input.logisticsNo },
    },
    include: {
      returnLine: true,
      disposition: true,
      returnOrder: true,
    },
    orderBy: { lineNumber: 'asc' },
  })
  if (!line) throw new Error('未找到匹配的待退件上架明细')

  if (line.action === ReturnDispositionAction.GOOD_PUTAWAY && input.quality !== ReturnQuality.GOOD) {
    throw new Error('良品上架只能处理good商品')
  }
  if (line.action === ReturnDispositionAction.DAMAGED_PUTAWAY && input.quality !== ReturnQuality.DAMAGED) {
    throw new Error('damaged上架只能处理damaged商品')
  }
  if (line.action !== ReturnDispositionAction.GOOD_PUTAWAY && targetLocation.zone.qualityType === 'GOOD') {
    throw new Error('damaged上架或销毁不能进入良品库区')
  }
  if (input.quantity > line.remainingQty) {
    throw new Error(`上架数量(${input.quantity})超过剩余待上架数量(${line.remainingQty})`)
  }

  const detailNumber = await generateReturnPutawayDetailNumber(auth.tenantId, order.warehouse.warehouseCode)

  const result = await withSkuLock(auth.tenantId, warehouseId, sku.id, async () => {
    return prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string; remainingQty: number; putawayQty: number; status: string }>>`
        SELECT id, remaining_qty as "remainingQty", putaway_qty as "putawayQty", status
        FROM return_putaway_line
        WHERE id = ${line.id}
        AND tenant_id = ${auth.tenantId}
        FOR UPDATE
      `
      const lockedLine = lockedRows[0]
      if (!lockedLine || lockedLine.remainingQty <= 0 || lockedLine.status === 'COMPLETED') {
        throw new Error('该退件上架明细已完成')
      }
      if (input.quantity > lockedLine.remainingQty) {
        throw new Error(`上架数量(${input.quantity})超过剩余待上架数量(${lockedLine.remainingQty})`)
      }

      const qualityTypeForInventory = line.action === ReturnDispositionAction.GOOD_PUTAWAY
        ? ReturnQuality.GOOD
        : ReturnQuality.DAMAGED

      const putawayResult = await putaway({
        tenantId: auth.tenantId,
        clientId: order.clientId,
        warehouseId,
        locationId: targetLocation.id,
        skuId: sku.id,
        skuCode: sku.skuCode,
        quantity: input.quantity,
        batchNumber: line.batchNumber,
        asnNumber: line.returnOrder.returnNo,
        expiryDate: line.expiryDate,
        fifoDate: line.returnOrder.signTime || new Date(),
        referenceType: line.action === ReturnDispositionAction.DESTROY ? 'RETURN_DESTROY' : 'RETURN_PUTAWAY',
        referenceId: line.returnOrderId,
        referenceNumber: line.returnOrder.returnNo,
        referenceLineId: line.returnLineId,
        operatorId,
        qualityType: qualityTypeForInventory,
      }, tx)

      const newLinePutawayQty = lockedLine.putawayQty + input.quantity
      const newLineRemainingQty = lockedLine.remainingQty - input.quantity
      const lineCompleted = newLineRemainingQty <= 0

      await tx.returnPutawayLine.update({
        where: { id: line.id },
        data: {
          putawayQty: newLinePutawayQty,
          remainingQty: Math.max(0, newLineRemainingQty),
          targetLocationId: targetLocation.id,
          targetLocationCode: targetLocation.locationCode,
          status: lineCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        },
      })

      await tx.returnLineDisposition.update({
        where: { id: line.dispositionId },
        data: {
          putawayQty: { increment: input.quantity },
          remainingQty: { decrement: input.quantity },
          status: lineCompleted ? ReturnStatus.COMPLETED : ReturnStatus.PUTAWAYING,
        },
      })

      await tx.returnOrderLine.update({
        where: { id: line.returnLineId },
        data: {
          putawayQty: { increment: input.quantity },
          status: lineCompleted ? ReturnStatus.COMPLETED : ReturnStatus.PUTAWAYING,
        },
      })

      const detail = await tx.returnPutawayDetail.create({
        data: {
          tenantId: auth.tenantId,
          detailNumber,
          putawayOrderId: order.id,
          putawayLineId: line.id,
          returnOrderId: line.returnOrderId,
          returnLineId: line.returnLineId,
          returnNo: line.returnOrder.returnNo,
          skuId: sku.id,
          skuCode: sku.skuCode,
          quality: input.quality,
          action: line.action,
          quantity: input.quantity,
          locationId: targetLocation.id,
          locationCode: targetLocation.locationCode,
          containerId: line.containerId,
          containerCode: line.containerCode,
          inventoryEventId: putawayResult.eventId,
          putawayAt: new Date(),
          putawayBy: operatorId,
          deviceType: input.deviceType,
        },
      })

      const putawayOrder = await tx.returnPutawayOrder.findUnique({
        where: { id: order.id },
        select: { putawayQty: true, pendingQty: true },
      })
      if (!putawayOrder) throw new Error('退件上架单不存在')

      const incompleteLines = await tx.returnPutawayLine.count({
        where: {
          putawayOrderId: order.id,
          id: { not: line.id },
          action: { in: [ReturnDispositionAction.GOOD_PUTAWAY, ReturnDispositionAction.DAMAGED_PUTAWAY] },
          status: { not: 'COMPLETED' },
        },
      })
      const orderCompleted = incompleteLines === 0 && lineCompleted

      await tx.returnPutawayOrder.update({
        where: { id: order.id },
        data: {
          putawayQty: putawayOrder.putawayQty + input.quantity,
          pendingQty: Math.max(0, putawayOrder.pendingQty - input.quantity),
          status: orderCompleted ? 'COMPLETED' : 'PARTIAL',
        },
      })

      const siblingDispositions = await tx.returnLineDisposition.count({
        where: {
          returnLineId: line.returnLineId,
          id: { not: line.dispositionId },
          status: { not: ReturnStatus.COMPLETED },
        },
      })
      if (siblingDispositions > 0 && lineCompleted) {
        await tx.returnOrderLine.update({
          where: { id: line.returnLineId },
          data: { status: ReturnStatus.PUTAWAYING },
        })
      }

      if (lineCompleted) {
        await releaseReturnContainerIfReady(tx, auth.tenantId, line.containerId)
      }

      await refreshReturnOrderRollup(tx, line.returnOrderId)

      return {
        detail,
        eventId: putawayResult.eventId,
        warehouseId,
        warehouse: order.warehouse,
        clientId: order.clientId,
        skuId: sku.id,
        skuCode: sku.skuCode,
      }
    }, { timeout: 15000 })
  })

  triggerSnapshotUpdate({
    tenantId: auth.tenantId,
    clientId: result.clientId,
    warehouseId,
    locationId: targetLocation.id,
    skuId: result.skuId,
    skuCode: result.skuCode,
  }).catch(async () => {
    await Promise.all([
      updateLocationSnapshot({
        tenantId: auth.tenantId,
        clientId: result.clientId,
        warehouseId,
        locationId: targetLocation.id,
        skuId: result.skuId,
        skuCode: result.skuCode,
      }),
      updateSkuSummary({
        tenantId: auth.tenantId,
        clientId: result.clientId,
        warehouseId,
        skuId: result.skuId,
        skuCode: result.skuCode,
      }),
    ])
  })

  return result
}
