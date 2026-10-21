/**
 * 外部API模块类型定义
 */

// ==================== 基础类型 ====================

/** HTTP方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 请求配置 */
export interface RequestConfig {
  /** 请求URL */
  url: string
  /** HTTP方法 */
  method: HttpMethod
  /** 请求头 */
  headers?: Record<string, string>
  /** 查询参数 */
  params?: Record<string, string | number | boolean>
  /** 请求体 */
  body?: unknown
  /** 超时时间(ms) */
  timeout?: number
  /** 重试配置 */
  retry?: Partial<RetryConfig>
  /** 是否跳过熔断检查 */
  skipCircuitBreaker?: boolean
  /** 请求标签(用于日志) */
  tags?: Record<string, string>
  /** 幂等键 */
  idempotencyKey?: string
}

/** 响应结果 */
export interface ApiResponse<T = unknown> {
  /** 是否成功 */
  success: boolean
  /** 响应数据 */
  data?: T
  /** 错误信息 */
  error?: ApiError
  /** HTTP状态码 */
  statusCode: number
  /** 响应头 */
  headers: Record<string, string>
  /** 请求耗时(ms) */
  duration: number
  /** 请求ID */
  requestId: string
  /** 重试次数 */
  retryCount: number
}

/** API错误 */
export interface ApiError {
  /** 错误码 */
  code: string
  /** 错误消息 */
  message: string
  /** 详细信息 */
  details?: unknown
  /** 是否可重试 */
  retryable: boolean
  /** 原始错误 */
  cause?: Error
}

// ==================== 重试配置 ====================

/** 重试策略 */
export type RetryStrategy = 'fixed' | 'exponential' | 'linear'

/** 重试配置 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number
  /** 重试策略 */
  strategy: RetryStrategy
  /** 基础延迟(ms) */
  baseDelay: number
  /** 最大延迟(ms) */
  maxDelay: number
  /** 可重试的状态码 */
  retryableStatusCodes: number[]
  /** 可重试的错误类型 */
  retryableErrors: string[]
  /** 重试条件函数 */
  shouldRetry?: (error: ApiError, attempt: number) => boolean
}

// ==================== 熔断器配置 ====================

/** 熔断器状态 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/** 熔断器配置 */
export interface CircuitBreakerConfig {
  /** 服务名称 */
  serviceName: string
  /** 失败阈值(触发熔断) */
  failureThreshold: number
  /** 成功阈值(恢复关闭) */
  successThreshold: number
  /** 熔断持续时间(ms) */
  openDuration: number
  /** 半开状态允许的请求数 */
  halfOpenRequests: number
  /** 统计窗口时间(ms) */
  windowDuration: number
}

/** 熔断器状态信息 */
export interface CircuitBreakerState {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime?: Date
  lastStateChange: Date
}

// ==================== 认证配置 ====================

/** 认证类型 */
export type AuthType = 'API_KEY' | 'OAUTH2' | 'HMAC' | 'JWT_BEARER' | 'BASIC' | 'CUSTOM'

/** 基础认证配置 */
export interface BaseAuthConfig {
  type: AuthType
  /** 是否启用 */
  enabled: boolean
}

/** API Key认证配置 */
export interface ApiKeyAuthConfig extends BaseAuthConfig {
  type: 'API_KEY'
  /** Key名称 */
  keyName: string
  /** Key值 */
  keyValue: string
  /** 位置: header | query */
  location: 'header' | 'query'
}

/** OAuth2认证配置 */
export interface OAuth2AuthConfig extends BaseAuthConfig {
  type: 'OAUTH2'
  /** 授权类型 */
  grantType: 'client_credentials' | 'authorization_code' | 'refresh_token'
  /** 客户端ID */
  clientId: string
  /** 客户端密钥 */
  clientSecret: string
  /** Token端点 */
  tokenUrl: string
  /** 作用域 */
  scopes?: string[]
  /** 刷新Token */
  refreshToken?: string
}

/** HMAC签名配置 */
export interface HmacAuthConfig extends BaseAuthConfig {
  type: 'HMAC'
  /** 密钥 */
  secretKey: string
  /** 算法 */
  algorithm: 'sha256' | 'sha512' | 'md5'
  /** 签名头名称 */
  signatureHeader: string
  /** 时间戳头名称 */
  timestampHeader: string
  /** 签名有效期(秒) */
  validitySeconds: number
  /** 签名字段 */
  signFields: string[]
}

