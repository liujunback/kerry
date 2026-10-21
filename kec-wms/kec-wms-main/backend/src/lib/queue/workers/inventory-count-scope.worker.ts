/**
 * 盘点范围生成 Worker
 */

import { Job } from 'bullmq'
import { prisma } from '@/lib/db/prisma'
import { BaseWorker } from './base-worker'
import { JobContext, InventoryCountScopeJobData, InventoryCountScopeResult } from '../types'
import { generateInventoryCountScope } from '@/lib/services/inventory-count-service'

export class InventoryCountScopeWorker extends BaseWorker<
  InventoryCountScopeJobData,
  InventoryCountScopeResult
> {
  protected async process(
    job: Job<InventoryCountScopeJobData, InventoryCountScopeResult>,
    context: JobContext
  ): Promise<InventoryCountScopeResult> {
    const { orderId, warehouseId } = job.data

    await this.updateProgress(context.jobId, {
      progress: 5,
      message: '开始生成盘点范围...',
    })

    try {
      const updated = await prisma.inventoryCountOrder.updateMany({
        where: {
          id: orderId,
          tenantId: context.tenantId,
          status: {
            in: ['PENDING_SCOPE', 'SCOPE_FAILED', 'GENERATING_SCOPE'],
          },
        },
        data: {
          status: 'GENERATING_SCOPE',
          updatedBy: context.userId,
        },
      })

      if (updated.count === 0) {
        const order = await prisma.inventoryCountOrder.findFirst({
          where: {
            id: orderId,
            tenantId: context.tenantId,
          },
          select: {
            status: true,
          },
        })

        if (!order) {
          throw new Error('盘点单不存在')
        }

        if (order.status !== 'GENERATING_SCOPE') {
          throw new Error(`当前盘点单状态不允许生成范围：${order.status}`)
        }
      }

      await this.updateProgress(context.jobId, {
        progress: 20,
        message: '正在校验盘点单并查询库存...',
      })

      await generateInventoryCountScope(
        {
          id: context.userId,
          tenantId: context.tenantId,
          tenantCode: '',
          username: 'System Worker',
          userType: 'SYSTEM',
          warehouseId,
        },
        orderId,
        warehouseId
      )

      await this.updateProgress(context.jobId, {
        progress: 100,
        message: '盘点范围生成完成',
      })

      return {
        orderId,
        status: 'READY',
      }
    } catch (error) {
      await prisma.inventoryCountOrder.updateMany({
        where: {
          id: orderId,
          tenantId: context.tenantId,
          status: 'GENERATING_SCOPE',
        },
        data: {
          status: 'SCOPE_FAILED',
          updatedBy: context.userId,
        },
      })
      throw error
    }
  }
}
