/**
 * 库存桶服务
 * 管理库存桶（InventoryBucket）的 CRUD 操作
 *
 * 库存桶是按维度聚合的库存状态视图：
 * - 维度：租户 + 仓库 + 库区 + 库位 + SKU + 批次 + LPN + 桶类型
 * - 每个桶记录该维度下的当前数量
 * - 桶的数量通过事件累加计算得出
 */

import crypto from 'crypto'
import { prisma, prismaRead, type TransactionClient } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { bucketResource, withBucketLock, withInventoryLocks } from './inventory-lock-service'
import { BucketType, type BucketTypeValue } from './inventory-event-service'
import { triggerSnapshotUpdate, updateLocationSnapshot, updateSkuSummary } from './inventory-snapshot-service'
import { assertInventoryCountUnlocked } from './inventory-count-lock-guard'
import { Log } from '@/lib/logger'

// 桶标识参数
export interface BucketIdentifier {
  tenantId: string
  warehouseId: string
  locationId: string
  skuId: string
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  expiryDate?: Date | null
  bucketType: BucketTypeValue
}

// 桶更新参数
export interface BucketUpdateParams extends BucketIdentifier {
  clientId: string
  skuCode: string
  zoneId?: string | null
  quantityDelta: number
  expiryDate?: Date | null
  productionDate?: Date | null
  fifoDate?: Date | null
}

interface UpdateBucketsOptions {
  skipLocks?: boolean
  skipCountLocks?: boolean
}

function getAvailableBucketOrderBy(
  strategy: 'FIFO' | 'FEFO' | 'LIFO'
): Prisma.InventoryBucketOrderByWithRelationInput[] {
  switch (strategy) {
    case 'FEFO':
      return [
        { expiryDate: 'asc' },
        { fifoDate: 'asc' },
        { asnNumber: 'asc' },
      ]
    case 'LIFO':
      return [
        { fifoDate: 'desc' },
        { asnNumber: 'desc' },
      ]
    case 'FIFO':
    default:
      return [
        { fifoDate: 'asc' },
        { asnNumber: 'asc' },
      ]
  }
}

/**
 * 标准化日期：将毫秒部分清零
 * MySQL DateTime 类型只存储到秒级，但 JavaScript Date 是毫秒级
 * 如果不清零毫秒，会导致 findFirst 查询找不到匹配记录，但创建时触发唯一约束冲突
 *
 * 注意：由于 timezone-extension 的作用，从数据库读取的日期可能是字符串格式
 */
function normalizeDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null
  // 处理字符串和 Date 对象两种情况
  const normalized = date instanceof Date ? new Date(date) : new Date(date)
  // 检查日期是否有效
  if (isNaN(normalized.getTime())) return null
  normalized.setMilliseconds(0)
  return normalized
}

function toExpiryDateKey(date: Date | string | null | undefined) {
  const normalized = normalizeDate(date)
  return normalized ? normalized.toISOString().slice(0, 10) : '1000-01-01'
}

/**
 * 获取或创建库存桶
 * 更新后会异步触发快照更新
 */