/** JWT Bearer认证配置 */
export interface JwtBearerAuthConfig extends BaseAuthConfig {
  type: 'JWT_BEARER'
  /** 私钥或密钥 */
  secret: string
  /** 算法 */
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'
  /** 发行者 */
  issuer?: string
  /** 受众 */
  audience?: string
  /** 有效期(秒) */
  expiresIn: number
}

/** Basic认证配置 */
export interface BasicAuthConfig extends BaseAuthConfig {
  type: 'BASIC'
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/** 认证配置联合类型 */
export type AuthConfig =
  | ApiKeyAuthConfig
  | OAuth2AuthConfig
  | HmacAuthConfig
  | JwtBearerAuthConfig
  | BasicAuthConfig

// ==================== 外部系统配置 ====================

/** 外部系统配置 */
export interface ExternalSystemConfig {
  /** 系统标识 */
  systemId: string
  /** 系统名称 */
  systemName: string
  /** 基础URL */
  baseUrl: string
  /** 默认超时(ms) */
  timeout: number
  /** 认证配置 */
  auth?: AuthConfig
  /** 重试配置 */
  retry?: Partial<RetryConfig>
  /** 熔断器配置 */
  circuitBreaker?: Partial<CircuitBreakerConfig>
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>
  /** 是否启用日志 */
  enableLogging: boolean
  /** 是否启用 */
  enabled: boolean
}

// ==================== Webhook类型 ====================

/** Webhook事件类型 */
export type WebhookEventType =
  | 'asn.created'
  | 'asn.received'
  | 'asn.completed'
  | 'order.created'
  | 'order.allocated'
  | 'order.picked'
  | 'order.packed'
  | 'order.shipped'
  | 'inventory.adjusted'
  | 'inventory.transferred'
  | 'inventory.event.created'

/** Webhook配置 */
export interface WebhookConfig {
  /** Webhook ID */
  id: string
  /** 目标URL */
  url: string
  /** 事件类型 */
  events: WebhookEventType[]
  /** 密钥(用于签名) */
  secret: string
  /** 是否启用 */
  enabled: boolean
  /** 重试配置 */
  retry?: Partial<RetryConfig>
  /** 自定义头 */
  headers?: Record<string, string>
}

/** Webhook事件 */
export interface WebhookEvent<T = unknown> {
  /** 事件ID */
  id: string
  /** 事件类型 */
  type: WebhookEventType
  /** 事件数据 */
  data: T
  /** 租户ID */
  tenantId: string
  /** 时间戳 */
  timestamp: Date
  /** 版本 */
  version: string
}

// ==================== 日志类型 ====================

/** 请求日志 */
export interface RequestLog {
  /** 请求ID */
  requestId: string
  /** 租户ID */
  tenantId?: string
  /** 用户ID */
  userId?: string
  /** 目标系统 */
  targetSystem: string
  /** 请求方法 */
  method: HttpMethod
  /** 请求URL */
  url: string
  /** 请求头(脱敏) */
  requestHeaders: Record<string, string>
  /** 请求体(脱敏) */
  requestBody?: unknown
  /** 响应状态码 */
  statusCode?: number
  /** 响应体(脱敏) */
  responseBody?: unknown
  /** 错误信息 */
  error?: string
  /** 耗时(ms) */
  duration: number
  /** 重试次数 */
  retryCount: number
  /** 时间戳 */
  timestamp: Date
  /** 标签 */
  tags?: Record<string, string>
}

// ==================== 拦截器类型 ====================

/** 请求拦截器 */
export interface RequestInterceptor {
  name: string
  priority: number
  onRequest: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig
}

/** 响应拦截器 */
export interface ResponseInterceptor {
  name: string
  priority: number
  onResponse: <T>(response: ApiResponse<T>) => Promise<ApiResponse<T>> | ApiResponse<T>
  onError?: (error: ApiError) => Promise<ApiError> | ApiError
}

// ==================== 限流配置 ====================

/** 限流配置 */
export interface RateLimitConfig {
  /** 窗口大小(ms) */
  windowMs: number
  /** 最大请求数 */
  maxRequests: number
  /** 限流键前缀 */
  keyPrefix: string
}

/** 限流结果 */
export interface RateLimitResult {
  /** 是否允许 */
  allowed: boolean
  /** 剩余请求数 */
  remaining: number
  /** 重置时间(ms) */
  resetTime: number
  /** 限流键 */
  key: string
}
