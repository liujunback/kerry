/**
 * 外部API模块配置管理
 */

import type {
  RetryConfig,
  CircuitBreakerConfig,
  ExternalSystemConfig,
  RateLimitConfig,
} from './types'

// ==================== 默认配置 ====================

/** 默认重试配置 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  strategy: 'exponential',
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'NETWORK_ERROR'],
}

/** 默认熔断器配置 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  serviceName: 'default',
  failureThreshold: 5,
  successThreshold: 3,
  openDuration: 30000,
  halfOpenRequests: 3,
  windowDuration: 60000,
}

/** 默认限流配置 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
  keyPrefix: 'external-api:rate-limit',
}

/** 默认超时配置(ms) */
export const DEFAULT_TIMEOUT = 30000

/** 默认请求头 */
export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

// ==================== 敏感字段(日志脱敏) ====================

/** 敏感字段列表 */
export const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'Authorization',
  'X-API-Key',
  'X-Secret',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'clientSecret',
  'client_secret',
  'privateKey',
  'private_key',
]

/** 敏感头字段 */
export const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'x-secret',
  'cookie',
  'set-cookie',
]

// ==================== 错误码定义 ====================

/** 错误码 */
export const ERROR_CODES = {
  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  DNS_ERROR: 'DNS_ERROR',

  // 认证错误
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 熔断错误
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',

  // 限流错误
  RATE_LIMITED: 'RATE_LIMITED',

  // 业务错误
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  EXTERNAL_ERROR: 'EXTERNAL_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',

  // 重试错误
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// ==================== 环境变量加载 ====================

/** 从环境变量加载外部系统配置 */
export function loadExternalSystemConfig(
  systemId: string
): ExternalSystemConfig | null {
  const prefix = `EXTERNAL_${systemId.toUpperCase()}_`
  const baseUrl = process.env[`${prefix}BASE_URL`]

  if (!baseUrl) {
    return null
  }

  return {
    systemId,
    systemName: process.env[`${prefix}NAME`] || systemId,
    baseUrl,
    timeout: parseInt(process.env[`${prefix}TIMEOUT`] || '30000', 10),
    enabled: process.env[`${prefix}ENABLED`] !== 'false',
    enableLogging: process.env[`${prefix}LOGGING`] !== 'false',
    defaultHeaders: { ...DEFAULT_HEADERS },
  }
}

/** 外部系统配置缓存 */
const systemConfigCache = new Map<string, ExternalSystemConfig>()

/** 获取外部系统配置(带缓存) */
export function getExternalSystemConfig(
  systemId: string
): ExternalSystemConfig | null {
  if (systemConfigCache.has(systemId)) {
    return systemConfigCache.get(systemId)!
  }

  const config = loadExternalSystemConfig(systemId)
  if (config) {
    systemConfigCache.set(systemId, config)
  }

  return config
}

/** 注册外部系统配置 */
export function registerExternalSystem(config: ExternalSystemConfig): void {
  systemConfigCache.set(config.systemId, config)
}

/** 清除配置缓存 */
export function clearConfigCache(): void {
  systemConfigCache.clear()
}
