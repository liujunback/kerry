/**
 * WMS SDK - 供外部系统调用WMS的客户端
 */

import type { ExternalSystemConfig, ApiResponse } from '../types'
import { HttpClient } from '../core/http-client'
import { AsnResource } from './resources/asn'
import { InventoryResource } from './resources/inventory'
import { OrderResource } from './resources/orders'

export interface WmsSdkConfig {
  /** WMS系统基础URL */
  baseUrl: string
  /** API Key */
  apiKey?: string
  /** 超时时间(ms) */
  timeout?: number
  /** 租户代码 */
  tenantCode?: string
}

export class WmsClient {
  private client: HttpClient
  private config: WmsSdkConfig

  /** ASN资源 */
  public readonly asn: AsnResource
  /** 库存资源 */
  public readonly inventory: InventoryResource
  /** 订单资源 */
  public readonly order: OrderResource

  constructor(config: WmsSdkConfig) {
    this.config = config

    // 构建内部配置
    const systemConfig: ExternalSystemConfig = {
      systemId: 'wms-sdk',
      systemName: 'WMS SDK',
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      enabled: true,
      enableLogging: true,
      defaultHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      auth: config.apiKey
        ? {
            type: 'API_KEY',
            enabled: true,
            keyName: 'X-API-Key',
            keyValue: config.apiKey,
            location: 'header',
          }
        : undefined,
    }

    this.client = new HttpClient(systemConfig)

    // 初始化资源
    this.asn = new AsnResource(this.client, config.tenantCode)
    this.inventory = new InventoryResource(this.client, config.tenantCode)
    this.order = new OrderResource(this.client, config.tenantCode)
  }

  /** 获取底层HTTP客户端 */
  getHttpClient(): HttpClient {
    return this.client
  }

  /** 健康检查 */
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.client.get<{ status: string }>('/health')
  }
}
