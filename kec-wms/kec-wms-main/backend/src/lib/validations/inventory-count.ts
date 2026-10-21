import { z } from 'zod'

export const InventoryCountOrderType = {
  FULL: 'FULL',
  LOCATION: 'LOCATION',
  SKU: 'SKU',
  CYCLE: 'CYCLE',
} as const

export const InventoryCountMode = {
  BLIND: 'BLIND',
  OPEN: 'OPEN',
} as const

export const InventoryCountOrderStatus = {
  DRAFT: 'DRAFT',
  PENDING_SCOPE: 'PENDING_SCOPE',
  GENERATING_SCOPE: 'GENERATING_SCOPE',
  SCOPE_FAILED: 'SCOPE_FAILED',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_ADJUST: 'PENDING_ADJUST',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export const InventoryCountOwnerScopeMode = {
  ALL: 'ALL',
  PARTIAL: 'PARTIAL',
} as const

export const InventoryCountSaveMode = {
  DRAFT: 'DRAFT',
  PENDING_SCOPE: 'PENDING_SCOPE',
} as const

export const InventoryCountSplitRule = {
  BY_LOCATION: 'BY_LOCATION',
} as const

export const InventoryCountSelectableStatuses = {
  AVAILABLE: 'AVAILABLE',
  FROZEN: 'FROZEN',
  DEFECTIVE: 'DEFECTIVE',
} as const

const forbiddenCountScopeStatuses = ['QC_HOLD', 'COUNT_HOLD', 'COUNT_SURPLUS', 'COUNT_SHORTAGE']

const inventoryStatusSchema = z.string().trim().min(1).max(32)

export const inventoryCountListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  warehouseId: z.string().uuid().nullish().transform((value) => value ?? undefined),
  orderType: z.enum([
    InventoryCountOrderType.FULL,
    InventoryCountOrderType.LOCATION,
    InventoryCountOrderType.SKU,
    InventoryCountOrderType.CYCLE,
  ]).nullish().transform((value) => value ?? undefined),
  status: z.enum([
    InventoryCountOrderStatus.DRAFT,
    InventoryCountOrderStatus.PENDING_SCOPE,
    InventoryCountOrderStatus.GENERATING_SCOPE,
    InventoryCountOrderStatus.SCOPE_FAILED,
    InventoryCountOrderStatus.READY,
    InventoryCountOrderStatus.IN_PROGRESS,
    InventoryCountOrderStatus.PENDING_ADJUST,
    InventoryCountOrderStatus.COMPLETED,
    InventoryCountOrderStatus.CANCELLED,
  ]).nullish().transform((value) => value ?? undefined),
  search: z.string().max(100).nullish().transform((value) => value ?? undefined),
  plannedStart: z.string().datetime().nullish().transform((value) => value ?? undefined),
  plannedEnd: z.string().datetime().nullish().transform((value) => value ?? undefined),
  sortBy: z.enum(['createdAt', 'plannedAt', 'orderNumber']).nullish().transform((value) => value ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((value) => value ?? 'desc'),
})

export const ownerScopeConfigSchema = z.object({
  mode: z.enum([
    InventoryCountOwnerScopeMode.ALL,
    InventoryCountOwnerScopeMode.PARTIAL,
  ]),
  clientIds: z.array(z.string().uuid()).default([]),
  clientNames: z.array(z.string().max(128)).default([]),
})

const scopeConfigSchema = z.object({
  inventoryStatuses: z.array(inventoryStatusSchema).default([]),
  startLocationCode: z.string().trim().max(32).optional(),
  endLocationCode: z.string().trim().max(32).optional(),
  zoneId: z.string().uuid().optional(),
  zoneName: z.string().trim().max(128).optional(),
  aisle: z.string().trim().max(8).optional(),
  rack: z.string().trim().max(8).optional(),
  shelfStart: z.string().trim().max(8).optional(),
  shelfEnd: z.string().trim().max(8).optional(),
  skuCodes: z.array(z.string().trim().min(1).max(64)).default([]),
  cycleDays: z.coerce.number().int().positive().optional(),
  calendarCode: z.string().trim().max(64).optional(),
  timeWindow: z.string().trim().max(64).optional(),
  excludeRules: z.string().trim().max(500).optional(),
  maxLocationsPerBatch: z.coerce.number().int().positive().optional(),
})

const executionConfigSchema = z.object({
  splitRule: z.enum([InventoryCountSplitRule.BY_LOCATION]).default(InventoryCountSplitRule.BY_LOCATION),
  counterUserId: z.string().uuid().optional(),
  reviewerUserId: z.string().uuid().optional(),
  allowPrint: z.boolean().default(false),
  pdaMode: z.enum([InventoryCountMode.BLIND, InventoryCountMode.OPEN]).default(InventoryCountMode.BLIND),
})

