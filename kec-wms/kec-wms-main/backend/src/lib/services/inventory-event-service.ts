/**
 * 库存事件服务
 * 负责创建和管理库存事件（事件溯源的核心）
 *
 * 事件类型：
 * - PUTAWAY: 上架（增加 AVAILABLE）
 * - ALLOCATE: 分配（AVAILABLE -> ALLOCATED）
 * - DEALLOCATE: 取消分配（ALLOCATED -> AVAILABLE）
 * - PICK: 拣货（ALLOCATED -> PICKING）
 * - UNPICK: 取消拣货（PICKING -> ALLOCATED）
 * - SHIP: 发货（PICKING -> 出库）
 * - FREEZE: 冻结（AVAILABLE -> FROZEN）
 * - UNFREEZE: 解冻（FROZEN -> AVAILABLE）
 * - ADJUST: 调整（任意桶类型的数量调整）
 * - PICK_SHORTAGE: 拣货缺货
 * - SUPPLEMENT_ALLOCATE: 补拣分配
 * - SUPPLEMENT_PICK: 补拣完成
 * - TRANSFER: 移库（跨库位转移）
 * - QC_HOLD: 质检暂扣
 * - QC_RELEASE: 质检放行
 * - COUNT_HOLD: 盘点锁定
 * - COUNT_SURPLUS: 盘盈记录
 * - COUNT_SHORTAGE: 盘亏记录
 * - COUNT_RELEASE: 盘点释放
 */

import { prisma, type TransactionClient } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { Log } from '@/lib/logger'
import { randomUUID } from 'crypto'
import { enqueueInventoryEventPush } from './inventory-event-push-service'

// 事件类型枚举
export const InventoryEventType = {
  PUTAWAY: 'PUTAWAY',
  ALLOCATE: 'ALLOCATE',
  DEALLOCATE: 'DEALLOCATE',
  PICK: 'PICK',
  UNPICK: 'UNPICK',
  SHIP: 'SHIP',
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  ADJUST: 'ADJUST',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  QC_HOLD: 'QC_HOLD',
  QC_RELEASE: 'QC_RELEASE',
  COUNT_HOLD: 'COUNT_HOLD',
  COUNT_RELEASE: 'COUNT_RELEASE',
  DEFECTIVE_IN: 'DEFECTIVE_IN',
  DEFECTIVE_OUT: 'DEFECTIVE_OUT',
  PICK_SHORTAGE: 'PICK_SHORTAGE',
  SUPPLEMENT_ALLOCATE: 'SUPPLEMENT_ALLOCATE',
  SUPPLEMENT_PICK: 'SUPPLEMENT_PICK',
} as const

export type InventoryEventTypeValue = (typeof InventoryEventType)[keyof typeof InventoryEventType]

// 桶类型枚举
export const BucketType = {
  AVAILABLE: 'AVAILABLE',
  ALLOCATED: 'ALLOCATED',
  PICKING: 'PICKING',
  FROZEN: 'FROZEN',
  DEFECTIVE: 'DEFECTIVE',
  EXCEPTION: 'EXCEPTION',
  QC_HOLD: 'QC_HOLD',
  COUNT_HOLD: 'COUNT_HOLD',
  COUNT_SURPLUS: 'COUNT_SURPLUS',
  COUNT_SHORTAGE: 'COUNT_SHORTAGE',
} as const

export type BucketTypeValue = (typeof BucketType)[keyof typeof BucketType]

// 事件创建参数
export interface CreateEventParams {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  eventType: InventoryEventTypeValue
  eventSubType?: string | null
  bucketType: BucketTypeValue
  quantityDelta: number
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  referenceLineId?: string | null
  reasonCode?: string | null
  reasonDescription?: string | null
  unitCost?: Prisma.Decimal | null
  expiryDate?: Date | null
  productionDate?: Date | null
  fifoDate?: Date | null
  operatorId?: string | null
  metadata?: Prisma.JsonValue
}

// 生成事件编号
function generateEventNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `EVT-${timestamp}-${random}`.toUpperCase()
}

