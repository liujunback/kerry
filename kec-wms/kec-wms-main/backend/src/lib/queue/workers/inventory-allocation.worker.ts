/**
 * 库存分配 Worker
 */

import { Job } from 'bullmq'
import { prisma } from '@/lib/db/prisma'
import { BaseWorker } from './base-worker'
import {
  JobContext,
  InventoryAllocationJobData,
  InventoryAllocationResult,
} from '../types'
import { allocateInventorySync } from '@/lib/services/inventory-allocation-service'
import { Log } from '@/lib/logger'

const ORDER_ALLOCATE_MAX_RETRIES = 3 // 订单级重试次数（热点竞争兜底）
const ORDER_ALLOCATE_RETRY_DELAY_MS = 500

export class InventoryAllocationWorker extends BaseWorker<
  InventoryAllocationJobData,
  InventoryAllocationResult
> {
  private isRetryableAllocationFailure(message?: string): boolean {
    if (!message) return false

    return [
      '公平队列等待超时',
      '获取库存锁超时',
      '库存已被其他任务分配，请重试',
      '源库存桶不存在',
      '热点SKU锁等待超时',
    ].some((keyword) => message.includes(keyword))
  }

  protected async process(
    job: Job<InventoryAllocationJobData, InventoryAllocationResult>,
    context: JobContext
  ): Promise<InventoryAllocationResult> {
    const { orderIds, warehouseId, allocationStrategy, allocationMode } =
      job.data
    const results: InventoryAllocationResult = {
      totalOrders: orderIds.length,
      allocatedOrders: 0,
      failedOrders: 0,
      details: [],
    }

    await this.updateProgress(context.jobId, {
      progress: 0,
      message: '开始分配库存...',
      totalCount: orderIds.length,
      processedCount: 0,
    })

    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i]

      try {
        const order = await prisma.outboundOrder.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            orderNumber: true,
          },
        })

        if (!order) {
          results.failedOrders++
          results.details.push({
            orderId,
            orderNumber: 'N/A',
            status: 'FAILED',
            message: '订单不存在',
          })
          continue
        }

        const allocationResult = await this.allocateOrderInventory(
          order.id,
          order.orderNumber,
          warehouseId,
          allocationStrategy,
          allocationMode || 'FAST',
          context.tenantId,
          context.userId
        )

        if (allocationResult.success) {
          results.allocatedOrders++
          results.details.push({
            orderId,
            orderNumber: order.orderNumber,
            status: 'SUCCESS',
          })
        } else {
          results.failedOrders++
          results.details.push({
            orderId,
            orderNumber: order.orderNumber,
            status: 'FAILED',
            message: allocationResult.message,
          })
        }
      } catch (error) {
        results.failedOrders++
        results.details.push({
          orderId,
          orderNumber: 'N/A',
          status: 'FAILED',
          message: error instanceof Error ? error.message : '未知错误',
        })
      }

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / orderIds.length) * 100),
        message: `正在处理订单 ${i + 1}/${orderIds.length}`,
        processedCount: i + 1,
        successCount: results.allocatedOrders,
        failedCount: results.failedOrders,
      })
    }

    return results
  }

  /**
   * 分配单个订单的库存。
   *
   * Worker 只负责任务编排；库存事件、转桶、快照/汇总刷新和订单状态推进
   * 统一由 inventory-allocation-service 处理。
   */
  private async allocateOrderInventory(
    orderId: string,
    orderNumber: string,
    warehouseId: string,
    strategy: string,
    mode: string,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> {
    const startedAt = Date.now()

    for (let attempt = 0; attempt <= ORDER_ALLOCATE_MAX_RETRIES; attempt++) {
      try {
        const result = await allocateInventorySync(orderId, tenantId, userId)

        Log.info('[AllocationWorker] 单订单分配完成', {
          order_id: orderId,
          order_number: orderNumber,
          warehouse_id: warehouseId,
          requested_strategy: strategy,
          requested_mode: mode,
          success: result.success,
          message: result.message,
          allocated_qty: result.allocatedQty,
          attempt: attempt + 1,
          total_ms: Date.now() - startedAt,
        })

        if (result.success) {
          return result
        }

        if (!this.isRetryableAllocationFailure(result.message) || attempt === ORDER_ALLOCATE_MAX_RETRIES) {
          return result
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        if (!this.isRetryableAllocationFailure(message) || attempt === ORDER_ALLOCATE_MAX_RETRIES) {
          throw error
        }
      }

      await this.sleep(ORDER_ALLOCATE_RETRY_DELAY_MS * (attempt + 1))
    }

    return { success: false, message: '库存分配重试后仍失败，请稍后重试' }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