export const createInventoryCountSchema = z.object({
  saveMode: z.enum([InventoryCountSaveMode.DRAFT, InventoryCountSaveMode.PENDING_SCOPE]),
  orderName: z.string().trim().max(128, '盘点单名称不能超过128字符').optional(),
  orderType: z.enum([
    InventoryCountOrderType.FULL,
    InventoryCountOrderType.LOCATION,
    InventoryCountOrderType.SKU,
    InventoryCountOrderType.CYCLE,
  ]),
  countMode: z.enum([InventoryCountMode.BLIND, InventoryCountMode.OPEN]),
  warehouseId: z.string().uuid('仓库ID格式错误'),
  plannedAt: z.string().datetime('计划执行时间格式错误'),
  remark: z.string().trim().max(500, '备注不能超过500字符').nullish().transform((value) => value ?? undefined),
  ownerScopeMode: z.enum([
    InventoryCountOwnerScopeMode.ALL,
    InventoryCountOwnerScopeMode.PARTIAL,
  ]),
  clientIds: z.array(z.string().uuid()).default([]),
  scopeConfig: scopeConfigSchema,
  executionConfig: executionConfigSchema,
}).superRefine((data, ctx) => {
  if (
    data.executionConfig.counterUserId &&
    data.executionConfig.reviewerUserId &&
    data.executionConfig.counterUserId === data.executionConfig.reviewerUserId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['executionConfig', 'reviewerUserId'],
      message: '盘点人和复盘人不能是同一个人',
    })
  }

  if (!data.scopeConfig.maxLocationsPerBatch) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scopeConfig', 'maxLocationsPerBatch'],
      message: '必须填写单批最大库位数',
    })
  }

  if (data.ownerScopeMode === InventoryCountOwnerScopeMode.PARTIAL && data.clientIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clientIds'],
      message: '指定货主范围时至少选择一个客户',
    })
  }

  if (data.orderType === InventoryCountOrderType.FULL) {
    if (data.scopeConfig.inventoryStatuses.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeConfig', 'inventoryStatuses'],
        message: '全盘盘点至少选择一个库存状态',
      })
    }
  }

  if (data.scopeConfig.inventoryStatuses.some((status) => forbiddenCountScopeStatuses.includes(status))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scopeConfig', 'inventoryStatuses'],
      message: '盘点范围不允许选择盘点暂扣或盘点差异库存',
    })
  }

  if (data.orderType === InventoryCountOrderType.LOCATION) {
    const hasLegacyLocationRange = !!data.scopeConfig.startLocationCode && !!data.scopeConfig.endLocationCode
    const hasStructuredLocationRange = !!data.scopeConfig.zoneId && !!data.scopeConfig.aisle && !!data.scopeConfig.rack
    if (!hasLegacyLocationRange && !hasStructuredLocationRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeConfig'],
        message: '按库位盘点必须设置库区、通道、货架，或保留旧库位编码范围',
      })
    }
  }

  if (data.orderType === InventoryCountOrderType.SKU && data.scopeConfig.skuCodes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scopeConfig', 'skuCodes'],
      message: '按 SKU 盘点至少填写一个 SKU',
    })
  }

  if (data.orderType === InventoryCountOrderType.CYCLE) {
    if (!data.scopeConfig.cycleDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeConfig', 'cycleDays'],
        message: '循环盘点必须填写周期天数',
      })
    }
  }
})

export const submitInventoryCountLineSchema = z.object({
  countedQuantity: z.coerce.number().int().min(0, '实盘数量不能小于 0'),
  isEmptyLocation: z.boolean().default(false),
  exceptionReasonCode: z.string().trim().max(64).nullish().transform((value) => value || undefined),
  remark: z.string().trim().max(500).nullish().transform((value) => value || undefined),
  scanPayload: z.record(z.unknown()).optional(),
  detailIds: z.array(z.string().uuid()).default([]),
  scope: z.object({
    locationId: z.string().uuid('库位ID格式错误'),
    skuId: z.string().uuid('SKU ID格式错误'),
    lpn: z.string().trim().default(''),
    batchNumber: z.string().trim().default(''),
    bucketType: z.string().trim().min(1),
    expiryDateKey: z.string().trim().min(1),
  }).optional(),
  roundType: z.enum(['FIRST', 'RECOUNT']).optional(),
})

export const generateInventoryCountRecountsSchema = z.object({
  detailIds: z.array(z.string().uuid()).default([]),
})

export const confirmInventoryCountDifferencesSchema = z.object({
  detailIds: z.array(z.string().uuid()).default([]),
})

export const updateInventoryCountBatchAssigneeSchema = z.object({
  assigneeUserId: z.string().uuid().nullable().optional(),
})

export const bulkUpdateInventoryCountBatchAssigneesSchema = z.object({
  batchIds: z.array(z.string().uuid()).min(1, '请选择要切换盘点人的批次'),
  assigneeUserId: z.string().uuid().nullable().optional(),
})

export const completeInventoryCountDisposalSchema = z.object({
  targetLocationCode: z.string().trim().min(1, '暂存货位不能为空').max(32, '暂存货位最多32个字符'),
})

export type InventoryCountListQuery = z.infer<typeof inventoryCountListQuerySchema>
export type CreateInventoryCountInput = z.infer<typeof createInventoryCountSchema>
export type InventoryCountOwnerScopeConfig = z.infer<typeof ownerScopeConfigSchema>
export type InventoryCountScopeConfig = z.infer<typeof scopeConfigSchema>
export type InventoryCountExecutionConfig = z.infer<typeof executionConfigSchema>
export type SubmitInventoryCountLineInput = z.infer<typeof submitInventoryCountLineSchema>
export type GenerateInventoryCountRecountsInput = z.infer<typeof generateInventoryCountRecountsSchema>
export type ConfirmInventoryCountDifferencesInput = z.infer<typeof confirmInventoryCountDifferencesSchema>
export type UpdateInventoryCountBatchAssigneeInput = z.infer<typeof updateInventoryCountBatchAssigneeSchema>
export type BulkUpdateInventoryCountBatchAssigneesInput = z.infer<typeof bulkUpdateInventoryCountBatchAssigneesSchema>
export type CompleteInventoryCountDisposalInput = z.infer<typeof completeInventoryCountDisposalSchema>
