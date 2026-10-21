/**
 * 重试策略管理
 */

import type { RetryConfig, ApiError, ApiResponse } from '../types'
import { DEFAULT_RETRY_CONFIG, ERROR_CODES } from '../config'

export class RetryManager {
  private config: RetryConfig

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /** 执行带重试的操作 */
  async execute<T>(
    operation: () => Promise<ApiResponse<T>>,
    onRetry?: (attempt: number) => void
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | undefined
    let attempt = 0

    while (attempt <= this.config.maxRetries) {
      try {
        if (onRetry) {
          onRetry(attempt)
        }

        const result = await operation()

        // 检查是否需要重试
        if (
          !result.success &&
          result.error?.retryable &&
          attempt < this.config.maxRetries
        ) {
          if (this.shouldRetry(result.error, attempt)) {
            lastError = result.error
            attempt++
            await this.delay(attempt)
            continue
          }
        }

        return result
      } catch (error) {
        const apiError = error as ApiError
        if (apiError.retryable && attempt < this.config.maxRetries) {
          if (this.shouldRetry(apiError, attempt)) {
            lastError = apiError
            attempt++
            await this.delay(attempt)
            continue
          }
        }
        throw error
      }
    }

    throw (
      lastError || {
        code: ERROR_CODES.MAX_RETRIES_EXCEEDED,
        message: 'Max retries exceeded',
        retryable: false,
      }
    )
  }

  /** 判断是否应该重试 */
  private shouldRetry(error: ApiError, attempt: number): boolean {
    // 使用自定义重试条件
    if (this.config.shouldRetry) {
      return this.config.shouldRetry(error, attempt)
    }

    // 检查错误码是否可重试
    if (error.code.startsWith('HTTP_')) {
      const statusCode = parseInt(error.code.replace('HTTP_', ''), 10)
      return this.config.retryableStatusCodes.includes(statusCode)
    }

    // 检查错误类型是否可重试
    return this.config.retryableErrors.includes(error.code)
  }

  /** 计算延迟时间 */
  private calculateDelay(attempt: number): number {
    let delay: number

    switch (this.config.strategy) {
      case 'fixed':
        delay = this.config.baseDelay
        break
      case 'linear':
        delay = this.config.baseDelay * attempt
        break
      case 'exponential':
      default:
        delay = this.config.baseDelay * Math.pow(2, attempt - 1)
        break
    }

    // 添加抖动(±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1)
    delay = delay + jitter

    // 限制最大延迟
    return Math.min(delay, this.config.maxDelay)
  }

  /** 延迟执行 */
  private delay(attempt: number): Promise<void> {
    const ms = this.calculateDelay(attempt)
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