// 生成幂等键
function generateIdempotencyKey(params: CreateEventParams): string {
  // 将时间戳和随机数放在前面，确保唯一性不会被截断
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  const parts = [
    timestamp,
    random,
    params.eventType,
    params.bucketType,
    params.referenceType || '',
    params.referenceId || params.referenceNumber || '',
    params.referenceLineId || '',
  ]
  return parts.join(':').substring(0, 128)
}

function scheduleInventoryEventPush(tenantId: string, eventIds: string[]): void {
  const normalizedEventIds = Array.from(new Set(eventIds.filter(Boolean)))
  if (normalizedEventIds.length === 0) {
    return
  }

  // 延迟到当前调用栈结束，让外部事务先完成提交。
  setImmediate(() => {
    enqueueInventoryEventPush(tenantId, normalizedEventIds).catch((error) => {
      Log.error('[InventoryEvent] 库存流水推送入队失败', {
        tenantId,
        eventIds: normalizedEventIds,
        error,
      })
    })
  })
}

function scheduleGroupedInventoryEventPush(
  rows: Array<{ tenantId: string; id: string }>
): void {
  const grouped = new Map<string, string[]>()
  for (const row of rows) {
    const ids = grouped.get(row.tenantId) || []
    ids.push(row.id)
    grouped.set(row.tenantId, ids)
  }

  for (const [tenantId, eventIds] of grouped.entries()) {
    scheduleInventoryEventPush(tenantId, eventIds)
  }
}

/**
 * 创建库存事件
 * 这是事件溯源的核心方法，所有库存变动都通过此方法记录
 */
export async function createInventoryEvent(
  params: CreateEventParams,
  tx?: TransactionClient
): Promise<{ id: string; eventNumber: string }> {
  const client = tx || prisma
  const eventNumber = generateEventNumber()
  const idempotencyKey = generateIdempotencyKey(params)

  // 查询当前库存数量（变更前）
  const currentBucket = await client.inventoryBucket.findFirst({
    where: {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber || '',
      lpn: params.lpn || '',
      asnNumber: params.asnNumber || '',
      expiryDate: params.expiryDate || null,
      bucketType: params.bucketType,
    },
    select: { quantity: true },
  })
  const quantityBefore = currentBucket?.quantity || 0
  const quantityAfter = quantityBefore + params.quantityDelta

  const event = await client.inventoryEvent.create({
    data: {
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber || '',
      lpn: params.lpn || '',
      asnNumber: params.asnNumber || '',
      eventNumber,
      idempotencyKey,
      eventDate: new Date(),
      eventType: params.eventType,
      eventSubType: params.eventSubType,
      bucketType: params.bucketType,
      quantityBefore,
      quantityAfter,
      quantityDelta: params.quantityDelta,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      referenceLineId: params.referenceLineId,
      reasonCode: params.reasonCode,
      reasonDesc: params.reasonDescription,
      unitCost: params.unitCost,
      operatorId: params.operatorId,
    },
    select: { id: true, eventNumber: true },
  })

  scheduleInventoryEventPush(params.tenantId, [event.id])

  return event
}

/**
 * 批量创建库存事件
 * 注意：批量创建时 quantityBefore 设为 0，适用于初始化场景
 */
