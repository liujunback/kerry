import { z } from 'zod'

const reasonCategoryValues = ['ALL', 'CLAIMED', 'FILTER_MISS', 'HOT_SKU', 'FIXED_COMBO', 'NON_FIXED_COMBO', 'ORDER_STRUCTURE_CLASSIFY'] as const
const waveStrategyRunOrderStatusValues = ['ALL', 'MATCHED', 'UNCLASSIFIED', 'SKIPPED', 'FAILED', 'WAVED'] as const

export const waveStrategyStatusSchema = z.enum(['DRAFT', 'ENABLED', 'DISABLED', 'ARCHIVED'])
export const waveStrategyVersionStatusSchema = z.enum(['EDITING', 'PUBLISHED', 'ROLLED_BACK', 'ABANDONED'])
export const waveStrategyRunModeSchema = z.enum(['SIMULATE', 'EXECUTE'])
export const waveStrategyRunStatusSchema = z.enum(['RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED'])
export const waveStrategyTriggerTypeSchema = z.enum(['MANUAL', 'SCHEDULED', 'API'])
export const waveStrategyPickModeSchema = z.enum(['BY_ORDER', 'SKU_BATCH', 'MIXED_BATCH', 'PICK_AND_SORT'])
export const waveStrategyDownstreamModeSchema = z.enum(['PACK_DIRECT', 'SORT_THEN_PACK'])
export const waveStrategyReleaseModeSchema = z.enum(['IMMEDIATE', 'MANUAL'])
export const waveTypeCodeSchema = z.enum([
  'SINGLE_ONE_HOT',
  'SINGLE_ONE_NORMAL',
  'SINGLE_MULTI_HOT',
  'SINGLE_MULTI_NORMAL',
  'MULTI_FIXED_COMBO',
  'MULTI_NON_FIXED',
])

const fixedComboItemSchema = z.object({
  skuId: z.string().uuid('SKU ID 格式错误'),
  qty: z.coerce.number().int().positive('组合数量必须大于 0'),
})

const filterConditionGroupItemSchema = z.object({
  id: z.string().min(1),
  groupNo: z.coerce.number().int().positive().refine((value) => value === 1, '当前仅支持单条件组'),
  logicOp: z.enum(['AND', 'OR']).default('AND').refine((value) => value === 'AND', '暂不支持 OR 逻辑'),
  fieldCode: z.enum(['orderBusinessType', 'platform', 'shippingMethod', 'clientId', 'zoneId', 'expectedOutboundTime']),
  value: z.string().default(''),
  valueTo: z.string().optional(),
})

const identifyRuleSchema = z.object({
  hotSkuIds: z.array(z.string().uuid('SKU ID 格式错误')).default([]),
  fixedCombos: z.array(z.array(fixedComboItemSchema).min(1)).default([]),
}).default({})

export const waveTypeConfigItemSchema = z.object({
  code: waveTypeCodeSchema,
  enabled: z.boolean().default(true),
  minOrdersPerWave: z.coerce.number().int().positive('每波次订单数最小值必须大于 0'),
  maxOrdersPerWave: z.coerce.number().int().positive('每波次订单数最大值必须大于 0'),
  pickMode: waveStrategyPickModeSchema,
  downstreamMode: waveStrategyDownstreamModeSchema,
  identifyRule: identifyRuleSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.minOrdersPerWave > value.maxOrdersPerWave) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '每波次订单数最小值不能大于最大值',
      path: ['maxOrdersPerWave'],
    })
  }
})

export const waveStrategyRuleSetSchema = z.object({
  triggerConfig: z.object({
    modes: z.array(waveStrategyTriggerTypeSchema).min(1, '至少选择一种触发方式'),
    cronExpression: z.string().trim().max(64).nullish(),
    scheduleTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/, '运行时间格式应为 HH:mm')).max(24).default([]),
  }),
  filterConfig: z.object({
    orderBusinessTypes: z.array(z.string().max(32)).default([]),
    clientIds: z.array(z.string().uuid()).default([]),
    platforms: z.array(z.string().max(32)).default([]),
    shippingMethods: z.array(z.string().max(64)).default([]),
    zoneIds: z.array(z.string().uuid()).default([]),
    groupJoinMode: z.enum(['AND', 'OR']).default('AND').refine((value) => value === 'AND', '暂不支持 OR 条件组关系'),
    expectedOutboundTime: z.object({
      from: z.string().datetime().nullish(),
      to: z.string().datetime().nullish(),
    }).nullish(),
    conditionGroups: z.array(filterConditionGroupItemSchema).default([]),
  }),
  executionConfig: z.object({
    enableOrderLimit: z.boolean().default(false),
    maxOrdersPerRun: z.coerce.number().int().positive().nullish(),
    batchSortField: z.enum(['expectedOutboundTime', 'createdAt']).default('expectedOutboundTime'),
    batchSortDirection: z.enum(['asc', 'desc']).default('asc'),
  }),
  waveTypeConfig: z.array(waveTypeConfigItemSchema).min(1, '至少配置一个波次类型'),
  pickConfig: z.object({
    crossZoneSplitMode: z.enum(['BY_ZONE', 'NO_SPLIT']).default('NO_SPLIT'),
    enableMaxOrderLimit: z.boolean().default(false),
    maxOrdersPerPickOrder: z.coerce.number().int().positive().nullish(),
    pathOptimizeMode: z.enum(['LOCATION_ASC']).default('LOCATION_ASC'),
  }),
  releaseConfig: z.object({
    releaseMode: waveStrategyReleaseModeSchema.default('MANUAL'),
    autoAssignPicker: z.boolean().default(false),
  }),
}).superRefine((value, ctx) => {
  const fieldCodes = value.filterConfig.conditionGroups.map((item) => item.fieldCode)
  const duplicateFieldCodes = fieldCodes.filter((fieldCode, index) => fieldCodes.indexOf(fieldCode) !== index)

  if (duplicateFieldCodes.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '订单筛选条件字段不能重复',
      path: ['filterConfig', 'conditionGroups'],
    })
  }
})

