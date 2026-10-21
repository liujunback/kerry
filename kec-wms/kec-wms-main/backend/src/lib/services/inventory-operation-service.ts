/**
 * 库存操作服务（事件溯源版本）
 * 处理上架、拣货、发货、冻结、移库等核心库存操作
 */

import { prisma, type TransactionClient } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import {
  createPutawayEvent,
  createPickEvents,
  createShipEvent,
  createFreezeEvents,
  createUnfreezeEvents,
  createTransferEvents,
  createAdjustEvent,
  BucketType,
  type InventoryEventTypeValue,
  type BucketTypeValue,
} from './inventory-event-service'
import { updateBucketsInTransaction, getBucket } from './inventory-bucket-service'
import { withLocationLock } from './inventory-lock-service'
import { Log } from '@/lib/logger'

// 上架参数
interface PutawayParams {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  quantity: number
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null  // ASN单号
  expiryDate?: Date | null
  productionDate?: Date | null
  fifoDate?: Date | string | null  // FIFO日期，通常使用ASN签收时间
  unitCost?: Prisma.Decimal | null
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  referenceLineId?: string | null
  operatorId?: string | null
  qualityType?: 'GOOD' | 'DAMAGED' | null  // 质量类型，默认为 GOOD
}

function normalizeFifoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date()
  }
  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

/**
 * 上架操作
 * 根据质量类型将库存放入 AVAILABLE 或 DEFECTIVE 桶
 * FIFO日期优先使用传入的fifoDate（通常是ASN签收时间），如果没有则使用当前时间
 */
export async function putaway(params: PutawayParams, tx?: TransactionClient) {
  const client = tx || prisma
  // 优先使用传入的 fifoDate（ASN签收时间），否则使用当前时间
  // 如果 fifoDate 是字符串（被 timezone-extension 转换），则创建新的 Date 对象
  const fifoDate = normalizeFifoDate(params.fifoDate)

  // 根据质量类型决定桶类型
  const bucketType = params.qualityType === 'DAMAGED' ? BucketType.DEFECTIVE : BucketType.AVAILABLE

  // 创建上架事件
  const event = await createPutawayEvent(
    {
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      quantity: params.quantity,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      referenceLineId: params.referenceLineId,
      unitCost: params.unitCost,
      expiryDate: params.expiryDate,
      productionDate: params.productionDate,
      fifoDate,
      operatorId: params.operatorId,
    },
    client
  )

  // 更新库存桶（根据质量类型）
  await updateBucketsInTransaction(
    [
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        bucketType,
        quantityDelta: params.quantity,
        fifoDate,
        expiryDate: params.expiryDate,
      },
    ],
    client
  )

  return { eventId: event.id, eventNumber: event.eventNumber }
}

// 拣货参数
interface PickParams {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  quantity: number
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  expiryDate?: Date | null
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  referenceLineId?: string | null
  operatorId?: string | null
}

/**
 * 拣货操作
 * 从 ALLOCATED 桶转移到 PICKING 桶
 */
export async function pick(params: PickParams, tx?: TransactionClient) {
  const client = tx || prisma

  // 检查 ALLOCATED 桶是否有足够库存
  const allocatedBucket = await getBucket({
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    locationId: params.locationId,
    skuId: params.skuId,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    asnNumber: params.asnNumber,
    expiryDate: params.expiryDate,
    bucketType: BucketType.ALLOCATED,
  })

  if (!allocatedBucket || allocatedBucket.quantity < params.quantity) {
    throw new Error(
      `分配库存不足: 需要 ${params.quantity}, 可用 ${allocatedBucket?.quantity || 0}`
    )
  }

  // 创建拣货事件
  await createPickEvents(
    {
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: allocatedBucket.batchNumber,
      lpn: allocatedBucket.lpn,
      asnNumber: allocatedBucket.asnNumber,
      expiryDate: allocatedBucket.expiryDate,
      quantity: params.quantity,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      referenceLineId: params.referenceLineId,
      operatorId: params.operatorId,
    },
    client
  )

  // 更新桶状态
  await updateBucketsInTransaction(
    [
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: allocatedBucket.batchNumber,
        lpn: allocatedBucket.lpn,
        asnNumber: allocatedBucket.asnNumber,
        expiryDate: allocatedBucket.expiryDate,
        bucketType: BucketType.ALLOCATED,
        quantityDelta: -params.quantity,
      },
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: allocatedBucket.batchNumber,
        lpn: allocatedBucket.lpn,
        asnNumber: allocatedBucket.asnNumber,
        bucketType: BucketType.PICKING,
        quantityDelta: params.quantity,
        fifoDate: allocatedBucket.fifoDate,
        expiryDate: allocatedBucket.expiryDate,
      },
    ],
    client
  )

  return { success: true }
}

