/**
 * ERP系统客户端示例
 */

import type { ExternalSystemConfig, ApiResponse } from '../types'
import { BaseClient } from './base-client'

// ERP系统响应类型
interface ErpOrderResponse {
  orderId: string
  status: string
  items: Array<{
    skuCode: string
    quantity: number
    price: number
  }>
}

interface ErpInventoryResponse {
  skuCode: string
  availableQty: number
  reservedQty: number
  warehouseCode: string
}

interface ErpSyncResult {
  success: boolean
  syncedCount: number
  errors: string[]
}

export class ErpClient extends BaseClient {
  constructor(config: ExternalSystemConfig) {
    super(config)
  }

  /** 同步订单到ERP */
  async syncOrder(orderData: {
    orderId: string
    items: Array<{ skuCode: string; quantity: number }>
  }): Promise<ApiResponse<ErpSyncResult>> {
    return this.post<ErpSyncResult>('/orders/sync', orderData, {
      tags: { operation: 'sync-order' },
    })
  }

  /** 查询ERP订单状态 */
  async getOrderStatus(orderId: string): Promise<ApiResponse<ErpOrderResponse>> {
    return this.get<ErpOrderResponse>(`/orders/${orderId}`, undefined, {
      tags: { operation: 'get-order-status' },
    })
  }

  /** 同步库存到ERP */
  async syncInventory(inventoryData: {
    skuCode: string
    warehouseCode: string
    quantity: number
  }): Promise<ApiResponse<ErpSyncResult>> {
    return this.post<ErpSyncResult>('/inventory/sync', inventoryData, {
      tags: { operation: 'sync-inventory' },
    })
  }

  /** 查询ERP库存 */
  async getInventory(
    skuCode: string,
    warehouseCode?: string
  ): Promise<ApiResponse<ErpInventoryResponse[]>> {
    return this.get<ErpInventoryResponse[]>('/inventory', {
      skuCode,
      ...(warehouseCode && { warehouseCode }),
    })
  }

  /** 批量同步SKU */
  async syncSkus(skus: Array<{
    skuCode: string
    skuName: string
    category?: string
  }>): Promise<ApiResponse<ErpSyncResult>> {
    return this.post<ErpSyncResult>('/skus/batch-sync', { skus })
  }
}
