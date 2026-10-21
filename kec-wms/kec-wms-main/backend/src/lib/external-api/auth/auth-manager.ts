/**
 * 认证管理器
 */

import type { AuthConfig, RequestConfig } from '../types'
import { ApiKeyStrategy } from './strategies/api-key'
import { OAuth2Strategy } from './strategies/oauth2'
import { HmacStrategy } from './strategies/hmac-signature'
import { BasicStrategy } from './strategies/basic'

/** 认证策略接口 */
export interface AuthStrategy {
  getHeaders(config: RequestConfig): Promise<Record<string, string>>
}

export class AuthManager {
  private strategy: AuthStrategy | null = null

  constructor(authConfig?: AuthConfig) {
    if (!authConfig || !authConfig.enabled) {
      return
    }

    switch (authConfig.type) {
      case 'API_KEY':
        this.strategy = new ApiKeyStrategy(authConfig)
        break
      case 'OAUTH2':
        this.strategy = new OAuth2Strategy(authConfig)
        break
      case 'HMAC':
        this.strategy = new HmacStrategy(authConfig)
        break
      case 'BASIC':
        this.strategy = new BasicStrategy(authConfig)
        break
      case 'JWT_BEARER':
        // JWT策略可以后续实现
        break
    }
  }

  /** 获取认证头 */
  async getAuthHeaders(config: RequestConfig): Promise<Record<string, string>> {
    if (!this.strategy) {
      return {}
    }
    return this.strategy.getHeaders(config)
  }

  /** 设置自定义策略 */
  setStrategy(strategy: AuthStrategy): void {
    this.strategy = strategy
  }
}