export async function createInventoryEvents(
  events: CreateEventParams[],
  tx?: TransactionClient
): Promise<{ count: number; eventIds: string[] }> {
  const client = tx || prisma

  if (events.length === 0) {
    return { count: 0, eventIds: [] }
  }

  const data = events.map((params) => {
    const id = randomUUID()
    return {
      id,
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber || '',
      lpn: params.lpn || '',
      asnNumber: params.asnNumber || '',
      eventNumber: generateEventNumber(),
      idempotencyKey: generateIdempotencyKey(params),
      eventDate: new Date(),
      eventType: params.eventType,
      eventSubType: params.eventSubType,
      bucketType: params.bucketType,
      quantityBefore: 0,
      quantityAfter: params.quantityDelta,
      quantityDelta: params.quantityDelta,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      referenceLineId: params.referenceLineId,
      reasonCode: params.reasonCode,
      reasonDesc: params.reasonDescription,
      unitCost: params.unitCost,
      operatorId: params.operatorId,
    }
  })

  try {
    const result = await client.inventoryEvent.createMany({ data })

    // 验证创建结果
    if (result.count !== events.length) {
      Log.warning('[InventoryEvent] 创建事件数量不匹配', { expected: events.length, actual: result.count })
    }

    scheduleGroupedInventoryEventPush(data.map((item) => ({ tenantId: item.tenantId, id: item.id })))

    Log.info('[InventoryEvent] 成功创建库存事件', { count: result.count })
    return { count: result.count, eventIds: data.map((item) => item.id) }
  } catch (error) {
    Log.error('[InventoryEvent] 创建库存事件失败', { error, event_data: JSON.stringify(data) })
    throw error
  }
}

/**
 * 上架事件
 * 将库存放入指定库位的 AVAILABLE 桶
 */
export async function createPutawayEvent(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
  },
  tx?: TransactionClient
) {
  return createInventoryEvent(
    {
      ...params,
      eventType: InventoryEventType.PUTAWAY,
      bucketType: BucketType.AVAILABLE,
      quantityDelta: params.quantity,
    },
    tx
  )
}

/**
 * 分配事件
 * 从 AVAILABLE 桶转移到 ALLOCATED 桶
 */
