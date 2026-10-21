/**
 * HTTP客户端核心
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  RequestConfig,
  ApiResponse,
  ApiError,
  ExternalSystemConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from '../types'
import {
  DEFAULT_TIMEOUT,
  DEFAULT_HEADERS,
  ERROR_CODES,
  SENSITIVE_FIELDS,
  SENSITIVE_HEADERS,
} from '../config'
import { RetryManager } from '../features/retry'
import { CircuitBreaker } from '../features/circuit-breaker'
import { RequestLogger } from '../logging/request-logger'
import { AuthManager } from '../auth/auth-manager'

export class HttpClient {
  private config: ExternalSystemConfig
  private retryManager: RetryManager
  private circuitBreaker: CircuitBreaker
  private logger: RequestLogger
  private authManager: AuthManager
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  constructor(config: ExternalSystemConfig) {
    this.config = config
    this.retryManager = new RetryManager(config.retry)
    this.circuitBreaker = new CircuitBreaker({
      serviceName: config.systemId,
      ...config.circuitBreaker,
    })
    this.logger = new RequestLogger(config.systemId)
    this.authManager = new AuthManager(config.auth)
  }

  /** 添加请求拦截器 */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
    this.requestInterceptors.sort((a, b) => a.priority - b.priority)
  }

  /** 添加响应拦截器 */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
    this.responseInterceptors.sort((a, b) => a.priority - b.priority)
  }

  /** 发送请求 */
  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    const requestId = uuidv4()
    const startTime = Date.now()
    let retryCount = 0

    // 检查系统是否启用
    if (!this.config.enabled) {
      return this.createErrorResponse<T>(
        requestId,
        startTime,
        {
          code: ERROR_CODES.EXTERNAL_ERROR,
          message: `External system ${this.config.systemId} is disabled`,
          retryable: false,
        },
        0
      )
    }

    // 应用请求拦截器
    let processedConfig = { ...config }
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor.onRequest(processedConfig)
    }

    // 检查熔断器状态
    if (!processedConfig.skipCircuitBreaker) {
      const canProceed = await this.circuitBreaker.canRequest()
      if (!canProceed) {
        return this.createErrorResponse<T>(
          requestId,
          startTime,
          {
            code: ERROR_CODES.CIRCUIT_OPEN,
            message: `Circuit breaker is open for ${this.config.systemId}`,
            retryable: false,
          },
          0
        )
      }
    }

    // 执行请求(带重试)
    const executeRequest = async (): Promise<ApiResponse<T>> => {
      return this.executeHttpRequest<T>(requestId, startTime, processedConfig)
    }

    // 使用重试管理器执行
    try {
      return await this.retryManager.execute(executeRequest, (attempt) => {
        retryCount = attempt
      })
    } catch (error) {
      return this.createErrorResponse<T>(
        requestId,
        startTime,
        error as ApiError,
        retryCount
      )
    }
  }

  /** GET请求 */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean>,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url: path,
      method: 'GET',
      params,
      ...options,
    })
  }

  /** POST请求 */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url: path,
      method: 'POST',
      body,
      ...options,
    })
  }

  /** PUT请求 */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url: path,
      method: 'PUT',
      body,
      ...options,
    })
  }

  /** PATCH请求 */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url: path,
      method: 'PATCH',
      body,
      ...options,
    })
  }

  /** DELETE请求 */
  async delete<T = unknown>(
    path: string,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url: path,
      method: 'DELETE',
      ...options,
    })
  }

  // ==================== 私有方法 ====================

  /** 执行HTTP请求 */
  private async executeHttpRequest<T>(
    requestId: string,
    startTime: number,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const retryCount = 0

    try {
      // 添加认证
      const authHeaders = await this.authManager.getAuthHeaders(config)

      // 构建完整URL
      const url = this.buildUrl(config)

      // 构建请求头
      const headers: Record<string, string> = {
        ...DEFAULT_HEADERS,
        ...this.config.defaultHeaders,
        ...authHeaders,
        ...config.headers,
        'X-Request-ID': requestId,
      }

      // 执行fetch
      const controller = new AbortController()
      const timeout =
        config.timeout || this.config.timeout || DEFAULT_TIMEOUT
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          method: config.method,
          headers,
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // 解析响应
        const responseHeaders = this.parseHeaders(response.headers)
        let data: T | undefined
        let error: ApiError | undefined

        if (response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            data = await response.json()
          } else {
            data = (await response.text()) as unknown as T
          }

          // 记录成功
          this.circuitBreaker.recordSuccess()
        } else {
          // 解析错误响应
          let errorBody: unknown
          try {
            errorBody = await response.json()
          } catch {
            errorBody = await response.text()
          }

          error = {
            code: `HTTP_${response.status}`,
            message: response.statusText,
            details: errorBody,
            retryable: this.isRetryableStatus(response.status),
          }

          // 记录失败
          this.circuitBreaker.recordFailure()
        }

        const result: ApiResponse<T> = {
          success: response.ok,
          data,
          error,
          statusCode: response.status,
          headers: responseHeaders,
          duration: Date.now() - startTime,
          requestId,
          retryCount,
        }

        // 应用响应拦截器
        let processedResponse = result
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor.onResponse(processedResponse)
        }

        // 记录日志
        if (this.config.enableLogging) {
          await this.logger.log({
            requestId,
            targetSystem: this.config.systemId,
            method: config.method,
            url,
            requestHeaders: this.sanitizeHeaders(headers),
            requestBody: this.sanitizeBody(config.body),
            statusCode: response.status,
            responseBody: this.sanitizeBody(data || error?.details),
            duration: processedResponse.duration,
            retryCount,
            timestamp: new Date(),
            tags: config.tags,
          })
        }

        return processedResponse
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error) {
      // 处理网络错误
      const apiError = this.normalizeError(error)
      this.circuitBreaker.recordFailure()
      throw apiError
    }
  }

  /** 构建完整URL */
  private buildUrl(config: RequestConfig): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '')
    const path = config.url.startsWith('/') ? config.url : `/${config.url}`
    let url = `${baseUrl}${path}`

    if (config.params && Object.keys(config.params).length > 0) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(config.params)) {
        searchParams.append(key, String(value))
      }
      url += `?${searchParams.toString()}`
    }

    return url
  }

  /** 解析响应头 */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /** 脱敏请求头 */
  private sanitizeHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      if (
        SENSITIVE_HEADERS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        result[key] = '***REDACTED***'
      } else {
        result[key] = value
      }
    }
    return result
  }

  /** 脱敏请求体 */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body
    }
    return JSON.parse(
      JSON.stringify(body, (key, value) => {
        if (
          SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
        ) {
          return '***REDACTED***'
        }
        return value
      })
    )
  }

  /** 判断是否可重试的状态码 */
  private isRetryableStatus(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status)
  }

  /** 标准化错误 */
  private normalizeError(error: unknown): ApiError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          code: ERROR_CODES.TIMEOUT,
          message: 'Request timeout',
          retryable: true,
          cause: error,
        }
      }
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: error.message,
        retryable: true,
        cause: error,
      }
    }
    return {
      code: ERROR_CODES.EXTERNAL_ERROR,
      message: 'Unknown error',
      retryable: false,
    }
  }

  /** 创建错误响应 */
  private createErrorResponse<T>(
    requestId: string,
    startTime: number,
    error: ApiError,
    retryCount: number
  ): ApiResponse<T> {
    return {
      success: false,
      error,
      statusCode: 0,
      headers: {},
      duration: Date.now() - startTime,
      requestId,
      retryCount,
    }
  }
}
