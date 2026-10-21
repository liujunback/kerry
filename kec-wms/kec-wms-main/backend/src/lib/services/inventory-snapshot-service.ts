/**
 * 库存快照服务
 * 负责实时更新 InventorySnapshot 和 SkuInventorySummary
 *
 * 触发时机：
 * - 每次 InventoryBucket 更新后，异步更新对应的快照和汇总
 * - 通过 BullMQ 队列实现异步处理，避免阻塞主流程
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { Queue } from 'bullmq'
import { getQueueConnection } from '@/lib/queue/connection'
import { QUEUE_NAMES } from '@/lib/queue/config'
import { Log } from '@/lib/logger'
import { BucketType } from './inventory-event-service'
import { parse } from '@/lib/utils/date-formatter'

/**
 * 将 timezone-extension 转换的字符串转回 Date 对象
 * timezone-extension 使用格式: "yyyy-MM-dd HH:mm:ss"
 */
function parseDateString(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    // 解析 "yyyy-MM-dd HH:mm:ss" 格式
    return parse(value, 'yyyy-MM-dd HH:mm:ss', new Date())
  }
  return null
}

function toSnapshotGroupKey(params: {
  batchNumber?: string | null
  lpn?: string | null
  expiryDate?: Date | string | null
  asnNumber?: string | null
}) {
  const expiryDateStr = params.expiryDate
    ? (typeof params.expiryDate === 'string' ? params.expiryDate : params.expiryDate.toISOString())
    : ''
  return `${params.batchNumber || ''}|${params.lpn || ''}|${expiryDateStr}|${params.asnNumber || ''}`
}

// 快照更新任务数据
export interface SnapshotUpdateJobData {
  type?: 'LOCATION_SNAPSHOT' | 'SKU_SUMMARY'
  tenantId: string
  clientId?: string
  warehouseId?: string
  locationId?: string
  skuId?: string
  skuCode?: string
  batchNumber?: string | null
  lpn?: string | null
  userId?: string
  jobId?: string
}

// 快照更新队列（懒加载）
let snapshotQueue: Queue<SnapshotUpdateJobData> | null = null

function getSnapshotQueue(): Queue<SnapshotUpdateJobData> {
  if (!snapshotQueue) {
    snapshotQueue = new Queue<SnapshotUpdateJobData>(QUEUE_NAMES.INVENTORY_SNAPSHOT, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400 },
      },
    })
  }
  return snapshotQueue
}

/**
 * 触发快照更新（异步）
 * 在桶更新后调用此方法
 */
export async function triggerSnapshotUpdate(params: {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  batchNumber?: string | null
  lpn?: string | null
}): Promise<void> {
  const queue = getSnapshotQueue()

  // 添加两个任务：更新库位快照 + 更新SKU汇总
  await Promise.all([
    queue.add(
      'update-location-snapshot',
      {
        type: 'LOCATION_SNAPSHOT',
        ...params,
      },
      {
        // 使用去重键，避免短时间内重复更新同一快照
        jobId: `snapshot_${params.locationId}_${params.skuId}_${params.batchNumber || ''}_${params.lpn || ''}_${Date.now()}`,
      }
    ),
    queue.add(
      'update-sku-summary',
      {
        type: 'SKU_SUMMARY',
        ...params,
      },
      {
        jobId: `summary_${params.warehouseId}_${params.clientId}_${params.skuId}_${Date.now()}`,
      }
    ),
  ])
}

/**
 * 直接更新库位快照（同步）
 * 从 InventoryBucket 聚合数据到 InventorySnapshot
 */