export async function getOrCreateBucket(
  params: BucketUpdateParams,
  tx?: TransactionClient,
  skipSnapshotUpdate?: boolean
) {
  const client = tx || prisma

  // 如果没有提供 zoneId，从 binLocation 获取
  // 注意：Prisma 模型名是 binLocation，对应数据库表 location
  let zoneId = params.zoneId
  if (!zoneId) {
    const location = await prismaRead.binLocation.findUnique({
      where: { id: params.locationId },
      select: { zoneId: true },
    })
    zoneId = location?.zoneId || ''
  }

  // 标准化 expiryDate，清零毫秒部分，确保与 MySQL 存储精度一致
  const normalizedExpiryDate = normalizeDate(params.expiryDate)

  // 使用 upsert 保证原子性，避免并发创建时的唯一约束冲突
  // 唯一约束：[locationId, skuId, batchNumber, lpn, expiryDate, bucketType, asnNumber]
  const batchNumber = params.batchNumber || ''
  const lpn = params.lpn || ''
  const asnNumber = params.asnNumber || ''
  const expiryDateKey = toExpiryDateKey(normalizedExpiryDate)

  Log.debug('[InventoryBucket] upsert 桶', {
    location_id: params.locationId,
    sku_id: params.skuId,
    batch_number: batchNumber,
    lpn: lpn,
    asn_number: asnNumber,
    expiry_date: normalizedExpiryDate,
    bucket_type: params.bucketType,
    quantity_delta: params.quantityDelta,
  })

  // 如果是扣减操作，需要先检查库存是否足够
  if (params.quantityDelta < 0) {
    const existingBucket = await client.inventoryBucket.findFirst({
      where: {
        locationId: params.locationId,
        skuId: params.skuId,
        batchNumber: batchNumber,
        lpn: lpn,
        asnNumber: asnNumber,
        expiryDate: normalizedExpiryDate,
        bucketType: params.bucketType,
      },
    })

    if (!existingBucket) {
      throw new Error(
        `库存桶不存在: SKU ${params.skuCode}, 桶类型 ${params.bucketType}, 无法扣减库存`
      )
    }

    const newQuantity = existingBucket.quantity + params.quantityDelta
    if (newQuantity < 0) {
      throw new Error(
        `库存桶数量不足: SKU ${params.skuCode}, 桶类型 ${params.bucketType}, ` +
        `当前数量 ${existingBucket.quantity}, 尝试扣减 ${Math.abs(params.quantityDelta)}, ` +
        `结果为 ${newQuantity}`
      )
    }
  }

  // 使用 MySQL 原生 INSERT ... ON DUPLICATE KEY UPDATE 实现原子性 upsert
  // 这解决了 REPEATABLE READ 隔离级别下的并发问题：
  // - 普通 try-catch 模式：创建冲突后 findFirst 可能因事务快照看不到新记录
  // - 原生 SQL：INSERT ON DUPLICATE KEY UPDATE 是原子操作，不受事务隔离级别影响
  if (params.quantityDelta < 0) {
    const affectedRows = await client.$executeRaw`
      UPDATE inventory_bucket
      SET quantity = quantity + ${params.quantityDelta},
          version = version + 1,
          updated_at = NOW()
      WHERE location_id = ${params.locationId}
        AND sku_id = ${params.skuId}
        AND batch_number = ${batchNumber}
        AND lpn = ${lpn}
        AND asn_number = ${asnNumber}
        AND expiry_date_key = ${expiryDateKey}
        AND bucket_type = ${params.bucketType}
        AND quantity >= ${Math.abs(params.quantityDelta)}
    `

    if (affectedRows === 0) {
      const latestBucket = await client.inventoryBucket.findFirst({
        where: {
          locationId: params.locationId,
          skuId: params.skuId,
          batchNumber,
          lpn,
          asnNumber,
          expiryDate: normalizedExpiryDate,
          bucketType: params.bucketType,
        },
        select: {
          quantity: true,
        },
      })

      if (!latestBucket) {
        throw new Error(
          `库存桶不存在: SKU ${params.skuCode}, 桶类型 ${params.bucketType}, 无法扣减库存`
        )
      }

      const newQuantity = latestBucket.quantity + params.quantityDelta
      throw new Error(
        `库存桶数量不足: SKU ${params.skuCode}, 桶类型 ${params.bucketType}, ` +
        `当前数量 ${latestBucket.quantity}, 尝试扣减 ${Math.abs(params.quantityDelta)}, ` +
        `结果为 ${newQuantity}`
      )
    }
  }

  const bucketId = crypto.randomUUID()
  const now = new Date()
  const fifoDate = params.fifoDate instanceof Date ? params.fifoDate : now

  const existingRows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM inventory_bucket
    WHERE location_id = ${params.locationId}
      AND sku_id = ${params.skuId}
      AND batch_number = ${batchNumber}
      AND lpn = ${lpn}
      AND asn_number = ${asnNumber}
      AND expiry_date_key = ${expiryDateKey}
      AND bucket_type = ${params.bucketType}
    LIMIT 1
    FOR UPDATE
  `

  // 执行原子性更新/插入。使用 expiry_date_key 规避 MySQL NULL 唯一键不冲突问题。
  if (params.quantityDelta >= 0) {
    if (existingRows.length > 0) {
      await client.$executeRaw`
        UPDATE inventory_bucket
        SET quantity = quantity + ${params.quantityDelta},
            version = version + 1,
            updated_at = ${now}
        WHERE id = ${existingRows[0].id}
      `
    } else {
      await client.$executeRaw`
        INSERT INTO inventory_bucket (
          id, tenant_id, client_id, warehouse_id, zone_id, location_id,
          sku_id, sku_code, batch_number, lpn, asn_number, bucket_type,
          quantity, expiry_date, production_date, fifo_date, version,
          created_at, updated_at
        ) VALUES (
          ${bucketId}, ${params.tenantId}, ${params.clientId}, ${params.warehouseId},
          ${zoneId || ''}, ${params.locationId}, ${params.skuId}, ${params.skuCode},
          ${batchNumber}, ${lpn}, ${asnNumber}, ${params.bucketType},
          ${params.quantityDelta}, ${normalizedExpiryDate}, ${params.productionDate || null},
          ${fifoDate}, 1, ${now}, ${now}
        )
      `
    }
  }

  // 查询最新的桶数据返回
  // 使用 FOR UPDATE 强制读取当前提交的数据，而不是事务开始时的快照
  // 这解决了 REPEATABLE READ 隔离级别下，INSERT ON DUPLICATE KEY UPDATE 后
  // 普通 SELECT 可能因 MVCC 看不到刚插入/更新的记录的问题
  const bucketRows = await client.$queryRaw<Array<{
    id: string
    quantity: number
    version: number
  }>>`
    SELECT id, quantity, version
    FROM inventory_bucket
    WHERE location_id = ${params.locationId}
      AND sku_id = ${params.skuId}
      AND batch_number = ${batchNumber}
      AND lpn = ${lpn}
      AND asn_number = ${asnNumber}
      AND expiry_date_key = ${expiryDateKey}
      AND bucket_type = ${params.bucketType}
    FOR UPDATE
  `

  if (bucketRows.length === 0) {
    // 这种情况理论上不应该发生，因为刚刚执行了 upsert
    // 增加更多调试信息
    Log.error('[InventoryBucket] upsert 后查询失败', {
      location_id: params.locationId,
      sku_id: params.skuId,
      sku_code: params.skuCode,
      batch_number: batchNumber,
      lpn: lpn,
      asn_number: asnNumber,
      expiry_date: normalizedExpiryDate?.toISOString(),
      bucket_type: params.bucketType,
    })
    throw new Error(`库存桶操作异常: SKU ${params.skuCode}, 桶类型 ${params.bucketType}`)
  }

  // 用原生查询结果构造返回对象（只返回需要的字段）
  const bucket = {
    id: bucketRows[0].id,
    quantity: bucketRows[0].quantity,
    version: bucketRows[0].version,
  }

  Log.debug('[InventoryBucket] 原子 upsert 成功', {
    bucket_id: bucket.id,
    quantity: bucket.quantity,
  })

  // 异步触发快照更新（不阻塞主流程）
  if (!skipSnapshotUpdate && !tx) {
    // 只在非事务模式下触发，事务模式由调用方统一触发
    triggerSnapshotUpdate({
      tenantId: params.tenantId,
      clientId: params.clientId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      skuCode: params.skuCode,
      batchNumber: params.batchNumber || '',
      lpn: params.lpn || '',
    }).catch(async (err) => {
      Log.error('[InventoryBucket] 触发快照异步更新失败，尝试同步更新', { error: err })
      try {
        await Promise.all([
          updateLocationSnapshot({
            tenantId: params.tenantId,
            clientId: params.clientId,
            warehouseId: params.warehouseId,
            locationId: params.locationId,
            skuId: params.skuId,
            skuCode: params.skuCode,
            batchNumber: params.batchNumber || '',
            lpn: params.lpn || '',
          }),
          updateSkuSummary({
            tenantId: params.tenantId,
            clientId: params.clientId,
            warehouseId: params.warehouseId,
            skuId: params.skuId,
            skuCode: params.skuCode,
          }),
        ])
        Log.debug('[InventoryBucket] 同步快照更新成功')
      } catch (syncErr) {
        Log.error('[InventoryBucket] 同步快照更新也失败', { error: syncErr })
      }
    })
  }

  return bucket
}

/**
 * 更新库存桶数量（带锁）
 */
export async function updateBucketQuantity(
  params: BucketUpdateParams,
  tx?: TransactionClient
) {
  return withBucketLock(
    {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber || '',
      lpn: params.lpn || '',
      bucketType: params.bucketType,
    },
    async () => {
      return getOrCreateBucket(params, tx)
    }
  )
}

/**
 * 批量更新库存桶
 * 无论是否在外部事务中，都会自动触发快照更新
 * 调用方无需手动触发
 */
export async function updateBucketsInTransaction(
  updates: BucketUpdateParams[],
  tx?: TransactionClient,
  options: UpdateBucketsOptions = {}
) {
  const client = tx || prisma
  if (updates.length === 0) {
    return []
  }

  // 按锁键排序，避免死锁
  const sortedUpdates = [...updates].sort((a, b) => {
    const keyA = `${a.tenantId}:${a.warehouseId}:${a.locationId}:${a.skuId}:${a.batchNumber || ''}:${a.lpn || ''}:${a.asnNumber || ''}:${normalizeDate(a.expiryDate)?.toISOString() || ''}:${a.bucketType}`
    const keyB = `${b.tenantId}:${b.warehouseId}:${b.locationId}:${b.skuId}:${b.batchNumber || ''}:${b.lpn || ''}:${b.asnNumber || ''}:${normalizeDate(b.expiryDate)?.toISOString() || ''}:${b.bucketType}`
    return keyA.localeCompare(keyB)
  })

  const lockResources = sortedUpdates.map((update) =>
    bucketResource({
      tenantId: update.tenantId,
      warehouseId: update.warehouseId,
      locationId: update.locationId,
      skuId: update.skuId,
      batchNumber: update.batchNumber,
      lpn: update.lpn,
      asnNumber: update.asnNumber,
      expiryDate: update.expiryDate,
      bucketType: update.bucketType,
    })
  )

  const runUpdates = async () => {
    const bucketResults = []
    for (const update of sortedUpdates) {
      if (!options.skipCountLocks) {
        await assertInventoryCountUnlocked({
          tenantId: update.tenantId,
          warehouseId: update.warehouseId,
          locationId: update.locationId,
          skuId: update.skuId,
          bucketType: update.bucketType,
          clientId: update.clientId,
        })
      }
      const result = await getOrCreateBucket(update, client, true)
      bucketResults.push(result)
    }
    return bucketResults
  }

  const results = options.skipLocks
    ? await runUpdates()
    : await withInventoryLocks(lockResources, runUpdates)

  // 收集去重后的快照参数
  const uniqueKeys = new Set<string>()
  const snapshotParams: Parameters<typeof triggerSnapshotUpdate>[0][] = []
  for (const update of sortedUpdates) {
    const key = `${update.locationId}:${update.skuId}:${update.batchNumber || ''}:${update.lpn || ''}`
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key)
      snapshotParams.push({
        tenantId: update.tenantId,
        clientId: update.clientId,
        warehouseId: update.warehouseId,
        locationId: update.locationId,
        skuId: update.skuId,
        skuCode: update.skuCode,
        batchNumber: update.batchNumber,
        lpn: update.lpn,
      })
    }
  }

  // 用 setImmediate 延迟到当前调用栈结束后触发
  // BullMQ worker 异步处理，读 DB 时外部事务必然已提交
  setImmediate(() => {
    for (const params of snapshotParams) {
      triggerSnapshotUpdate(params).catch(async (err) => {
        Log.error('[InventoryBucket] 触发快照异步更新失败，尝试同步更新', { error: err })
        // 如果异步更新失败，立即执行同步更新
        try {
          await Promise.all([
            updateLocationSnapshot(params),
            updateSkuSummary({
              tenantId: params.tenantId,
              clientId: params.clientId,
              warehouseId: params.warehouseId,
              skuId: params.skuId,
              skuCode: params.skuCode,
            }),
          ])
          Log.debug('[InventoryBucket] 同步快照更新成功')
        } catch (syncErr) {
          Log.error('[InventoryBucket] 同步快照更新也失败', { error: syncErr })
        }
      })
    }
  })

  return results
}

/**
 * 获取库存桶
 * 注意：batchNumber/lpn 必须使用空字符串而不是 null
 * 因为 MySQL 唯一约束认为 NULL != NULL，会导致创建重复记录
 *
 * 查询时同时匹配 null 和空字符串，兼容历史数据
 */
export async function getBucket(params: BucketIdentifier) {
  const batchNumber = params.batchNumber || ''
  const lpn = params.lpn || ''
  const asnNumber = params.asnNumber || ''

  // 标准化 expiryDate，清零毫秒部分
  const normalizedExpiryDate = normalizeDate(params.expiryDate)

  // 直接查询，expiryDate 为 null 时需要精确匹配 NULL
  const where: Prisma.InventoryBucketWhereInput = {
    tenantId: params.tenantId,
    locationId: params.locationId,
    skuId: params.skuId,
    batchNumber: batchNumber,
    lpn: lpn,
    asnNumber: asnNumber,
    expiryDate: normalizedExpiryDate,
    bucketType: params.bucketType,
  }

  return prisma.inventoryBucket.findFirst({ where })
}

/**
 * 获取库位下所有桶
 */
export async function getBucketsByLocation(
  tenantId: string,
  locationId: string,
  bucketType?: BucketTypeValue
) {
  const where: Prisma.InventoryBucketWhereInput = {
    tenantId,
    locationId,
    quantity: { gt: 0 },
  }

  if (bucketType) {
    where.bucketType = bucketType
  }

  return prisma.inventoryBucket.findMany({
    where,
    orderBy: [{ skuCode: 'asc' }, { batchNumber: 'asc' }],
  })
}

/**
 * 获取 SKU 在仓库中的所有桶
 */
export async function getBucketsBySku(
  tenantId: string,
  warehouseId: string,
  skuId: string,
  bucketType?: BucketTypeValue
) {
  const where: Prisma.InventoryBucketWhereInput = {
    tenantId,
    warehouseId,
    skuId,
    quantity: { gt: 0 },
  }

  if (bucketType) {
    where.bucketType = bucketType
  }

  return prisma.inventoryBucket.findMany({
    where,
    orderBy: [{ fifoDate: 'asc' }, { expiryDate: 'asc' }],
  })
}

/**
 * 获取可用库存（AVAILABLE 桶）
 * 按分配策略排序，支持效期筛选
 */
export async function getAvailableBuckets(params: {
  tenantId: string
  warehouseId: string
  skuId: string
  clientId?: string
  strategy?: 'FIFO' | 'FEFO' | 'LIFO'
  minQuantity?: number
  /** 精确匹配效期 */
  expiryDate?: Date | null
}) {
  const {
    tenantId,
    warehouseId,
    skuId,
    clientId,
    strategy = 'FIFO',
    minQuantity = 1,
    expiryDate,
  } = params

  const where: Prisma.InventoryBucketWhereInput = {
    tenantId,
    warehouseId,
    skuId,
    bucketType: BucketType.AVAILABLE,
    quantity: { gte: minQuantity },
  }

  if (clientId) {
    where.clientId = clientId
  }

  // 效期筛选条件
  if (expiryDate) {
    where.expiryDate = expiryDate
  }

  return prisma.inventoryBucket.findMany({
    where,
    orderBy: getAvailableBucketOrderBy(strategy),
    include: {
      location: {
        select: { locationCode: true, locationType: true },
      },
    },
  })
}

/**
 * 汇总 SKU 库存
 */
export async function summarizeSkuInventory(
  tenantId: string,
  warehouseId: string,
  skuId: string,
  clientId?: string
) {
  const where: Prisma.InventoryBucketWhereInput = {
    tenantId,
    warehouseId,
    skuId,
  }

  if (clientId) {
    where.clientId = clientId
  }

  const result = await prisma.inventoryBucket.groupBy({
    by: ['bucketType'],
    where,
    _sum: {
      quantity: true,
    },
  })

  const summary: Record<string, number> = {}
  for (const item of result) {
    summary[item.bucketType] = item._sum.quantity || 0
  }

  return {
    available: summary[BucketType.AVAILABLE] || 0,
    allocated: summary[BucketType.ALLOCATED] || 0,
    picking: summary[BucketType.PICKING] || 0,
    frozen: summary[BucketType.FROZEN] || 0,
    defective: summary[BucketType.DEFECTIVE] || 0,
    qcHold: summary[BucketType.QC_HOLD] || 0,
    countHold: summary[BucketType.COUNT_HOLD] || 0,
    countSurplus: summary[BucketType.COUNT_SURPLUS] || 0,
    countShortage: summary[BucketType.COUNT_SHORTAGE] || 0,
    total:
      (summary[BucketType.AVAILABLE] || 0) +
      (summary[BucketType.ALLOCATED] || 0) +
      (summary[BucketType.PICKING] || 0) +
      (summary[BucketType.FROZEN] || 0) +
      (summary[BucketType.DEFECTIVE] || 0) +
      (summary[BucketType.QC_HOLD] || 0) +
      (summary[BucketType.COUNT_HOLD] || 0),
  }
}

/**
 * 检查库存是否充足
 */
export async function checkInventoryAvailability(params: {
  tenantId: string
  warehouseId: string
  skuId: string
  clientId?: string
  requiredQuantity: number
}): Promise<{ sufficient: boolean; available: number; shortage: number }> {
  const summary = await summarizeSkuInventory(
    params.tenantId,
    params.warehouseId,
    params.skuId,
    params.clientId
  )

  const available = summary.available
  const shortage = Math.max(0, params.requiredQuantity - available)

  return {
    sufficient: available >= params.requiredQuantity,
    available,
    shortage,
  }
}
