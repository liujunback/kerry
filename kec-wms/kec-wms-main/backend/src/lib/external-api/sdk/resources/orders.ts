/**
 * 订单资源
 */

import type { ApiResponse } from '../../types'
import { HttpClient } from '../../core/http-client'

export type OrderStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'PENDING_PICK'
  | 'PICKING'
  | 'PICKED'
  | 'SORTING'
  | 'SORTED'
  | 'PACKING'
  | 'PACKED'
  | 'CHECKOUT_PENDING'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'ON_HOLD'

export interface OrderLine {
  skuCode: string
  orderedQty: number
  uomCode?: string
  unitPrice?: number
  batchNumber?: string
  notes?: string
}

export interface Address {
  contactName: string
  contactPhone?: string
  contactEmail?: string
  addressLine: string
  city?: string
  province?: string
  country?: string
  postalCode?: string
}

export interface CreateOrderRequest {
  clientCode: string
  warehouseCode: string
  orderNumber?: string
  referenceNumber?: string
  platformOrderNumber?: string
  orderType?: string
  orderSource?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  address: Address
  shippingMethod?: string
  expectedShipDate?: string
  expectedDeliveryDate?: string
  notes?: string
  lines: OrderLine[]
}

export interface OrderResponse {
  orderNumber: string
  referenceNumber?: string
  platformOrderNumber?: string
  status: OrderStatus
  priority: string
  orderType: string
  orderSource: string
  address?: Address
  shippingMethod?: string
  trackingNumber?: string
  expectedShipDate?: string
  expectedDeliveryDate?: string
  actualShipAt?: string
  totalOrderedQty: number
  totalAllocatedQty: number
  totalPickedQty: number
  totalPackedQty: number
  totalShippedQty: number
  totalSkuCount: number
  notes?: string
  client: {
    clientCode: string
    clientName: string
  }
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  lines: Array<{
    lineNumber: number
    skuCode: string
    skuName: string
    orderedQty: number
    allocatedQty: number
    pickedQty: number
    packedQty: number
    shippedQty: number
    uomCode?: string
    unitPrice?: number
    lineAmount?: number
    batchNumber?: string
    status: string
  }>
  createdAt: string
  updatedAt: string
}

export interface UpdateOrderRequest {
  clientCode?: string
  referenceNumber?: string
  platformOrderNumber?: string
  orderType?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  address?: Partial<Address>
  shippingMethod?: string
  expectedShipDate?: string
  expectedDeliveryDate?: string
  notes?: string
}

export class OrderResource {
  private client: HttpClient
  private tenantCode?: string

  constructor(client: HttpClient, tenantCode?: string) {
    this.client = client
    this.tenantCode = tenantCode
  }

  /** 创建订单 */
  async create(data: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> {
    return this.client.post<OrderResponse>('/outbound-orders', data)
  }

  /** 根据外部单号获取订单 */
  async getByExternalNumber(
    externalNumber: string,
    clientCode?: string
  ): Promise<ApiResponse<OrderResponse>> {
    const body: Record<string, string> = {}
    if (clientCode) body.clientCode = clientCode
    return this.client.get<OrderResponse>(
      `/outbound-orders/by-number/${encodeURIComponent(externalNumber)}`,
      undefined,
      { body }
    )
  }

  /** 根据外部单号更新订单 */
  async updateByExternalNumber(
    externalNumber: string,
    data: UpdateOrderRequest
  ): Promise<ApiResponse<OrderResponse>> {
    return this.client.put<OrderResponse>(
      `/outbound-orders/by-number/${encodeURIComponent(externalNumber)}`,
      data
    )
  }

  /** 根据外部单号取消订单 */
  async cancelByExternalNumber(
    externalNumber: string,
    reason: string,
    clientCode?: string
  ): Promise<ApiResponse<OrderResponse>> {
    const body: Record<string, string> = { reason }
    if (clientCode) body.clientCode = clientCode
    return this.client.post<OrderResponse>(
      `/outbound-orders/by-number/${encodeURIComponent(externalNumber)}/cancel`,
      body
    )
  }

  /** 根据外部单号删除订单 */
  async deleteByExternalNumber(
    externalNumber: string,
    clientCode?: string
  ): Promise<ApiResponse<void>> {
    const body: Record<string, string> = {}
    if (clientCode) body.clientCode = clientCode
    return this.client.delete<void>(
      `/outbound-orders/by-number/${encodeURIComponent(externalNumber)}`,
      { body }
    )
  }
}