export async function updateLocationSnapshot(params: {
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  batchNumber?: string | null
  lpn?: string | null
}): Promise<void> {
  const { tenantId, clientId, warehouseId, locationId, skuId, skuCode, batchNumber, lpn } = params

  Log.debug('[InventorySnapshot] 开始更新库位快照', {
    location_id: locationId,
    sku_id: skuId,
    batch_number: batchNumber,
    lpn,
  })

  // 构建查询条件 - 只按 tenantId + locationId + skuId 查询，不过滤 batchNumber/lpn
  // 这样可以查到该库位+SKU下所有批次的数据
  const whereCondition: Record<string, unknown> = {
    tenantId,
    locationId,
    skuId,
  }

  Log.debug('[InventorySnapshot] 查询条件', { where: whereCondition })

  // 查询该库位+SKU 下所有桶的数量
  const buckets = await prisma.inventoryBucket.findMany({
    where: whereCondition,
    select: {
      bucketType: true,
      quantity: true,
      zoneId: true,
      expiryDate: true,
      productionDate: true,
      fifoDate: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
    },
  })

  Log.debug('[InventorySnapshot] 查询到的桶数据', {
    bucket_count: buckets.length,
    total_quantity: buckets.reduce((sum, b) => sum + b.quantity, 0),
  })

  // 如果没有桶数据，删除该库位+SKU的所有快照
  if (buckets.length === 0) {
    await prisma.inventorySnapshot.deleteMany({
      where: { locationId, skuId },
    })
    return
  }

  // 按 batchNumber + lpn + expiryDate + asnNumber 分组聚合
  const groupedData = new Map<string, {
    batchNumber: string
    lpn: string
    asnNumber: string
    expiryDate: Date | null
    productionDate: Date | null
    fifoDate: Date | null
    zoneId: string
    quantities: Record<string, number>
  }>()

  for (const bucket of buckets) {
    const key = toSnapshotGroupKey({
      batchNumber: bucket.batchNumber,
      lpn: bucket.lpn,
      expiryDate: bucket.expiryDate,
      asnNumber: bucket.asnNumber,
    })

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        batchNumber: bucket.batchNumber || '',
        lpn: bucket.lpn || '',
        asnNumber: bucket.asnNumber || '',
        // 将时区扩展转换的字符串转回 Date 对象
        expiryDate: parseDateString(bucket.expiryDate),
        productionDate: parseDateString(bucket.productionDate),
        fifoDate: parseDateString(bucket.fifoDate),
        zoneId: bucket.zoneId || '',
        quantities: {},
      })
    }

    const group = groupedData.get(key)!
    group.quantities[bucket.bucketType] = (group.quantities[bucket.bucketType] || 0) + bucket.quantity
    if (bucket.zoneId) group.zoneId = bucket.zoneId
    if (bucket.productionDate) group.productionDate = parseDateString(bucket.productionDate)
    if (bucket.fifoDate) group.fifoDate = parseDateString(bucket.fifoDate)
  }

  const activeGroupKeys = new Set<string>()
  for (const [key, group] of groupedData.entries()) {
    const qtyAvailable = group.quantities[BucketType.AVAILABLE] || 0
    const qtyAllocated = group.quantities[BucketType.ALLOCATED] || 0
    const qtyPicking = group.quantities[BucketType.PICKING] || 0
    const qtyFrozen = group.quantities[BucketType.FROZEN] || 0
    const qtyDefective = group.quantities[BucketType.DEFECTIVE] || 0
    const qtyQcHold = group.quantities[BucketType.QC_HOLD] || 0
    const totalOnHand = qtyAvailable + qtyAllocated + qtyPicking + qtyFrozen + qtyDefective + qtyQcHold
    if (totalOnHand > 0) {
      activeGroupKeys.add(key)
    }
  }

  const existingSnapshots = await prisma.inventorySnapshot.findMany({
    where: {
      locationId,
      skuId,
    },
    select: {
      id: true,
      batchNumber: true,
      lpn: true,
      expiryDate: true,
      asnNumber: true,
    },
  })
  const staleSnapshotIds = existingSnapshots
    .filter((snapshot) => !activeGroupKeys.has(toSnapshotGroupKey(snapshot)))
    .map((snapshot) => snapshot.id)

  if (staleSnapshotIds.length > 0) {
    await prisma.inventorySnapshot.deleteMany({
      where: {
        id: {
          in: staleSnapshotIds,
        },
      },
    })
  }

  // 为每个分组创建/更新快照
  for (const [, group] of groupedData) {
    const qtyAvailable = group.quantities[BucketType.AVAILABLE] || 0
    const qtyAllocated = group.quantities[BucketType.ALLOCATED] || 0
    const qtyPicking = group.quantities[BucketType.PICKING] || 0
    const qtyFrozen = group.quantities[BucketType.FROZEN] || 0
    const qtyDefective = group.quantities[BucketType.DEFECTIVE] || 0
    const qtyQcHold = group.quantities[BucketType.QC_HOLD] || 0
    const totalOnHand = qtyAvailable + qtyAllocated + qtyPicking + qtyFrozen + qtyDefective + qtyQcHold

    // 跳过数量为0的分组
    if (totalOnHand === 0) continue

    // 查找现有快照
    const existingSnapshot = await prisma.inventorySnapshot.findFirst({
      where: {
        locationId,
        skuId,
        batchNumber: group.batchNumber,
        lpn: group.lpn,
        expiryDate: group.expiryDate,
        asnNumber: group.asnNumber,
      },
    })

    if (existingSnapshot) {
      Log.debug('[InventorySnapshot] 更新现有快照', { snapshot_id: existingSnapshot.id, batch_number: group.batchNumber, asn_number: group.asnNumber, total_on_hand: totalOnHand })
      await prisma.inventorySnapshot.update({
        where: { id: existingSnapshot.id },
        data: {
          qtyAvailable,
          qtyAllocated,
          qtyPicking,
          qtyFrozen,
          qtyDefective,
          qtyQcHold,
          totalOnHand,
          productionDate: group.productionDate,
          fifoDate: group.fifoDate,
        },
      })
    } else {
      Log.debug('[InventorySnapshot] 创建新快照', { batch_number: group.batchNumber, asn_number: group.asnNumber, total_on_hand: totalOnHand })
      await prisma.inventorySnapshot.create({
        data: {
          tenantId,
          clientId,
          warehouseId,
          zoneId: group.zoneId,
          locationId,
          skuId,
          skuCode,
          batchNumber: group.batchNumber,
          lpn: group.lpn,
          asnNumber: group.asnNumber,
          qtyAvailable,
          qtyAllocated,
          qtyPicking,
          qtyFrozen,
          qtyDefective,
          qtyQcHold,
          totalOnHand,
          expiryDate: group.expiryDate,
          productionDate: group.productionDate,
          fifoDate: group.fifoDate,
        },
      })
    }
  }

  Log.debug('[InventorySnapshot] 快照更新完成')
}

