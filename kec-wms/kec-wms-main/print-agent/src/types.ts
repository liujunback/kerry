// 设备连接配置
export interface DeviceConfig {
  connectionType: 'NETWORK' | 'USB' | 'BLUETOOTH' | 'VIRTUAL'
  printerName?: string
  ipAddress?: string
  port?: number
  usbVendorId?: number
  usbProductId?: number
}

declare global {
  namespace NodeJS {
    interface Process {
      pkg?: unknown
    }
  }
}

// 前端 → 中间件：打印请求
export interface PrintRequest {
  type: 'PRINT'
  jobId: string
  deviceConfig: DeviceConfig
  pdfBase64: string
  copies?: number
}

// 前端 → 中间件：测试设备连接
export interface TestDeviceRequest {
  type: 'TEST_DEVICE'
  deviceConfig: DeviceConfig
}

// 前端 → 中间件：查询中间件信息
export interface PingRequest {
  type: 'PING'
}

export type IncomingMessage = PrintRequest | TestDeviceRequest | PingRequest

// 中间件 → 前端：打印作业状态
export interface JobStatusMessage {
  type: 'JOB_STATUS'
  jobId: string
  status: 'QUEUED' | 'PRINTING' | 'SUCCESS' | 'FAILED'
  error?: string
}

// 中间件 → 前端：设备测试结果
export interface DeviceTestMessage {
  type: 'DEVICE_TEST'
  success: boolean
  error?: string
  latencyMs?: number
}

// 中间件 → 前端：心跳响应
export interface PongMessage {
  type: 'PONG'
  version: string
  uptime: number
}

export type OutgoingMessage = JobStatusMessage | DeviceTestMessage | PongMessage
