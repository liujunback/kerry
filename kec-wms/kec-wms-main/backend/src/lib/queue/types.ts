/**
 * 队列类型定义
 */

import {
  JobType,
  JobStatus,
  DataUploadSubType,
  ReportExportSubType,
} from './config'

// 任务上下文
export interface JobContext {
  tenantId: string
  userId: string
  jobId: string
}

// 进度更新
export interface ProgressUpdate {
  progress: number
  message?: string
  processedCount?: number
  totalCount?: number
  successCount?: number
  failedCount?: number
}

// 基础任务数据
export interface BaseJobData {
  tenantId: string
  userId: string
  jobId: string
}

// 库存分配任务数据
export interface InventoryAllocationJobData extends BaseJobData {
  orderIds: string[]
  warehouseId: string
  allocationStrategy: 'FIFO' | 'FEFO' | 'LIFO'
  allocationMode?: 'FAST' | 'FAIR' // FAST=快速（默认）, FAIR=先到先得
}

// 库存分配结果
export interface InventoryAllocationResult {
  totalOrders: number
  allocatedOrders: number
  failedOrders: number
  details: Array<{
    orderId: string
    orderNumber: string
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
    message?: string
  }>
}

// 盘点范围生成任务数据
export interface InventoryCountScopeJobData extends BaseJobData {
  orderId: string
  warehouseId?: string
}

// 盘点范围生成结果
export interface InventoryCountScopeResult {
  orderId: string
  status: 'READY'
}

export interface WaveStrategyExecuteJobData extends BaseJobData {
  runId: string
  strategyId: string
  warehouseId: string
  operatorName?: string | null
}

export interface WaveStrategyExecuteResult {
  runId: string
  status: 'SUCCESS'
  createdWaveCount: number
  createdPickOrderCount: number
  candidateOrderCount: number
  matchedOrderCount: number
  claimedByHigherCount: number
  unclassifiedOrderCount: number
  phaseDurationsMs: {
    candidateQuery: number
    classify: number
    wavePersist: number
    release: number
    total: number
  }
}

export interface WaveReleaseJobData extends BaseJobData {
  runId: string
  warehouseId: string
  waveIds: string[]
  operatorId?: string | null
  operatorName?: string | null
}

export interface WaveReleaseResult {
  runId: string
  releasedWaveCount: number
  createdPickOrderCount: number
  failedWaveIds: string[]
  failedWaves: Array<{
    waveId: string
    errorMessage: string
    errorStack?: string
  }>
}

// 报表导出任务数据
export interface ReportExportJobData extends BaseJobData {
  reportType: ReportExportSubType
  filters: Record<string, unknown>
  format: 'xlsx' | 'csv'
  columns?: string[]
}

// 报表导出结果
export interface ReportExportResult {
  filePath: string
  fileName: string
  fileSize: number
  rowCount: number
  expiresAt: Date
}

// 数据上传任务数据
export interface DataUploadJobData extends BaseJobData {
  subType: DataUploadSubType
  warehouseId: string
  clientId: string
  filePath?: string
  records: unknown[]
}

// 数据上传结果
export interface DataUploadResult {
  totalRecords: number
  successCount: number
  failedCount: number
  createdIds: string[]
  errors: Array<{
    index: number
    error: string
  }>
}

// 库存上传记录
export interface InventoryUploadRecord {
  locationCode: string
  skuCode: string
  quantity: number
  lotNumber?: string
  batchNumber?: string
  expiryDate?: string
}

// 货位上传记录
export interface LocationUploadRecord {
  locationCode: string
  zoneCode: string
  locationType?: string
  aisle?: string
  rack?: string
  shelf?: string
  bin?: string
  isPickable?: boolean
  isReceivable?: boolean
}

// 供应商上传记录
export interface SupplierUploadRecord {
  supplierCode: string
  supplierName: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
}

// 承运商上传记录
export interface CarrierUploadRecord {
  carrierCode: string
  carrierName: string
  carrierType?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  trackingUrl?: string
}

// 货态推送任务数据
export interface ShipmentStatusPushJobData extends BaseJobData {
  shipmentIds: string[]
  targetSystem: string
  webhookUrl?: string
}

// 货态推送结果
export interface ShipmentStatusPushResult {
  totalShipments: number
  successCount: number
  failedCount: number
  details: Array<{
    shipmentId: string
    status: 'SUCCESS' | 'FAILED'
    message?: string
  }>
}

export interface InventoryEventPushJobData extends BaseJobData {
  eventIds: string[]
}

export interface InventoryEventPushResult {
  totalEvents: number
  pushedCount: number
  failedCount: number
  details: Array<{
    eventId: string
    webhookId: string
    status: 'SUCCESS' | 'FAILED'
    message?: string
  }>
}

// 创建任务请求
export interface CreateJobRequest {
  jobType: JobType
  jobSubType?: DataUploadSubType
  jobName: string
  description?: string
  priority?: number
  attempts?: number
  inputData: Record<string, unknown>
  warehouseId?: string
  clientId?: string
  scheduledAt?: Date
}

// 任务查询参数
export interface JobQueryParams {
  tenantId: string
  jobType?: JobType
  status?: JobStatus
  warehouseId?: string
  clientId?: string
  createdBy?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}
