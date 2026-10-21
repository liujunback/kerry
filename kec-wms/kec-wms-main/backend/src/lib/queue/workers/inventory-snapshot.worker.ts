/**
 * 库存快照更新 Worker
 *
 * 两种模式：
 * 1. 实时更新：处理单个库位/SKU的快照更新（由桶服务触发）
 * 2. 批量生成：定期从 InventoryBucket 生成全量 InventorySnapshot
 *
 * 快照用途：
 * - 加速历史库存查询
 * - 支持库存对账和审计
 * - 提供时间点库存视图
 */

import { Job } from 'bullmq'
import { BaseWorker } from './base-worker'
import { prisma } from '@/lib/db/prisma'
import { JobContext } from '../types'
import { BucketType } from '@/lib/services/inventory-event-service'
import {
  updateLocationSnapshot,
  updateSkuSummary,
  type SnapshotUpdateJobData,
} from '@/lib/services/inventory-snapshot-service'

// 批量快照任务数据
interface BatchSnapshotJobData {
  tenantId: string
  userId: string
  jobId: string
  warehouseId?: string
  snapshotDate?: string
}

// 任务数据类型（实时更新 或 批量生成）
type SnapshotJobData = SnapshotUpdateJobData | BatchSnapshotJobData

interface SnapshotJobResult {
  snapshotsCreated: number
  bucketsProcessed: number
  duration: number
}

// 类型守卫：判断是否为实时更新任务
function isRealtimeUpdate(data: SnapshotJobData): data is SnapshotUpdateJobData {
  return 'type' in data && (data.type === 'LOCATION_SNAPSHOT' || data.type === 'SKU_SUMMARY')
}

export class InventorySnapshotWorker extends BaseWorker<SnapshotJobData, SnapshotJobResult> {
  protected async process(
    job: Job<SnapshotJobData, SnapshotJobResult>,
    context: JobContext
  ): Promise<SnapshotJobResult> {
    const startTime = Date.now()

    console.log('[InventorySnapshotWorker] 开始处理任务:', {
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    })

    // 判断任务类型：实时更新 或 批量生成
    if (isRealtimeUpdate(job.data)) {
      console.log('[InventorySnapshotWorker] 任务类型: 实时更新')
      return this.processRealtimeUpdate(job.data, startTime)
    }

    // 批量生成快照
    console.log('[InventorySnapshotWorker] 任务类型: 批量生成')
    return this.processBatchSnapshot(job.data as BatchSnapshotJobData, context, startTime)
  }

  /**
   * 处理实时快照更新
   */
  private async processRealtimeUpdate(
    data: SnapshotUpdateJobData,
    startTime: number
  ): Promise<SnapshotJobResult> {
    try {
      console.log('[InventorySnapshotWorker] 处理实时更新任务:', data.type, data.skuId, data.locationId)
      if (data.type === 'LOCATION_SNAPSHOT') {
        console.log('[InventorySnapshotWorker] 更新库位快照:', {
          locationId: data.locationId,
          skuId: data.skuId,
          clientId: data.clientId,
        })
        await updateLocationSnapshot({
          tenantId: data.tenantId,
          clientId: data.clientId!,
          warehouseId: data.warehouseId!,
          locationId: data.locationId!,
          skuId: data.skuId!,
          skuCode: data.skuCode!,
          batchNumber: data.batchNumber,
          lpn: data.lpn,
        })
        console.log('[InventorySnapshotWorker] 库位快照更新成功')
      } else if (data.type === 'SKU_SUMMARY') {
        console.log('[InventorySnapshotWorker] 更新SKU汇总:', {
          skuId: data.skuId,
          clientId: data.clientId,
        })
        await updateSkuSummary({
          tenantId: data.tenantId,
          clientId: data.clientId!,
          warehouseId: data.warehouseId!,
          skuId: data.skuId!,
          skuCode: data.skuCode!,
        })
        console.log('[InventorySnapshotWorker] SKU汇总更新成功')
      }

      return {
        snapshotsCreated: 1,
        bucketsProcessed: 1,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      console.error('[InventorySnapshotWorker] 实时更新失败:', error)
      throw error
    }
  }

  /**
   * 处理批量快照生成
   */
  private async processBatchSnapshot(
    data: BatchSnapshotJobData,
    context: JobContext,
    startTime: number
  ): Promise<SnapshotJobResult> {
    const { tenantId, warehouseId, snapshotDate } = data

    const targetDate = snapshotDate ? new Date(snapshotDate) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    await this.updateProgress(context.jobId, {
      progress: 10,
      message: '正在查询库存桶数据...',
    })

    // 构建查询条件
    const where: { tenantId: string; warehouseId?: string; quantity: { gt: number } } = {
      tenantId,
      quantity: { gt: 0 },
    }
    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    // 获取所有有库存的桶
    const buckets = await prisma.inventoryBucket.findMany({
      where,
      select: {
        tenantId: true,
        clientId: true,
        warehouseId: true,
        zoneId: true,
        locationId: true,
        skuId: true,
        skuCode: true,
        batchNumber: true,
        lpn: true,
        bucketType: true,
        quantity: true,
        expiryDate: true,
        productionDate: true,
        fifoDate: true,
      },
    })

    await this.updateProgress(context.jobId, {
      progress: 30,
      message: `找到 ${buckets.length} 个库存桶，正在聚合数据...`,
      totalCount: buckets.length,
    })

    // 按库位+SKU+批次+LPN 聚合
    const aggregated = new Map<string, {
      tenantId: string
      clientId: string
      warehouseId: string
      zoneId: string
      locationId: string
      skuId: string
      skuCode: string
      batchNumber: string
      lpn: string
      available: number
      allocated: number
      picking: number
      frozen: number
      defective: number
      qcHold: number
      countHold: number
      expiryDate: Date | null
      productionDate: Date | null
      fifoDate: Date | null
    }>()

    for (const bucket of buckets) {
      const key = `${bucket.locationId}:${bucket.skuId}:${bucket.batchNumber || ''}:${bucket.lpn || ''}:${bucket.expiryDate?.toISOString() || ''}`

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          tenantId: bucket.tenantId,
          clientId: bucket.clientId,
          warehouseId: bucket.warehouseId,
          zoneId: bucket.zoneId,
          locationId: bucket.locationId,
          skuId: bucket.skuId,
          skuCode: bucket.skuCode,
          batchNumber: bucket.batchNumber || '',
          lpn: bucket.lpn || '',
          available: 0,
          allocated: 0,
          picking: 0,
          frozen: 0,
          defective: 0,
          qcHold: 0,
          countHold: 0,
          expiryDate: bucket.expiryDate,
          productionDate: bucket.productionDate,
          fifoDate: bucket.fifoDate,
        })
      }