// 发货参数
interface ShipParams {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  quantity: number
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  expiryDate?: Date | null
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  referenceLineId?: string | null
  operatorId?: string | null
  sourceBucketType?: BucketTypeValue // 可选：明确指定从哪个桶扣减
  skipBucketLocks?: boolean
}

/**
 * 发货操作（智能桶选择版本）
 * 支持电子拣货和纸质拣货混用场景
 * 如果指定了 sourceBucketType，则只从该桶扣减
 * 否则优先从 PICKING 桶扣减，不足时回退到 ALLOCATED 桶
 */
export async function ship(params: ShipParams, tx?: TransactionClient) {
  const client = tx || prisma

  // 如果明确指定了源桶，只从该桶扣减
  if (params.sourceBucketType) {
    let bucket = await getBucket({
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      expiryDate: params.expiryDate,
      bucketType: params.sourceBucketType,
    })

    // 兼容旧数据：如果找不到桶，尝试不带 batchNumber、lpn 和 asnNumber 查询
    if (!bucket && (params.batchNumber || params.lpn || params.asnNumber)) {
      Log.warning('[Ship] 使用完整条件未找到桶，尝试兼容查询', { bucket_type: params.sourceBucketType, sku_id: params.skuId, location_id: params.locationId })
      bucket = await client.inventoryBucket.findFirst({
        where: {
          tenantId: params.tenantId,
          warehouseId: params.warehouseId,
          locationId: params.locationId,
          skuId: params.skuId,
          bucketType: params.sourceBucketType,
        },
      })
      if (bucket) {
        Log.warning('[Ship] 找到兼容桶', { bucket_id: bucket.id, batch_number: bucket.batchNumber, lpn: bucket.lpn, asn_number: bucket.asnNumber, quantity: bucket.quantity })
      }
    }

    if (!bucket || bucket.quantity < params.quantity) {
      throw new Error(
        `${params.sourceBucketType} 桶库存不足: 需要 ${params.quantity}, 可用 ${bucket?.quantity || 0}`
      )
    }

    // 创建发货事件（使用实际找到的桶的批次和LPN信息）
    const event = await createShipEvent(
      {
        tenantId: params.tenantId,
        clientId: params.clientId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        batchNumber: bucket.batchNumber,
        lpn: bucket.lpn,
        asnNumber: bucket.asnNumber,
        expiryDate: bucket.expiryDate,
        quantity: params.quantity,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        referenceNumber: params.referenceNumber,
        referenceLineId: params.referenceLineId,
        operatorId: params.operatorId,
        sourceBucketType: params.sourceBucketType, // 传入源桶类型
      },
      client
    )

    Log.info('[Ship] 创建发货事件成功', { event_number: event.eventNumber, bucket_type: params.sourceBucketType, batch_number: bucket.batchNumber, lpn: bucket.lpn, asn_number: bucket.asnNumber, quantity: params.quantity })

    // 更新指定桶（使用实际找到的桶的批次、LPN和ASN信息）
    await updateBucketsInTransaction(
      [
        {
          tenantId: params.tenantId,
          warehouseId: params.warehouseId,
          locationId: params.locationId,
          skuId: params.skuId,
          skuCode: params.skuCode,
          clientId: params.clientId,
          batchNumber: bucket.batchNumber,
          lpn: bucket.lpn,
          asnNumber: bucket.asnNumber,
          expiryDate: bucket.expiryDate,
          bucketType: params.sourceBucketType,
          quantityDelta: -params.quantity,
        },
      ],
      client,
      { skipLocks: params.skipBucketLocks }
    )

    return {
      eventId: event.id,
      eventNumber: event.eventNumber,
      sourceBucket: params.sourceBucketType,
    }
  }

  // 未指定源桶，使用智能回退逻辑
  // 1. 优先尝试从 PICKING 桶获取库存（电子拣货）
  const pickingBucket = await getBucket({
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    locationId: params.locationId,
    skuId: params.skuId,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    expiryDate: params.expiryDate,
    bucketType: BucketType.PICKING,
  })

  // 2. 如果 PICKING 桶不足，尝试 ALLOCATED 桶（纸质拣货）
  const allocatedBucket = await getBucket({
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    locationId: params.locationId,
    skuId: params.skuId,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    expiryDate: params.expiryDate,
    bucketType: BucketType.ALLOCATED,
  })

  const pickingQty = pickingBucket?.quantity || 0
  const allocatedQty = allocatedBucket?.quantity || 0
  const totalAvailable = pickingQty + allocatedQty

  if (totalAvailable < params.quantity) {
    throw new Error(
      `库存不足: 需要 ${params.quantity}, 可用 ${totalAvailable} (PICKING: ${pickingQty}, ALLOCATED: ${allocatedQty})`
    )
  }

  // 3. 计算从各个桶扣减的数量
  const fromPicking = Math.min(pickingQty, params.quantity)
  const fromAllocated = params.quantity - fromPicking

  const bucketUpdates = []
  const eventIds: string[] = []

  // 4. 从 PICKING 桶扣减
  if (fromPicking > 0) {
    const sourcePickingBucket = pickingBucket!
    // 创建 PICKING 桶的发货事件
    const pickingEvent = await createShipEvent(
      {
        tenantId: params.tenantId,
        clientId: params.clientId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        batchNumber: sourcePickingBucket.batchNumber,
        lpn: sourcePickingBucket.lpn,
        asnNumber: sourcePickingBucket.asnNumber,
        expiryDate: sourcePickingBucket.expiryDate,
        quantity: fromPicking,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        referenceNumber: params.referenceNumber,
        referenceLineId: params.referenceLineId,
        operatorId: params.operatorId,
        sourceBucketType: BucketType.PICKING,
      },
      client
    )
    eventIds.push(pickingEvent.id)
    Log.info('[Ship] 从PICKING桶扣减', { quantity: fromPicking, event_number: pickingEvent.eventNumber })

      bucketUpdates.push({
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: sourcePickingBucket.batchNumber,
        lpn: sourcePickingBucket.lpn,
        asnNumber: sourcePickingBucket.asnNumber,
        expiryDate: sourcePickingBucket.expiryDate,
        bucketType: BucketType.PICKING,
        quantityDelta: -fromPicking,
      })
  }

  // 5. 从 ALLOCATED 桶扣减
  if (fromAllocated > 0) {
    const sourceAllocatedBucket = allocatedBucket!
    // 创建 ALLOCATED 桶的发货事件
    const allocatedEvent = await createShipEvent(
      {
        tenantId: params.tenantId,
        clientId: params.clientId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        batchNumber: sourceAllocatedBucket.batchNumber,
        lpn: sourceAllocatedBucket.lpn,
        asnNumber: sourceAllocatedBucket.asnNumber,
        expiryDate: sourceAllocatedBucket.expiryDate,
        quantity: fromAllocated,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        referenceNumber: params.referenceNumber,
        referenceLineId: params.referenceLineId,
        operatorId: params.operatorId,
        sourceBucketType: BucketType.ALLOCATED,
      },
      client
    )
    eventIds.push(allocatedEvent.id)
    Log.info('[Ship] 从ALLOCATED桶扣减', { quantity: fromAllocated, event_number: allocatedEvent.eventNumber })

      bucketUpdates.push({
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: sourceAllocatedBucket.batchNumber,
        lpn: sourceAllocatedBucket.lpn,
        asnNumber: sourceAllocatedBucket.asnNumber,
        expiryDate: sourceAllocatedBucket.expiryDate,
        bucketType: BucketType.ALLOCATED,
        quantityDelta: -fromAllocated,
      })
  }

  // 6. 批量更新桶
  await updateBucketsInTransaction(bucketUpdates, client)

  return {
    eventIds,
    fromPicking,
    fromAllocated,
  }
}

