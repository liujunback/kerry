/**
 * 队列配置
 */

function readNumberEnv(name: string, fallback: number, options?: { min?: number; max?: number }) {
  const raw = process.env[name]
  const value = raw ? Number(raw) : NaN

  if (!Number.isFinite(value)) {
    return fallback
  }

  if (options?.min !== undefined && value < options.min) {
    return options.min
  }

  if (options?.max !== undefined && value > options.max) {
    return options.max
  }

  return value
}

export const QUEUE_RUNTIME_CONFIG = {
  jobCreateLockTtlMs: readNumberEnv('QUEUE_JOB_CREATE_LOCK_TTL_MS', 60000, { min: 1000 }),
  jobCreateLockRetryCount: readNumberEnv('QUEUE_JOB_CREATE_LOCK_RETRY_COUNT', 1200, { min: 0 }),
  jobCreateLockRetryDelayMs: readNumberEnv('QUEUE_JOB_CREATE_LOCK_RETRY_DELAY_MS', 100, { min: 0 }),
  allocationTxMaxWaitMs: readNumberEnv('QUEUE_INVENTORY_ALLOCATION_TX_MAX_WAIT_MS', 10000, { min: 1000 }),
  allocationTxTimeoutMs: readNumberEnv('QUEUE_INVENTORY_ALLOCATION_TX_TIMEOUT_MS', 30000, { min: 1000 }),
} as const

// 队列名称
export const QUEUE_NAMES = {
  INVENTORY_ALLOCATION: 'inventory-allocation',
  INVENTORY_SNAPSHOT: 'inventory-snapshot',
  INVENTORY_COUNT_SCOPE: 'inventory-count-scope',
  WAVE_STRATEGY_EXECUTE: 'wave-strategy-execute',
  WAVE_RELEASE: 'wave-release',
  REPORT_EXPORT: 'report-export',
  DATA_UPLOAD: 'data-upload',
  SHIPMENT_STATUS_PUSH: 'shipment-status-push',
  INVENTORY_EVENT_PUSH: 'inventory-event-push',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// 任务类型
export const JOB_TYPES = {
  INVENTORY_ALLOCATION: 'INVENTORY_ALLOCATION',
  INVENTORY_SNAPSHOT: 'INVENTORY_SNAPSHOT',
  INVENTORY_COUNT_SCOPE: 'INVENTORY_COUNT_SCOPE',
  WAVE_STRATEGY_EXECUTE: 'WAVE_STRATEGY_EXECUTE',
  WAVE_RELEASE: 'WAVE_RELEASE',
  REPORT_EXPORT: 'REPORT_EXPORT',
  DATA_UPLOAD: 'DATA_UPLOAD',
  SHIPMENT_STATUS_PUSH: 'SHIPMENT_STATUS_PUSH',
  INVENTORY_EVENT_PUSH: 'INVENTORY_EVENT_PUSH',
} as const

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES]

// 数据上传子类型
export const DATA_UPLOAD_SUB_TYPES = {
  ASN: 'ASN',
  ORDER: 'ORDER',
  SKU: 'SKU',
  INVENTORY: 'INVENTORY',
  LOCATION: 'LOCATION',
  SUPPLIER: 'SUPPLIER',
  CARRIER: 'CARRIER',
} as const

export type DataUploadSubType =
  (typeof DATA_UPLOAD_SUB_TYPES)[keyof typeof DATA_UPLOAD_SUB_TYPES]

// 报表导出子类型
export const REPORT_EXPORT_SUB_TYPES = {
  INVENTORY: 'INVENTORY',
  TRANSACTIONS: 'TRANSACTIONS',
  ORDERS: 'ORDERS',
  ASN: 'ASN',
  SHIPMENTS: 'SHIPMENTS',
  SKU: 'SKU',
  CLIENT: 'CLIENT',
} as const

export type ReportExportSubType =
  (typeof REPORT_EXPORT_SUB_TYPES)[keyof typeof REPORT_EXPORT_SUB_TYPES]

// 任务状态
export const JOB_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS]