/**
 * 直接更新SKU汇总（同步）
 * 从 InventoryBucket 聚合数据到 SkuInventorySummary
 */
export async function updateSkuSummary(params: {
  tenantId: string
  clientId?: string
  warehouseId: string
  skuId: string
  skuCode: string
}): Promise<void> {
  const { tenantId, warehouseId, skuId, skuCode } = params
  let { clientId } = params

  // 如果没有提供 clientId，从 bucket 中获取
  if (!clientId) {
    const bucket = await prisma.inventoryBucket.findFirst({
      where: {
        tenantId,
        warehouseId,
        skuId,
      },
      select: { clientId: true },
    })
    if (bucket) {
      clientId = bucket.clientId
    } else {
      Log.warning('[InventorySnapshot] 无法找到对应的库存记录，跳过汇总更新')
      return
    }
  }

  // 按桶类型聚合该SKU在仓库中的所有库存
  const result = await prisma.inventoryBucket.groupBy({
    by: ['bucketType'],
    where: {
      tenantId,
      clientId,
      warehouseId,
      skuId,
    },
    _sum: {
      quantity: true,
    },
  })

  const quantities: Record<string, number> = {}
  for (const item of result) {
    quantities[item.bucketType] = item._sum.quantity || 0
  }

  const qtyAvailable = quantities[BucketType.AVAILABLE] || 0
  const qtyAllocated = quantities[BucketType.ALLOCATED] || 0
  const qtyPicking = quantities[BucketType.PICKING] || 0
  const qtyFrozen = quantities[BucketType.FROZEN] || 0
  const qtyDefective = quantities[BucketType.DEFECTIVE] || 0
  const totalOnHand =
    qtyAvailable + qtyAllocated + qtyPicking + qtyFrozen + qtyDefective

  // 统计库位数量
  const locationCount = await prisma.inventoryBucket.groupBy({
    by: ['locationId'],
    where: {
      tenantId,
      clientId,
      warehouseId,
      skuId,
      quantity: { gt: 0 },
    },
  })

  // 查询最早到期日期
  const earliestExpiry = await prisma.inventoryBucket.findFirst({
    where: {
      tenantId,
      clientId,
      warehouseId,
      skuId,
      quantity: { gt: 0 },
      expiryDate: { not: null },
    },
    orderBy: { expiryDate: 'asc' },
    select: { expiryDate: true },
  })

  // 如果总数量为0，删除汇总记录
  if (totalOnHand === 0) {
    await prisma.skuInventorySummary.deleteMany({
      where: {
        tenantId,
        clientId,
        warehouseId,
        skuId,
      },
    })
    return
  }

  // 处理 timezone-extension 转换后的字符串日期
  const earliestExpiryDate = parseDateString(earliestExpiry?.expiryDate)

  // 更新或创建汇总
  await prisma.skuInventorySummary.upsert({
    where: {
      warehouseId_clientId_skuId: {
        warehouseId,
        clientId,
        skuId,
      },
    },
    create: {
      tenantId,
      clientId,
      warehouseId,
      skuId,
      skuCode,
      qtyAvailable,
      qtyAllocated,
      qtyPicking,
      qtyFrozen,
      qtyDefective,
      totalOnHand,
      locationCount: locationCount.length,
      earliestExpiryDate,
    },
    update: {
      qtyAvailable,
      qtyAllocated,
      qtyPicking,
      qtyFrozen,
      qtyDefective,
      totalOnHand,
      locationCount: locationCount.length,
      earliestExpiryDate,
    },
  })
}

/**
 * 触发批量快照生成（异步）
 * 用于初始化或修复快照数据
 */
export async function triggerBatchSnapshotGeneration(params: {
  tenantId: string
  userId: string
  warehouseId?: string
}): Promise<string> {
  const queue = getSnapshotQueue()
  const jobId = `batch-snapshot_${params.tenantId}_${Date.now()}`

  await queue.add(
    'batch-snapshot',
    {
      tenantId: params.tenantId,
      userId: params.userId,
      jobId,
      warehouseId: params.warehouseId,
    },
    { jobId }
  )

  return jobId
}
