import { SignatureVerifier } from '@/lib/external-api/webhook/signature-verifier'
import {
  API_KEY_WEBHOOK_EVENT_TYPES,
  normalizeApiKeyWebhookEvents,
} from '@/lib/external-api/webhook/api-key-webhook'
import { prismaRead } from '@/lib/db/prisma'
import { Job } from 'bullmq'
import { BaseWorker } from './base-worker'
import { JobContext, InventoryEventPushJobData, InventoryEventPushResult } from '../types'

const INVENTORY_EVENT_CREATED = API_KEY_WEBHOOK_EVENT_TYPES[0]

type DeliveryTarget = {
  id: string
  clientId: string | null
  warehouseId: string | null
  webhookUrl: string
  webhookSecret: string | null
}

type InventoryEventPayload = {
  id: string
  eventNumber: string
  eventType: string
  bucketType: string
  quantityDelta: number
  quantityBefore: number
  quantityAfter: number
  batchNumber: string | null
  lpn: string | null
  asnNumber: string | null
  reasonCode: string | null
  reasonDescription: string | null
  referenceType: string | null
  referenceId: string | null
  referenceNumber: string | null
  referenceLineId: string | null
  eventDate: string
  createdAt: string
  warehouse: { id: string; warehouseCode: string; warehouseName: string }
  location: { id: string; locationCode: string }
  sku: { id: string; skuCode: string; skuName: string }
  client: { id: string; clientCode: string; clientName: string } | null
}

export class InventoryEventPushWorker extends BaseWorker<
  InventoryEventPushJobData,
  InventoryEventPushResult
> {
  private readonly signatureVerifier = new SignatureVerifier()

  protected async process(
    job: Job<InventoryEventPushJobData, InventoryEventPushResult>,
    context: JobContext
  ): Promise<InventoryEventPushResult> {
    const { eventIds } = job.data

    const result: InventoryEventPushResult = {
      totalEvents: eventIds.length,
      pushedCount: 0,
      failedCount: 0,
      details: [],
    }

    const targets = await this.loadTargets(context.tenantId)
    if (targets.length === 0 || eventIds.length === 0) {
      return result
    }

    for (let i = 0; i < eventIds.length; i++) {
      const eventId = eventIds[i]
      const event = await prismaRead.inventoryEvent.findUnique({
        where: { id: eventId },
        include: {
          warehouse: {
            select: { id: true, warehouseCode: true, warehouseName: true },
          },
          location: {
            select: { id: true, locationCode: true },
          },
          sku: {
            select: { id: true, skuCode: true, skuName: true },
          },
          client: {
            select: { id: true, clientCode: true, clientName: true },
          },
        },
      })

      if (!event) {
        continue
      }

      const scopedTargets = targets.filter((target) => {
        if (target.clientId && target.clientId !== event.clientId) {
          return false
        }
        if (target.warehouseId && target.warehouseId !== event.warehouseId) {
          return false
        }
        return true
      })

      const payload: InventoryEventPayload = {
        id: event.id,
        eventNumber: event.eventNumber,
        eventType: event.eventType,
        bucketType: event.bucketType,
        quantityDelta: event.quantityDelta,
        quantityBefore: event.quantityBefore,
        quantityAfter: event.quantityAfter,
        batchNumber: event.batchNumber || null,
        lpn: event.lpn || null,
        asnNumber: event.asnNumber || null,
        reasonCode: event.reasonCode || null,
        reasonDescription: event.reasonDesc || null,
        referenceType: event.referenceType || null,
        referenceId: event.referenceId || null,
        referenceNumber: event.referenceNumber || null,
        referenceLineId: event.referenceLineId || null,
        eventDate: event.eventDate.toISOString(),
        createdAt: event.createdAt.toISOString(),
        warehouse: event.warehouse,
        location: event.location,
        sku: event.sku,
        client: event.client,
      }

      for (const target of scopedTargets) {
        const delivery = await this.deliver(target, payload)
        result.details.push({
          eventId: event.id,
          webhookId: target.id,
          status: delivery.success ? 'SUCCESS' : 'FAILED',
          message: delivery.message,
        })

        if (delivery.success) {
          result.pushedCount++
        } else {
          result.failedCount++
        }
      }
    }

    return result
  }

  private async loadTargets(tenantId: string): Promise<DeliveryTarget[]> {
    const apiKeys = await prismaRead.apiKey.findMany({
      where: {
        tenantId,
        isActive: true,
        webhookUrl: { not: null },
      },
      select: {
        id: true,
        clientId: true,
        warehouseId: true,
        webhookUrl: true,
        webhookSecret: true,
        webhookEvents: true,
      },
    })

    return apiKeys
      .filter((item) =>
        normalizeApiKeyWebhookEvents(item.webhookEvents).includes(INVENTORY_EVENT_CREATED)
      )
      .map((item) => ({
        id: item.id,
        clientId: item.clientId,
        warehouseId: item.warehouseId,
        webhookUrl: item.webhookUrl!,
        webhookSecret: item.webhookSecret,
      }))
  }

  private async deliver(
    target: DeliveryTarget,
    payload: InventoryEventPayload
  ): Promise<{ success: boolean; message?: string }> {
    const body = JSON.stringify({
      id: payload.id,
      type: INVENTORY_EVENT_CREATED,
      timestamp: payload.createdAt,
      data: payload,
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-ID': target.id,
      'X-Event-ID': payload.id,
      'X-Event-Type': INVENTORY_EVENT_CREATED,
      'X-Timestamp': payload.createdAt,
    }

    if (target.webhookSecret) {
      headers['X-Signature'] = this.signatureVerifier.sign(body, target.webhookSecret)
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(target.webhookUrl, {
          method: 'POST',
          headers,
          body,
        })

        if (response.ok) {
          return { success: true }
        }

        if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === 3) {
          return {
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
          }
        }
      } catch (error) {
        if (attempt === 3) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Webhook 推送失败',
          }
        }
      }
    }

    return { success: false, message: 'Webhook 推送失败' }
  }
}
