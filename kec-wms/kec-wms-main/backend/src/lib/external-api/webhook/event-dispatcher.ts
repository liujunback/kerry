/**
 * 事件分发器
 */

import type { WebhookEventType, WebhookEvent } from '../types'

type EventHandler<T = unknown> = (event: WebhookEvent<T>) => Promise<void> | void

export class EventDispatcher {
  private handlers: Map<WebhookEventType, EventHandler[]> = new Map()

  /** 注册事件处理器 */
  on<T>(eventType: WebhookEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || []
    handlers.push(handler as EventHandler)
    this.handlers.set(eventType, handlers)
  }

  /** 注销事件处理器 */
  off<T>(eventType: WebhookEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType)
    if (!handlers) return

    const index = handlers.indexOf(handler as EventHandler)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }

  /** 触发事件 */
  async emit<T>(event: WebhookEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type)
    if (!handlers || handlers.length === 0) return

    // 并行执行所有处理器
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event)
        } catch (error) {
          console.error(
            `[EventDispatcher] Handler error for event ${event.type}:`,
            error
          )
        }
      })
    )
  }

  /** 清除所有处理器 */
  clear(): void {
    this.handlers.clear()
  }

  /** 清除指定事件的处理器 */
  clearEvent(eventType: WebhookEventType): void {
    this.handlers.delete(eventType)
  }
}

/** 全局事件分发器实例 */
export const eventDispatcher = new EventDispatcher()
