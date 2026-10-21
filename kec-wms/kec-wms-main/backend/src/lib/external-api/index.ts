/**
 * 外部API模块主导出
 */

// 类型导出
export type {
  HttpMethod,
  RequestConfig,
  ApiResponse,
  ApiError,
  RetryStrategy,
  RetryConfig,
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerState,
  AuthType,
  AuthConfig,
  ApiKeyAuthConfig,
  OAuth2AuthConfig,
  HmacAuthConfig,
  JwtBearerAuthConfig,
  BasicAuthConfig,
  ExternalSystemConfig,
  WebhookEventType,
  WebhookConfig,
  WebhookEvent,
  RequestLog,
  RequestInterceptor,
  ResponseInterceptor,
  RateLimitConfig,
  RateLimitResult,
} from './types'

// 配置导出
export {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_TIMEOUT,
  DEFAULT_HEADERS,
  SENSITIVE_FIELDS,
  SENSITIVE_HEADERS,
  ERROR_CODES,
  loadExternalSystemConfig,
  getExternalSystemConfig,
  registerExternalSystem,
  clearConfigCache,
} from './config'

// 核心模块导出
export { HttpClient } from './core/http-client'

// 功能模块导出
export { RetryManager } from './features/retry'
export { CircuitBreaker } from './features/circuit-breaker'
export { RateLimiter } from './features/rate-limiter'

// 认证模块导出
export { AuthManager } from './auth/auth-manager'
export { ApiKeyStrategy } from './auth/strategies/api-key'
export { OAuth2Strategy } from './auth/strategies/oauth2'
export { HmacStrategy } from './auth/strategies/hmac-signature'
export { BasicStrategy } from './auth/strategies/basic'

// Webhook模块导出
export { WebhookHandler } from './webhook/webhook-handler'
export { SignatureVerifier } from './webhook/signature-verifier'
export { EventDispatcher, eventDispatcher } from './webhook/event-dispatcher'

// 日志模块导出
export { RequestLogger } from './logging/request-logger'

// 客户端导出
export { BaseClient } from './clients/base-client'
export { ErpClient } from './clients/erp-client'

// SDK导出
export { WmsClient } from './sdk/wms-sdk'
export type { WmsSdkConfig } from './sdk/wms-sdk'

// 便捷工厂函数
import type { ExternalSystemConfig } from './types'
import { HttpClient } from './core/http-client'
import { getExternalSystemConfig } from './config'

/** 创建外部系统客户端 */
export function createClient(
  systemIdOrConfig: string | ExternalSystemConfig
): HttpClient {
  if (typeof systemIdOrConfig === 'string') {
    const config = getExternalSystemConfig(systemIdOrConfig)
    if (!config) {
      throw new Error(`External system config not found: ${systemIdOrConfig}`)
    }
    return new HttpClient(config)
  }
  return new HttpClient(systemIdOrConfig)
}