// 队列配置
export const QUEUE_CONFIG = {
  // 默认任务选项
  defaultJobOptions: {
    attempts: readNumberEnv('QUEUE_JOB_ATTEMPTS', 3, { min: 1 }),
    backoff: {
      type: 'exponential' as const,
      delay: readNumberEnv('QUEUE_JOB_BACKOFF_DELAY_MS', 1000, { min: 0 }),
    },
    removeOnComplete: {
      age: readNumberEnv('QUEUE_JOB_REMOVE_ON_COMPLETE_AGE_SEC', 24 * 3600, { min: 0 }),
      count: readNumberEnv('QUEUE_JOB_REMOVE_ON_COMPLETE_COUNT', 1000, { min: 0 }),
    },
    removeOnFail: {
      age: readNumberEnv('QUEUE_JOB_REMOVE_ON_FAIL_AGE_SEC', 7 * 24 * 3600, { min: 0 }),
    },
  },

  // 各队列配置
  queues: {
    [QUEUE_NAMES.INVENTORY_ALLOCATION]: {
      concurrency: readNumberEnv('QUEUE_INVENTORY_ALLOCATION_CONCURRENCY', 10, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_INVENTORY_ALLOCATION_LIMITER_MAX', 500, { min: 1 }),
        duration: readNumberEnv('QUEUE_INVENTORY_ALLOCATION_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.INVENTORY_SNAPSHOT]: {
      concurrency: readNumberEnv('QUEUE_INVENTORY_SNAPSHOT_CONCURRENCY', 1, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_INVENTORY_SNAPSHOT_LIMITER_MAX', 5, { min: 1 }),
        duration: readNumberEnv('QUEUE_INVENTORY_SNAPSHOT_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.INVENTORY_COUNT_SCOPE]: {
      concurrency: readNumberEnv('QUEUE_INVENTORY_COUNT_SCOPE_CONCURRENCY', 1, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_INVENTORY_COUNT_SCOPE_LIMITER_MAX', 10, { min: 1 }),
        duration: readNumberEnv('QUEUE_INVENTORY_COUNT_SCOPE_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.WAVE_STRATEGY_EXECUTE]: {
      concurrency: readNumberEnv('QUEUE_WAVE_STRATEGY_EXECUTE_CONCURRENCY', 1, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_WAVE_STRATEGY_EXECUTE_LIMITER_MAX', 10, { min: 1 }),
        duration: readNumberEnv('QUEUE_WAVE_STRATEGY_EXECUTE_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.WAVE_RELEASE]: {
      concurrency: readNumberEnv('QUEUE_WAVE_RELEASE_CONCURRENCY', 1, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_WAVE_RELEASE_LIMITER_MAX', 10, { min: 1 }),
        duration: readNumberEnv('QUEUE_WAVE_RELEASE_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.REPORT_EXPORT]: {
      concurrency: readNumberEnv('QUEUE_REPORT_EXPORT_CONCURRENCY', 3, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_REPORT_EXPORT_LIMITER_MAX', 10, { min: 1 }),
        duration: readNumberEnv('QUEUE_REPORT_EXPORT_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.DATA_UPLOAD]: {
      concurrency: readNumberEnv('QUEUE_DATA_UPLOAD_CONCURRENCY', 2, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_DATA_UPLOAD_LIMITER_MAX', 5, { min: 1 }),
        duration: readNumberEnv('QUEUE_DATA_UPLOAD_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.SHIPMENT_STATUS_PUSH]: {
      concurrency: readNumberEnv('QUEUE_SHIPMENT_STATUS_PUSH_CONCURRENCY', 10, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_SHIPMENT_STATUS_PUSH_LIMITER_MAX', 200, { min: 1 }),
        duration: readNumberEnv('QUEUE_SHIPMENT_STATUS_PUSH_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
    [QUEUE_NAMES.INVENTORY_EVENT_PUSH]: {
      concurrency: readNumberEnv('QUEUE_INVENTORY_EVENT_PUSH_CONCURRENCY', 10, { min: 1 }),
      limiter: {
        max: readNumberEnv('QUEUE_INVENTORY_EVENT_PUSH_LIMITER_MAX', 500, { min: 1 }),
        duration: readNumberEnv('QUEUE_INVENTORY_EVENT_PUSH_LIMITER_DURATION_MS', 60000, { min: 1 }),
      },
    },
  },

  // 文件存储配置
  fileStorage: {
    basePath: process.env.JOB_FILES_PATH || './storage/jobs',
    maxFileAge: readNumberEnv('JOB_FILES_MAX_AGE_MS', 7 * 24 * 3600 * 1000, { min: 0 }),
    allowedExtensions: ['.xlsx', '.csv', '.json'],
  },
}