      const agg = aggregated.get(key)!
      switch (bucket.bucketType) {
        case BucketType.AVAILABLE:
          agg.available += bucket.quantity
          break
        case BucketType.ALLOCATED:
          agg.allocated += bucket.quantity
          break
        case BucketType.PICKING:
          agg.picking += bucket.quantity
          break
        case BucketType.FROZEN:
          agg.frozen += bucket.quantity
          break
        case BucketType.DEFECTIVE:
          agg.defective += bucket.quantity
          break
        case BucketType.QC_HOLD:
          agg.qcHold += bucket.quantity
          break
        case BucketType.COUNT_HOLD:
          agg.countHold += bucket.quantity
          break
      }
    }

    await this.updateProgress(context.jobId, {
      progress: 50,
      message: `聚合完成，共 ${aggregated.size} 条记录，正在写入快照...`,
    })

    // 批量创建快照
    const snapshotData = Array.from(aggregated.values()).map((agg) => ({
      tenantId: agg.tenantId,
      clientId: agg.clientId,
      warehouseId: agg.warehouseId,
      zoneId: agg.zoneId,
      locationId: agg.locationId,
      skuId: agg.skuId,
      skuCode: agg.skuCode,
      batchNumber: agg.batchNumber || undefined,
      lpn: agg.lpn || undefined,
      qtyAvailable: agg.available,
      qtyAllocated: agg.allocated,
      qtyPicking: agg.picking,
      qtyFrozen: agg.frozen,
      qtyDefective: agg.defective,
      qtyQcHold: agg.qcHold,
      qtyCountHold: agg.countHold,
      totalOnHand:
        agg.available +
        agg.allocated +
        agg.picking +
        agg.frozen +
        agg.defective +
        agg.qcHold +
        agg.countHold,
      expiryDate: agg.expiryDate,
      productionDate: agg.productionDate,
      fifoDate: agg.fifoDate,
    }))

    // 分批写入，每批 500 条
    const batchSize = 500
    let created = 0

    for (let i = 0; i < snapshotData.length; i += batchSize) {
      const batch = snapshotData.slice(i, i + batchSize)

      // 使用 findFirst + update/create 避免 null 值问题
      for (const data of batch) {
        const existing = await prisma.inventorySnapshot.findFirst({
          where: {
            locationId: data.locationId,
            skuId: data.skuId,
            batchNumber: data.batchNumber ?? '',
            lpn: data.lpn ?? '',
            expiryDate: data.expiryDate,
          },
        })

        if (existing) {
          await prisma.inventorySnapshot.update({
            where: { id: existing.id },
            data: {
              qtyAvailable: data.qtyAvailable,
              qtyAllocated: data.qtyAllocated,
              qtyPicking: data.qtyPicking,
              qtyFrozen: data.qtyFrozen,
              qtyDefective: data.qtyDefective,
              qtyQcHold: data.qtyQcHold,
              qtyCountHold: data.qtyCountHold,
              totalOnHand: data.totalOnHand,
            },
          })
        } else {
          await prisma.inventorySnapshot.create({
            data: {
              ...data,
              batchNumber: data.batchNumber ?? '',
              lpn: data.lpn ?? '',
            },
          })
        }
        created++
      }

      const progress = 50 + Math.floor((i / snapshotData.length) * 45)
      await this.updateProgress(context.jobId, {
        progress,
        message: `已写入 ${created}/${snapshotData.length} 条快照...`,
        processedCount: created,
        totalCount: snapshotData.length,
      })
    }

    const duration = Date.now() - startTime

    await this.updateProgress(context.jobId, {
      progress: 100,
      message: `快照生成完成，共 ${created} 条记录`,
      processedCount: created,
      totalCount: snapshotData.length,
      successCount: created,
    })

    return {
      snapshotsCreated: created,
      bucketsProcessed: buckets.length,
      duration,
    }
  }
}
