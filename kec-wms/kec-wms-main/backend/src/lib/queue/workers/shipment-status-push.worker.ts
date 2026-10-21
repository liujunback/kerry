/**
 * 货态推送 Worker
 */

import { Job } from 'bullmq'
import { prismaRead, prisma } from '@/lib/db/prisma'
import { BaseWorker } from './base-worker'
import {
  JobContext,
  ShipmentStatusPushJobData,
  ShipmentStatusPushResult,
} from '../types'

export class ShipmentStatusPushWorker extends BaseWorker<
  ShipmentStatusPushJobData,
  ShipmentStatusPushResult
> {
  protected async process(
    job: Job<ShipmentStatusPushJobData, ShipmentStatusPushResult>,
    context: JobContext
  ): Promise<ShipmentStatusPushResult> {
    const { shipmentIds, targetSystem, webhookUrl } = job.data
    const results: ShipmentStatusPushResult = {
      totalShipments: shipmentIds.length,
      successCount: 0,
      failedCount: 0,
      details: [],
    }

    await this.updateProgress(context.jobId, {
      progress: 0,
      message: '开始推送货态...',
      totalCount: shipmentIds.length,
      processedCount: 0,
    })

    for (let i = 0; i < shipmentIds.length; i++) {
      const shipmentId = shipmentIds[i]

      try {
        // 获取发货信息
        const shipment = await prismaRead.shipment.findUnique({
          where: { id: shipmentId },
          include: {
            order: {
              select: {
                orderNumber: true,
                referenceNumber: true,
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
              },
            },
          },
        })

        if (!shipment) {
          results.failedCount++
          results.details.push({
            shipmentId,
            status: 'FAILED',
            message: '发货记录不存在',
          })
          continue
        }

        // 构建推送数据
        const pushData = {
          shipmentNumber: shipment.shipmentNumber,
          trackingNumber: shipment.trackingNumber,
          carrierCode: shipment.carrierCode,
          carrierName: shipment.carrierName,
          status: shipment.status,
          shippedAt: shipment.shippedAt,
          order: shipment.order,
        }

        // 推送到目标系统
        const pushResult = await this.pushToTargetSystem(
          targetSystem,
          webhookUrl,
          pushData
        )

        if (pushResult.success) {
          results.successCount++
          results.details.push({
            shipmentId,
            status: 'SUCCESS',
          })

          // 更新推送状态
          await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
              // 可以添加推送状态字段
              updatedAt: new Date(),
            },
          })
        } else {
          results.failedCount++
          results.details.push({
            shipmentId,
            status: 'FAILED',
            message: pushResult.message,
          })
        }
      } catch (error) {
        results.failedCount++
        results.details.push({
          shipmentId,
          status: 'FAILED',
          message: error instanceof Error ? error.message : '未知错误',
        })
      }

      // 更新进度
      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / shipmentIds.length) * 100),
        message: `正在推送 ${i + 1}/${shipmentIds.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }

    return results
  }

  /**
   * 推送到目标系统
   */
  private async pushToTargetSystem(
    targetSystem: string,
    webhookUrl: string | undefined,
    data: unknown
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (!webhookUrl) {
        return { success: false, message: '未配置 Webhook URL' }
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetSystem,
          timestamp: new Date().toISOString(),
          data,
        }),
      })

      if (response.ok) {
        return { success: true }
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络错误',
      }
    }
  }
}