// 冻结参数
interface FreezeParams {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  quantity: number
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  expiryDate?: Date | null
  reasonCode?: string | null
  reasonDescription?: string | null
  referenceType?: string | null
  referenceId?: string | null
  operatorId?: string | null
}

/**
 * 冻结操作
 * 从 AVAILABLE 桶转移到 FROZEN 桶
 */
export async function freeze(params: FreezeParams, tx?: TransactionClient) {
  const client = tx || prisma

  // 检查 AVAILABLE 桶是否有足够库存
  const availableBucket = await getBucket({
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    locationId: params.locationId,
    skuId: params.skuId,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    asnNumber: params.asnNumber,
    expiryDate: params.expiryDate,
    bucketType: BucketType.AVAILABLE,
  })

  if (!availableBucket || availableBucket.quantity < params.quantity) {
    throw new Error(
      `可用库存不足: 需要 ${params.quantity}, 可用 ${availableBucket?.quantity || 0}`
    )
  }

  // 创建冻结事件
  await createFreezeEvents(
    {
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      expiryDate: params.expiryDate,
      quantity: params.quantity,
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      operatorId: params.operatorId,
    },
    client
  )

  // 更新桶状态
  await updateBucketsInTransaction(
    [
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        expiryDate: params.expiryDate,
        bucketType: BucketType.AVAILABLE,
        quantityDelta: -params.quantity,
      },
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        bucketType: BucketType.FROZEN,
        quantityDelta: params.quantity,
        fifoDate: availableBucket.fifoDate,
        expiryDate: availableBucket.expiryDate,
      },
    ],
    client
  )

  return { success: true }
}

