import { z } from 'zod'

// 收货模式枚举
export const ReceivingMode = {
  SKU: 'SKU',
  CONTAINER: 'CONTAINER',
  DIRECT_PUTAWAY: 'DIRECT_PUTAWAY',
} as const

// 质量状态枚举
export const QualityStatus = {
  GOOD: 'GOOD',
  DAMAGED: 'DAMAGED',
} as const

// 容器来源类型枚举
export const ContainerSourceType = {
  INTERNAL_MANAGED: 'INTERNAL_MANAGED',
  INTERNAL_TEMP: 'INTERNAL_TEMP',
  EXTERNAL_ASN: 'EXTERNAL_ASN',
} as const

// 短收处理方式枚举
export const ShortReceiveHandling = {
  CLOSE_ASN: 'CLOSE_ASN',
  KEEP_OPEN: 'KEEP_OPEN',
  CREATE_BACKORDER: 'CREATE_BACKORDER',
  NOTIFY_ONLY: 'NOTIFY_ONLY',
} as const

// 上架方式枚举
export const PutawayMethod = {
  PUTAWAY_TASK: 'PUTAWAY_TASK', // 生成上架任务
  CONTAINER: 'CONTAINER', // 放入内部容器
  NONE: 'NONE', // 不处理
} as const

// 条码查询参数 Schema
export const lookupSkuQuerySchema = z.object({
  barcode: z.string().min(1, '条码不能为空').max(128, '条码最多128个字符'),
  asnId: z.string().uuid('ASN ID格式错误'),
})

// 开始收货 Schema
export const startReceivingSchema = z.object({
  receivingMode: z
    .enum(['SKU', 'CONTAINER', 'DIRECT_PUTAWAY'], {
      errorMap: () => ({ message: '无效的收货模式' }),
    })
    .default('SKU'),
  containerId: z.string().uuid('容器ID格式错误').optional().nullable(),
  receivingDockId: z.string().uuid('收货月台ID格式错误').optional().nullable(),
})

// 提交收货 Schema
export const submitReceivingSchema = z.object({
  asnLineId: z.string().uuid('ASN明细ID格式错误'),
  receivedQty: z.coerce.number().int().positive('收货数量必须为正整数'),
  qualityStatus: z
    .enum(['GOOD', 'DAMAGED'], {
      errorMap: () => ({ message: '无效的质量状态' }),
    })
    .default('GOOD'),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  productionDate: z.coerce.date().optional().nullable(),
  serialNumbers: z.array(z.string().max(128, '序列号最多128个字符')).optional().default([]),
  containerId: z.string().uuid('容器ID格式错误').optional().nullable(),
  containerCode: z.string().max(32, '容器编码最多32个字符').optional().nullable(),
  containerType: z
    .enum(['INTERNAL_MANAGED', 'INTERNAL_TEMP', 'EXTERNAL_ASN'], {
      errorMap: () => ({ message: '无效的容器类型' }),
    })
    .optional()
    .nullable(),
  receivingMode: z
    .enum(['SKU', 'CONTAINER', 'DIRECT_PUTAWAY'], {
      errorMap: () => ({ message: '无效的收货模式' }),
    })
    .default('SKU'),
  targetLocationId: z.string().uuid('目标库位ID格式错误').optional().nullable(),
  deviceType: z.enum(['PC', 'PDA']).optional().nullable(),
  deviceId: z.string().max(64, '设备ID最多64个字符').optional().nullable(),
  idempotencyKey: z.string().max(64, '幂等键最多64个字符').optional().nullable(),
  notes: z.string().max(500, '备注最多500个字符').optional().nullable(),
})

// 完成收货 Schema
export const completeReceivingSchema = z.object({
  createDiscrepancy: z.boolean().default(true),
  reasonCode: z.string().max(32, '原因码最多32个字符').optional().nullable(),
  handlingMethod: z
    .enum(['CLOSE_ASN', 'KEEP_OPEN', 'CREATE_BACKORDER', 'NOTIFY_ONLY'], {
      errorMap: () => ({ message: '无效的处理方式' }),
    })
    .optional()
    .nullable(),
  notes: z.string().max(500, '备注最多500个字符').optional().nullable(),
  // 上架方式相关字段
  putawayMethod: z
    .enum(['PUTAWAY_TASK', 'CONTAINER', 'NONE'], {
      errorMap: () => ({ message: '无效的上架方式' }),
    })
    .default('NONE'),
  containerId: z.string().uuid('容器ID格式错误').optional().nullable(),
  createPutawayTasks: z.boolean().default(false),
})

// 容器扫描验证 Schema
export const scanContainerSchema = z.object({
  containerCode: z.string().min(1, '容器编码不能为空').max(32, '容器编码最多32个字符'),
  asnId: z.string().uuid('ASN ID格式错误'),
  warehouseId: z.string().uuid('仓库ID格式错误'),
})

// 创建临时容器 Schema
export const createTempContainerSchema = z.object({
  warehouseId: z.string().uuid('仓库ID格式错误'),
  containerType: z.enum(['CARTON', 'TOTE', 'PALLET']).default('CARTON'),
  asnId: z.string().uuid('ASN ID格式错误').optional().nullable(),
})

// 收货配置 Schema
export const receivingConfigSchema = z.object({
  clientId: z.string().uuid('客户ID格式错误').optional().nullable(),
  warehouseId: z.string().uuid('仓库ID格式错误').optional().nullable(),
  configName: z.string().min(1, '配置名称不能为空').max(64, '配置名称最多64个字符'),
  tolerancePercent: z.coerce.number().min(0).max(100).default(0),
  shortReceiveHandling: z
    .enum(['CLOSE_ASN', 'KEEP_OPEN', 'CREATE_BACKORDER', 'NOTIFY_ONLY'])
    .default('CLOSE_ASN'),
  containerSingleAsn: z.boolean().default(true),
  containerSingleSku: z.boolean().default(true),
  containerSingleBatch: z.boolean().default(true),
  returnAsnMixAllowed: z.boolean().default(true),
  forceFirstReceiveDimensions: z.boolean().default(true),
  syncDimensionsToErp: z.boolean().default(false),
  qualitySeparationEnabled: z.boolean().default(true),
  directPutawayEnabled: z.boolean().default(false),
  priority: z.coerce.number().int().min(1).max(1000).default(100),
  isActive: z.boolean().default(true),
})

// 短收原因码 Schema
export const shortReceiveReasonCodeSchema = z.object({
  code: z.string().min(1, '原因码不能为空').max(32, '原因码最多32个字符').regex(/^[A-Z][A-Z0-9_]*$/, {
    message: '编码必须以大写字母开头，只能包含大写字母、数字和下划线',
  }),
  description: z.string().min(1, '描述不能为空').max(256, '描述最多256个字符'),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

// 类型导出
export type LookupSkuQuery = z.infer<typeof lookupSkuQuerySchema>
export type StartReceivingInput = z.infer<typeof startReceivingSchema>
export type SubmitReceivingInput = z.infer<typeof submitReceivingSchema>
export type CompleteReceivingInput = z.infer<typeof completeReceivingSchema>
export type ScanContainerInput = z.infer<typeof scanContainerSchema>
export type CreateTempContainerInput = z.infer<typeof createTempContainerSchema>
export type ReceivingConfigInput = z.infer<typeof receivingConfigSchema>
export type ShortReceiveReasonCodeInput = z.infer<typeof shortReceiveReasonCodeSchema>
