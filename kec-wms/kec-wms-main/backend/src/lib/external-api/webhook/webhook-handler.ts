/**
 * Webhook处理器
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  WebhookConfig,
  WebhookEvent,
  WebhookEventType,
  ApiResponse,
} from '../types'
import { SignatureVerifier } from './signature-verifier'
import { DEFAULT_RETRY_CONFIG } from '../config'

interface WebhookDeliveryResult {
  webhookId: string
  eventId: string
  success: boolean
  statusCode?: number
  error?: string
  duration: number
  retryCount: number
}

export class WebhookHandler {
  private webhooks: Map<string, WebhookConfig> = new Map()
  private signatureVerifier: SignatureVerifier

  constructor() {
    this.signatureVerifier = new SignatureVerifier()
  }

  /** 注册Webhook */
  register(config: WebhookConfig): void {
    this.webhooks.set(config.id, config)
  }

  /** 注销Webhook */
  unregister(webhookId: string): void {
    this.webhooks.delete(webhookId)
  }

  /** 获取Webhook配置 */
  getWebhook(webhookId: string): WebhookConfig | undefined {
    return this.webhooks.get(webhookId)
  }

  /** 获取所有Webhook */
  getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values())
  }

  /** 触发事件 */
  async dispatch<T>(
    eventType: WebhookEventType,
    data: T,
    tenantId: string
  ): Promise<WebhookDeliveryResult[]> {
    const results: WebhookDeliveryResult[] = []

    // 查找订阅了该事件的Webhook
    const subscribedWebhooks = Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.enabled && webhook.events.includes(eventType)
    )

    // 创建事件
    const event: WebhookEvent<T> = {
      id: uuidv4(),
      type: eventType,
      data,
      tenantId,
      timestamp: new Date(),
      version: '1.0',
    }

    // 并行发送到所有订阅的Webhook
    const deliveryPromises = subscribedWebhooks.map((webhook) =>
      this.deliver(webhook, event)
    )

    const deliveryResults = await Promise.allSettled(deliveryPromises)

    for (let i = 0; i < deliveryResults.length; i++) {
      const result = deliveryResults[i]
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          webhookId: subscribedWebhooks[i].id,
          eventId: event.id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          duration: 0,
          retryCount: 0,
        })
      }
    }

    return results
  }

  /** 发送Webhook */
  private async deliver<T>(
    webhook: WebhookConfig,
    event: WebhookEvent<T>
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now()
    const maxRetries = webhook.retry?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries
    let retryCount = 0
    let lastError: string | undefined

    while (retryCount <= maxRetries) {
      try {
        // 生成签名
        const signature = this.signatureVerifier.sign(
          JSON.stringify(event),
          webhook.secret
        )

        // 发送请求
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-ID': webhook.id,
            'X-Event-ID': event.id,
            'X-Event-Type': event.type,
            'X-Signature': signature,
            'X-Timestamp': event.timestamp.toISOString(),
            ...webhook.headers,
          },
          body: JSON.stringify(event),
        })

        if (response.ok) {
          return {
            webhookId: webhook.id,
            eventId: event.id,
            success: true,
            statusCode: response.status,
            duration: Date.now() - startTime,
            retryCount,
          }
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`

        // 检查是否应该重试
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
          break
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network error'
      }

      retryCount++
      if (retryCount <= maxRetries) {
        // 指数退避
        await this.delay(1000 * Math.pow(2, retryCount - 1))
      }
    }

    return {
      webhookId: webhook.id,
      eventId: event.id,
      success: false,
      error: lastError,
      duration: Date.now() - startTime,
      retryCount,
    }
  }

  /** 延迟 */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
