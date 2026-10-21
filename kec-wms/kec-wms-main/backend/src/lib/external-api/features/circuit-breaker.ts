/**
 * 熔断器实现
 */

import type {
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitState,
} from '../types'
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../config'

export class CircuitBreaker {
  private config: CircuitBreakerConfig
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private successes = 0
  private lastFailureTime?: Date
  private lastStateChange: Date = new Date()
  private halfOpenRequests = 0

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config }
  }

  /** 检查是否可以发送请求 */
  async canRequest(): Promise<boolean> {
    switch (this.state) {
      case 'CLOSED':
        return true

      case 'OPEN':
        // 检查是否可以转换到半开状态
        if (this.shouldTransitionToHalfOpen()) {
          this.transitionTo('HALF_OPEN')
          return true
        }
        return false

      case 'HALF_OPEN':
        // 限制半开状态的请求数
        if (this.halfOpenRequests < this.config.halfOpenRequests) {
          this.halfOpenRequests++
          return true
        }
        return false

      default:
        return false
    }
  }

  /** 记录成功 */
  recordSuccess(): void {
    this.successes++

    switch (this.state) {
      case 'HALF_OPEN':
        // 半开状态下，达到成功阈值则关闭熔断器
        if (this.successes >= this.config.successThreshold) {
          this.transitionTo('CLOSED')
        }
        break

      case 'CLOSED':
        // 关闭状态下，重置失败计数
        this.failures = 0
        break
    }
  }

  /** 记录失败 */
  recordFailure(): void {
    this.failures++
    this.lastFailureTime = new Date()

    switch (this.state) {
      case 'CLOSED':
        // 关闭状态下，达到失败阈值则打开熔断器
        if (this.failures >= this.config.failureThreshold) {
          this.transitionTo('OPEN')
        }
        break

      case 'HALF_OPEN':
        // 半开状态下，任何失败都会重新打开熔断器
        this.transitionTo('OPEN')
        break
    }
  }

  /** 获取当前状态 */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    }
  }

  /** 重置熔断器 */
  reset(): void {
    this.state = 'CLOSED'
    this.failures = 0
    this.successes = 0
    this.halfOpenRequests = 0
    this.lastFailureTime = undefined
    this.lastStateChange = new Date()
  }

  /** 强制打开熔断器 */
  forceOpen(): void {
    this.transitionTo('OPEN')
  }

  /** 强制关闭熔断器 */
  forceClose(): void {
    this.transitionTo('CLOSED')
  }

  // ==================== 私有方法 ====================

  /** 检查是否应该转换到半开状态 */
  private shouldTransitionToHalfOpen(): boolean {
    if (!this.lastFailureTime) {
      return true
    }

    const elapsed = Date.now() - this.lastFailureTime.getTime()
    return elapsed >= this.config.openDuration
  }

  /** 状态转换 */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState
    this.lastStateChange = new Date()

    // 重置计数器
    switch (newState) {
      case 'CLOSED':
        this.failures = 0
        this.successes = 0
        this.halfOpenRequests = 0
        break

      case 'OPEN':
        this.successes = 0
        this.halfOpenRequests = 0
        break

      case 'HALF_OPEN':
        this.successes = 0
        this.halfOpenRequests = 0
        break
    }

    // 记录状态变化日志
    console.log(
      `[CircuitBreaker:${this.config.serviceName}] State changed: ${oldState} -> ${newState}`
    )
  }
}
