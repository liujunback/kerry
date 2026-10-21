/**
 * ASN资源
 */

import type { ApiResponse } from '../../types'
import { HttpClient } from '../../core/http-client'

// ASN类型定义
export type AsnType = 'NORMAL' | 'RETURN' | 'TRANSFER' | 'PRODUCTION' | 'ADJUSTMENT'
export type AsnStatus = 'CREATED' | 'PENDING_RECEIVING' | 'RECEIVING' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED'

export interface AsnLine {
  skuCode: string
  expectedQty: number
  batchNumber?: string
  expiryDate?: string
}

export interface CreateAsnRequest {
  tenantCode: string
  warehouseCode: string
  clientCode: string
  externalNumber: string
  asnType: AsnType
  expectedArrivalDate?: string
  notes?: string
  lines: AsnLine[]
}

export interface AsnResponse {
  id: string
  asnNumber: string
  externalNumber: string
  asnType: AsnType
  status: AsnStatus
  totalExpectedQty: number
  totalReceivedQty: number
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  asnLines: Array<{
    id: string
    lineNumber: number
    skuCode: string
    skuName: string
    expectedQty: number
    receivedQty: number
    status: string
  }>
  createdAt: string
  updatedAt: string
}

export class AsnResource {
  private client: HttpClient
  private tenantCode?: string

  constructor(client: HttpClient, tenantCode?: string) {
    this.client = client
    this.tenantCode = tenantCode
  }

  /** 创建ASN */
  async create(data: CreateAsnRequest): Promise<ApiResponse<AsnResponse>> {
    const requestData = {
      ...data,
      tenantCode: data.tenantCode || this.tenantCode,
    }
    return this.client.post<AsnResponse>('/asn', requestData)
  }

  /** 获取ASN详情 */
  async get(asnId: string): Promise<ApiResponse<AsnResponse>> {
    return this.client.get<AsnResponse>(`/asn/${asnId}`)
  }

  /** 根据ASN编号获取 */
  async getByNumber(asnNumber: string): Promise<ApiResponse<AsnResponse>> {
    return this.client.get<AsnResponse>('/asn', { search: asnNumber })
  }

  /** 获取ASN列表 */
  async list(params?: {
    page?: number
    pageSize?: number
    status?: AsnStatus
    warehouseCode?: string
    clientCode?: string
  }): Promise<ApiResponse<{ data: AsnResponse[]; total: number }>> {
    return this.client.get<{ data: AsnResponse[]; total: number }>('/asn', params)
  }

  /** 取消ASN */
  async cancel(asnId: string, reason?: string): Promise<ApiResponse<AsnResponse>> {
    return this.client.post<AsnResponse>(`/asn/${asnId}/cancel`, { reason })
  }

  /** 查询ASN状态 */
  async getStatus(asnId: string): Promise<ApiResponse<{ status: AsnStatus }>> {
    return this.client.get<{ status: AsnStatus }>(`/asn/${asnId}/status`)
  }
}