export const createWaveStrategySchema = z.object({
  warehouseId: z.string().uuid('仓库 ID 格式错误'),
  strategyCode: z.string().trim().min(1, '策略编码不能为空').max(64, '策略编码最多 64 个字符'),
  strategyName: z.string().trim().min(1, '策略名称不能为空').max(128, '策略名称最多 128 个字符'),
  description: z.string().max(2000, '描述最多 2000 个字符').nullish(),
  priority: z.coerce.number().int().positive('优先级必须为正整数').default(100),
  status: waveStrategyStatusSchema.default('DRAFT'),
  rules: waveStrategyRuleSetSchema,
})

export const updateWaveStrategySchema = z.object({
  strategyCode: z.string().trim().min(1).max(64).optional(),
  strategyName: z.string().trim().min(1).max(128).optional(),
  description: z.string().max(2000).nullish().optional(),
  priority: z.coerce.number().int().positive().optional(),
  status: waveStrategyStatusSchema.optional(),
  rules: waveStrategyRuleSetSchema.optional(),
})

export const listWaveStrategiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  search: z.string().nullish().transform((v) => v ?? undefined),
  clientId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  shippingMethod: z.string().trim().max(128).nullish().transform((v) => v || undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  status: waveStrategyStatusSchema.nullish().transform((v) => v ?? undefined),
  timePreset: z.enum(['last24hours', 'last7days', 'last30days']).nullish().transform((v) => v ?? undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'strategyCode']).default('updatedAt').catch('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
})

export const publishWaveStrategySchema = z.object({
  changeSummary: z.string().max(512).nullish(),
})

export const copyWaveStrategySchema = z.object({
  strategyCode: z.string().trim().min(1).max(64).optional(),
  strategyName: z.string().trim().min(1).max(128).optional(),
})

export const rollbackWaveStrategySchema = z.object({
  versionId: z.string().uuid('版本 ID 格式错误'),
})

export const simulateWaveStrategySchema = z.object({
  orderIds: z.array(z.string().uuid()).default([]),
})

export const executeWaveStrategySchema = z.object({
  orderIds: z.array(z.string().uuid()).default([]),
})

export const listWaveStrategyRunsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  strategyId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  runMode: waveStrategyRunModeSchema.nullish().transform((v) => v ?? undefined),
  runStatus: waveStrategyRunStatusSchema.nullish().transform((v) => v ?? undefined),
  reasonCode: z.string().trim().max(64).nullish().transform((v) => v ?? undefined),
  timePreset: z.enum(['last24hours', 'last7days', 'last30days']).nullish().transform((v) => v ?? undefined),
  startedAtFrom: z.string().trim().max(32).nullish().transform((v) => v ?? undefined),
  startedAtTo: z.string().trim().max(32).nullish().transform((v) => v ?? undefined),
})

export const waveStrategyRunDetailQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  resultStatus: z.enum(waveStrategyRunOrderStatusValues).nullish().transform((v) => v ?? undefined),
  reasonCategory: z.enum(reasonCategoryValues).default('ALL').catch('ALL'),
  search: z.string().trim().max(128).nullish().transform((v) => v || undefined),
})

export type WaveStrategyRuleSetInput = z.infer<typeof waveStrategyRuleSetSchema>
export type CreateWaveStrategyInput = z.infer<typeof createWaveStrategySchema>
export type UpdateWaveStrategyInput = z.infer<typeof updateWaveStrategySchema>
export type PublishWaveStrategyInput = z.infer<typeof publishWaveStrategySchema>
export type CopyWaveStrategyInput = z.infer<typeof copyWaveStrategySchema>
export type RollbackWaveStrategyInput = z.infer<typeof rollbackWaveStrategySchema>
export type SimulateWaveStrategyInput = z.infer<typeof simulateWaveStrategySchema>
export type ExecuteWaveStrategyInput = z.infer<typeof executeWaveStrategySchema>
export type ListWaveStrategiesQuery = z.infer<typeof listWaveStrategiesQuerySchema>
export type ListWaveStrategyRunsQuery = z.infer<typeof listWaveStrategyRunsQuerySchema>
export type WaveStrategyRunDetailQuery = z.infer<typeof waveStrategyRunDetailQuerySchema>