/**
 * 解冻操作
 * 从 FROZEN 桶转移回 AVAILABLE 桶
 */
export async function unfreeze(params: FreezeParams, tx?: TransactionClient) {
  const client = tx || prisma

  // 检查 FROZEN 桶是否有足够库存
  const frozenBucket = await getBucket({
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    locationId: params.locationId,
    skuId: params.skuId,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    asnNumber: params.asnNumber,
    expiryDate: params.expiryDate,
    bucketType: BucketType.FROZEN,
  })

  if (!frozenBucket || frozenBucket.quantity < params.quantity) {
    throw new Error(
      `冻结库存不足: 需要 ${params.quantity}, 可用 ${frozenBucket?.quantity || 0}`
    )
  }

  // 创建解冻事件
  await createUnfreezeEvents(
    {
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      expiryDate: params.expiryDate,
      quantity: params.quantity,
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      operatorId: params.operatorId,
    },
    client
  )

  // 更新桶状态
  await updateBucketsInTransaction(
    [
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        expiryDate: params.expiryDate,
        bucketType: BucketType.FROZEN,
        quantityDelta: -params.quantity,
      },
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: params.clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        bucketType: BucketType.AVAILABLE,
        quantityDelta: params.quantity,
        fifoDate: frozenBucket.fifoDate,
        expiryDate: frozenBucket.expiryDate,
      },
    ],
    client
  )

  return { success: true }
}

// 移库参数
interface TransferParams {
  tenantId: string
  clientId?: string
  warehouseId: string
  sourceLocationId: string
  targetLocationId: string
  skuId: string
  skuCode: string
  quantity: number
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  bucketType?: BucketTypeValue
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  operatorId?: string | null
}

/**
 * 移库操作
 * 从源库位转移到目标库位
 */
