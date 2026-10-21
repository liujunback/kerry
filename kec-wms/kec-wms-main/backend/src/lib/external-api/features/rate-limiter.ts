/**
 * 请求限流器
 */

import type { RateLimitConfig, RateLimitResult } from '../types'
import { DEFAULT_RATE_LIMIT_CONFIG } from '../config'

/** 内存存储的限流记录 */
interface RateLimitRecord {
  count: number
  resetTime: number
}

export class RateLimiter {
  private config: RateLimitConfig
  private records: Map<string, RateLimitRecord> = new Map()

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config }

    // 定期清理过期记录
    setInterval(() => this.cleanup(), this.config.windowMs)
  }

  /** 检查是否允许请求 */
  async check(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}:${key}`
    const now = Date.now()

    let record = this.records.get(fullKey)

    // 如果记录不存在或已过期，创建新记录
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
      }
    }

    // 检查是否超过限制
    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        key: fullKey,
      }
    }

    // 增加计数
    record.count++
    this.records.set(fullKey, record)

    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime,
      key: fullKey,
    }
  }

  /** 消费一个请求配额 */
  async consume(key: string): Promise<RateLimitResult> {
    return this.check(key)
  }

  /** 重置指定key的限流 */
  reset(key: string): void {
    const fullKey = `${this.config.keyPrefix}:${key}`
    this.records.delete(fullKey)
  }

  /** 获取当前状态 */
  getStatus(key: string): RateLimitResult | null {
    const fullKey = `${this.config.keyPrefix}:${key}`
    const record = this.records.get(fullKey)

    if (!record) {
      return null
    }

    const now = Date.now()
    if (now >= record.resetTime) {
      return null
    }

    return {
      allowed: record.count < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - record.count),
      resetTime: record.resetTime,
      key: fullKey,
    }
  }

  /** 清理过期记录 */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime) {
        this.records.delete(key)
      }
    }
  }
}
