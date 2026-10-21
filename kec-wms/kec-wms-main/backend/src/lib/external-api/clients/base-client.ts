/**
 * 基础客户端类
 */

import type { ExternalSystemConfig, ApiResponse, RequestConfig } from '../types'
import { HttpClient } from '../core/http-client'

export abstract class BaseClient {
  protected client: HttpClient
  protected config: ExternalSystemConfig

  constructor(config: ExternalSystemConfig) {
    this.config = config
    this.client = new HttpClient(config)
  }

  /** GET请求 */
  protected async get<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.client.get<T>(path, params, options)
  }

  /** POST请求 */
  protected async post<T>(
    path: string,
    body?: unknown,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.client.post<T>(path, body, options)
  }

  /** PUT请求 */
  protected async put<T>(
    path: string,
    body?: unknown,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.client.put<T>(path, body, options)
  }

  /** PATCH请求 */
  protected async patch<T>(
    path: string,
    body?: unknown,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.client.patch<T>(path, body, options)
  }

  /** DELETE请求 */
  protected async delete<T>(
    path: string,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.client.delete<T>(path, options)
  }

  /** 获取底层HTTP客户端 */
  getHttpClient(): HttpClient {
    return this.client
  }

  /** 获取系统配置 */
  getConfig(): ExternalSystemConfig {
    return this.config
  }
}