export async function transfer(params: TransferParams, tx?: TransactionClient) {
  const client = tx || prisma
  const bucketType = params.bucketType || BucketType.AVAILABLE

  // 检查源库位是否有足够库存
  const sourceBucket = await getBucket({
    tenantId: params.tenantId,
    warehouseId: params.warehouseId,
    locationId: params.sourceLocationId,
    skuId: params.skuId,
    batchNumber: params.batchNumber,
    lpn: params.lpn,
    asnNumber: params.asnNumber,
    bucketType,
  })

  if (!sourceBucket || sourceBucket.quantity < params.quantity) {
    throw new Error(
      `源库位库存不足: 需要 ${params.quantity}, 可用 ${sourceBucket?.quantity || 0}`
    )
  }

  // 如果没有提供 clientId，从源桶中获取
  const clientId = params.clientId || sourceBucket.clientId

  // 创建移库事件
  await createTransferEvents(
    {
      tenantId: params.tenantId,
      clientId: clientId,
      warehouseId: params.warehouseId,
      sourceLocationId: params.sourceLocationId,
      targetLocationId: params.targetLocationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      bucketType,
      quantity: params.quantity,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      operatorId: params.operatorId,
    },
    client
  )

  // 更新桶状态
  await updateBucketsInTransaction(
    [
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.sourceLocationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        bucketType,
        quantityDelta: -params.quantity,
      },
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.targetLocationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        bucketType,
        quantityDelta: params.quantity,
        fifoDate: sourceBucket.fifoDate,
        expiryDate: sourceBucket.expiryDate,
      },
    ],
    client
  )

  return { success: true }
}

// 调整参数
interface AdjustParams {
  tenantId: string
  clientId?: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  bucketType: BucketTypeValue
  quantityDelta: number
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  expiryDate?: Date | null
  productionDate?: Date | null
  fifoDate?: Date | null
  reasonCode?: string | null
  reasonDescription?: string | null
  eventType?: InventoryEventTypeValue
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  operatorId?: string | null
}

/**
 * 库存调整操作
 * 直接调整指定桶的数量（用于盘点差异、损耗等）
 */
export async function adjust(params: AdjustParams, tx?: TransactionClient) {
  const client = tx || prisma

  // 如果没有提供 clientId，从 bucket 中获取
  let clientId = params.clientId
  if (!clientId) {
    const bucket = await getBucket({
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      bucketType: params.bucketType,
    })
    if (bucket) {
      clientId = bucket.clientId
    } else {
      throw new Error('无法找到对应的库存记录，无法确定客户ID')
    }
  }

  // 如果是减少库存，检查是否有足够库存
  if (params.quantityDelta < 0) {
    const bucket = await getBucket({
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      bucketType: params.bucketType,
    })

    if (!bucket || bucket.quantity < Math.abs(params.quantityDelta)) {
      throw new Error(
        `库存不足: 需要减少 ${Math.abs(params.quantityDelta)}, 可用 ${bucket?.quantity || 0}`
      )
    }
  }

  // 创建调整事件
  const event = await createAdjustEvent(
    {
      tenantId: params.tenantId,
      clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      expiryDate: params.expiryDate,
      productionDate: params.productionDate,
      fifoDate: params.fifoDate,
      bucketType: params.bucketType,
      quantityDelta: params.quantityDelta,
      eventType: params.eventType,
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      operatorId: params.operatorId,
    },
    client
  )

  // 更新桶状态
  await updateBucketsInTransaction(
    [
      {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        skuCode: params.skuCode,
        clientId: clientId,
        batchNumber: params.batchNumber,
        lpn: params.lpn,
        asnNumber: params.asnNumber,
        bucketType: params.bucketType,
        quantityDelta: params.quantityDelta,
      },
    ],
    client
  )

  return { eventId: event.id, eventNumber: event.eventNumber }
}

/**
 * 带锁的上架操作
 */
export async function putawayWithLock(params: PutawayParams) {
  return withLocationLock(params.tenantId, params.locationId, () =>
    prisma.$transaction((tx) => putaway(params, tx))
  )
}

/**
 * 带锁的移库操作
 */
export async function transferWithLock(params: TransferParams) {
  // 按固定顺序获取锁，避免死锁
  const [firstLoc, secondLoc] =
    params.sourceLocationId < params.targetLocationId
      ? [params.sourceLocationId, params.targetLocationId]
      : [params.targetLocationId, params.sourceLocationId]

  return withLocationLock(params.tenantId, firstLoc, () =>
    withLocationLock(params.tenantId, secondLoc, () =>
      prisma.$transaction((tx) => transfer(params, tx))
    )
  )
}
