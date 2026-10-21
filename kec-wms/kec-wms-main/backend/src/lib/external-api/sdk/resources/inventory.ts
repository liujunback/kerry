/**
 * 库存资源
 */

import type { ApiResponse } from '../../types'
import { HttpClient } from '../../core/http-client'

export interface InventoryItem {
  id: string
  warehouseId: string
  locationId: string
  zoneId: string
  skuId: string
  skuCode: string
  skuName: string
  batchNumber: string
  lpn: string
  asnNumber: string
  quantityAvailable: number
  quantityAllocated: number
  quantityPicking: number
  quantityFrozen: number
  quantityDefective: number
  quantityException: number
  quantityQcHold: number
  quantityCountHold: number
  quantityCountSurplus: number
  quantityCountShortage: number
  expiryDate?: string | null
  fifoDate?: string | null
  updatedAt: string
  lockStatus: string
  warehouse: { id: string; warehouseCode: string; warehouseName: string } | null
  location: { id: string; locationCode: string; locationType: string | null } | null
  zone: { id: string; zoneCode: string; zoneName: string | null } | null
  sku: { id: string; skuCode: string; skuName: string; barcode: string | null } | null
  client: { id: string; clientCode: string; clientName: string } | null
}

export interface InventoryQueryParams {
  skuCode?: string
  clientCode?: string
  warehouseCode?: string
  locationCode?: string
  batchNo?: string
  batchNumber?: string
  page?: number
  pageSize?: number
}

export interface InventoryQueryResponse {
  data: InventoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface InventoryTransactionItem {
  id: string
  eventNumber: string
  eventType: string
  bucketType: string
  quantityDelta: number
  quantityBefore: number
  quantityAfter: number
  batchNumber: string
  lpn: string
  asnNumber: string
  referenceType?: string | null
  referenceId?: string | null
  referenceNumber?: string | null
  eventDate: string
  createdAt: string
  warehouse: { id: string; warehouseCode: string; warehouseName: string }
  location: { id: string; locationCode: string }
  sku: { id: string; skuCode: string; skuName: string }
  client: { id: string; clientCode: string; clientName: string } | null
}

export interface InventoryTransactionQueryParams {
  warehouseCode?: string
  clientCode?: string
  locationCode?: string
  skuCode?: string
  eventType?: string
  referenceType?: string
  referenceNumber?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface InventoryTransactionQueryResponse {
  data: InventoryTransactionItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export class InventoryResource {
  private client: HttpClient
  private tenantCode?: string

  constructor(client: HttpClient, tenantCode?: string) {
    this.client = client
    this.tenantCode = tenantCode
  }

  /** 查询库存 */
  async query(
    params: InventoryQueryParams
  ): Promise<ApiResponse<InventoryQueryResponse>> {
    return this.client.get<InventoryQueryResponse>(
      '/inventory',
      params as Record<string, string | number | boolean>
    )
  }

  /** 查询库存流水 */
  async queryTransactions(
    params: InventoryTransactionQueryParams
  ): Promise<ApiResponse<InventoryTransactionQueryResponse>> {
    return this.client.get<InventoryTransactionQueryResponse>(
      '/inventory/transactions',
      params as Record<string, string | number | boolean>
    )
  }

  /** 获取SKU库存汇总 */
  async getSkuSummary(
    skuCode: string,
    warehouseCode?: string
  ): Promise<ApiResponse<{
    skuCode: string
    totalQty: number
    availableQty: number
    reservedQty: number
  }>> {
    return this.client.get('/inventory/summary', {
      skuCode,
      ...(warehouseCode && { warehouseCode }),
    })
  }

  /** 检查库存可用性 */
  async checkAvailability(items: Array<{
    skuCode: string
    quantity: number
    warehouseCode?: string
  }>): Promise<ApiResponse<{
    available: boolean
    items: Array<{
      skuCode: string
      requested: number
      available: number
      shortage: number
    }>
  }>> {
    return this.client.post('/inventory/check-availability', { items })
  }
}