export async function createAllocateEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  // 创建两个事件：AVAILABLE 减少，ALLOCATED 增加
  const events = [
    {
      ...params,
      eventType: InventoryEventType.ALLOCATE,
      bucketType: BucketType.AVAILABLE,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.ALLOCATE,
      bucketType: BucketType.ALLOCATED,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 取消分配事件
 * 从 ALLOCATED 桶转移回 AVAILABLE 桶
 */
export async function createDeallocateEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const events = [
    {
      ...params,
      eventType: InventoryEventType.DEALLOCATE,
      bucketType: BucketType.ALLOCATED,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.DEALLOCATE,
      bucketType: BucketType.AVAILABLE,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 拣货事件
 * 从 ALLOCATED 桶转移到 PICKING 桶
 */
export async function createPickEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const events = [
    {
      ...params,
      eventType: InventoryEventType.PICK,
      bucketType: BucketType.ALLOCATED,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.PICK,
      bucketType: BucketType.PICKING,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 发货事件
 * 从指定桶移出（库存出库）
 * 默认从 PICKING 桶扣减，但可以通过 sourceBucketType 指定其他桶
 */
export async function createShipEvent(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
    sourceBucketType?: BucketTypeValue // 可选：指定从哪个桶扣减
  },
  tx?: TransactionClient
) {
  return createInventoryEvent(
    {
      ...params,
      eventType: InventoryEventType.SHIP,
      bucketType: params.sourceBucketType || BucketType.PICKING,
      quantityDelta: -params.quantity,
    },
    tx
  )
}

/**
 * 冻结事件
 * 从 AVAILABLE 桶转移到 FROZEN 桶
 */
export async function createFreezeEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const events = [
    {
      ...params,
      eventType: InventoryEventType.FREEZE,
      bucketType: BucketType.AVAILABLE,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.FREEZE,
      bucketType: BucketType.FROZEN,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 解冻事件
 * 从 FROZEN 桶转移回 AVAILABLE 桶
 */
export async function createUnfreezeEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const events = [
    {
      ...params,
      eventType: InventoryEventType.UNFREEZE,
      bucketType: BucketType.FROZEN,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.UNFREEZE,
      bucketType: BucketType.AVAILABLE,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 盘点锁定事件
 * 从原库存桶转移到 COUNT_HOLD 桶
 */
export async function createCountHoldEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
    sourceBucketType: BucketTypeValue
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const events = [
    {
      ...params,
      eventType: InventoryEventType.COUNT_HOLD,
      bucketType: params.sourceBucketType,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.COUNT_HOLD,
      bucketType: BucketType.COUNT_HOLD,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 盘点释放事件
 * 从 COUNT_HOLD 桶转回原库存桶
 */
export async function createCountReleaseEvents(
  params: Omit<CreateEventParams, 'eventType' | 'bucketType' | 'quantityDelta'> & {
    quantity: number
    targetBucketType: BucketTypeValue
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const events = [
    {
      ...params,
      eventType: InventoryEventType.COUNT_RELEASE,
      bucketType: BucketType.COUNT_HOLD,
      quantityDelta: -params.quantity,
    },
    {
      ...params,
      eventType: InventoryEventType.COUNT_RELEASE,
      bucketType: params.targetBucketType,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 调整事件
 * 直接调整指定桶的数量
 */
export async function createAdjustEvent(
  params: Omit<CreateEventParams, 'eventType'> & { eventType?: InventoryEventTypeValue },
  tx?: TransactionClient
) {
  return createInventoryEvent(
    {
      ...params,
      eventType: params.eventType ?? InventoryEventType.ADJUST,
    },
    tx
  )
}

/**
 * 移库事件
 * 从源库位转移到目标库位
 */
export async function createTransferEvents(
  params: {
    tenantId: string
    clientId: string
    warehouseId: string
    sourceLocationId: string
    targetLocationId: string
    skuId: string
    skuCode: string
    batchNumber?: string | null
    lpn?: string | null
    bucketType: BucketTypeValue
    quantity: number
    referenceType?: string | null
    referenceId?: string | null
    referenceNumber?: string | null
    operatorId?: string | null
  },
  tx?: TransactionClient
) {
  const client = tx || prisma

  const baseParams = {
    tenantId: params.tenantId,
    clientId: params.clientId,
    warehouseId: params.warehouseId,
    skuId: params.skuId,
    skuCode: params.skuCode,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    bucketType: params.bucketType,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    referenceNumber: params.referenceNumber,
    operatorId: params.operatorId,
  }

  const events = [
    {
      ...baseParams,
      locationId: params.sourceLocationId,
      eventType: InventoryEventType.TRANSFER_OUT,
      quantityDelta: -params.quantity,
    },
    {
      ...baseParams,
      locationId: params.targetLocationId,
      eventType: InventoryEventType.TRANSFER_IN,
      quantityDelta: params.quantity,
    },
  ]

  return createInventoryEvents(events as CreateEventParams[], client)
}

/**
 * 查询事件历史
 */
export async function getEventHistory(params: {
  tenantId: string
  warehouseId?: string
  locationId?: string
  skuId?: string
  batchNumber?: string
  lpn?: string
  eventType?: InventoryEventTypeValue
  referenceType?: string
  referenceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const where: Prisma.InventoryEventWhereInput = {
    tenantId: params.tenantId,
  }

  if (params.warehouseId) where.warehouseId = params.warehouseId
  if (params.locationId) where.locationId = params.locationId
  if (params.skuId) where.skuId = params.skuId
  if (params.batchNumber) where.batchNumber = params.batchNumber
  if (params.lpn) where.lpn = params.lpn
  if (params.eventType) where.eventType = params.eventType
  if (params.referenceType) where.referenceType = params.referenceType
  if (params.referenceId) where.referenceId = params.referenceId

  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) where.createdAt.gte = params.startDate
    if (params.endDate) where.createdAt.lte = params.endDate
  }

  const [events, total] = await Promise.all([
    prisma.inventoryEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.inventoryEvent.count({ where }),
  ])

  return { events, total }
}

/**
 * 根据事件重建库存状态
 * 用于数据校验和修复
 */
export async function rebuildBucketFromEvents(params: {
  tenantId: string
  warehouseId: string
  locationId: string
  skuId: string
  batchNumber?: string | null
  lpn?: string | null
  bucketType: BucketTypeValue
}): Promise<number> {
  const result = await prisma.inventoryEvent.aggregate({
    where: {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber || undefined,
      lpn: params.lpn || undefined,
      bucketType: params.bucketType,
    },
    _sum: {
      quantityDelta: true,
    },
  })

  return result._sum.quantityDelta || 0
}
