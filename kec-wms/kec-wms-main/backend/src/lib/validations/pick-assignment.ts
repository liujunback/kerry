import { z } from 'zod'

export const pickAssignmentRuleStatusSchema = z.enum(['DRAFT', 'ENABLED', 'DISABLED'])
export const pickAssignmentStrategyTypeSchema = z.enum(['ROUND_ROBIN', 'LEAST_ACTIVE_TASKS', 'ZONE_FIRST'])
export const pickAssignmentAreaMatchModeSchema = z.enum(['STRICT', 'PREFER', 'IGNORE'])
export const pickAssignmentCapacityCheckModeSchema = z.enum(['STRICT', 'SOFT'])
export const pickAssignmentLoadStatusSchema = z.enum(['PENDING', 'IN_PROGRESS'])
export const pickOrderAssignmentSourceSchema = z.enum(['MANUAL', 'AUTO_RULE'])

export const pickAssignmentRuleConfigSchema = z.object({
  strategyType: pickAssignmentStrategyTypeSchema,
  fallbackStrategyType: pickAssignmentStrategyTypeSchema.optional(),
  areaMatchMode: pickAssignmentAreaMatchModeSchema.default('PREFER'),
  capacityCheckMode: pickAssignmentCapacityCheckModeSchema.default('STRICT'),
  includeTaskStatusesInLoad: z.array(pickAssignmentLoadStatusSchema).min(1).default(['PENDING', 'IN_PROGRESS']),
  assignAtCreation: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (value.strategyType !== 'ZONE_FIRST' && value.fallbackStrategyType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '仅区域匹配优先策略支持配置兜底策略',
      path: ['fallbackStrategyType'],
    })
  }

  if (value.strategyType === 'ZONE_FIRST' && !value.fallbackStrategyType && value.areaMatchMode !== 'STRICT') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '区域匹配优先在非严格模式下必须配置兜底策略',
      path: ['fallbackStrategyType'],
    })
  }
})

export const createPickAssignmentRuleSchema = z.object({
  warehouseId: z.string().uuid('仓库 ID 格式错误'),
  ruleCode: z.string().trim().min(1, '规则编码不能为空').max(64, '规则编码最多 64 个字符'),
  ruleName: z.string().trim().min(1, '规则名称不能为空').max(128, '规则名称最多 128 个字符'),
  description: z.string().max(2000, '描述最多 2000 个字符').nullish(),
  status: pickAssignmentRuleStatusSchema.default('DRAFT'),
  isDefault: z.boolean().default(false),
  config: pickAssignmentRuleConfigSchema,
})

export const updatePickAssignmentRuleSchema = z.object({
  ruleName: z.string().trim().min(1).max(128).optional(),
  description: z.string().max(2000).nullish().optional(),
  status: pickAssignmentRuleStatusSchema.optional(),
  isDefault: z.boolean().optional(),
  config: pickAssignmentRuleConfigSchema.optional(),
})

export const pickerProfileZoneSchema = z.object({
  zoneId: z.string().uuid('库区 ID 格式错误'),
})

export const createPickerProfileSchema = z.object({
  warehouseId: z.string().uuid('仓库 ID 格式错误'),
  userId: z.string().uuid('用户 ID 格式错误'),
  maxActiveTasks: z.coerce.number().int().positive('最大活跃任务数必须大于 0').max(999),
  sequenceNo: z.coerce.number().int().positive('轮询顺序号必须大于 0').max(9999),
  isEnabled: z.boolean().default(true),
  allowPdaExecution: z.boolean().default(true),
  zones: z.array(pickerProfileZoneSchema).default([]),
})

export const updatePickerProfileSchema = z.object({
  maxActiveTasks: z.coerce.number().int().positive().max(999).optional(),
  sequenceNo: z.coerce.number().int().positive().max(9999).optional(),
  isEnabled: z.boolean().optional(),
  allowPdaExecution: z.boolean().optional(),
  zones: z.array(pickerProfileZoneSchema).optional(),
})

export const pickAssignmentRuleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  search: z.string().nullish().transform((v) => v ?? undefined),
  status: pickAssignmentRuleStatusSchema.nullish().transform((v) => v ?? undefined),
  isDefault: z.enum(['true', 'false']).nullish().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'ruleCode', 'ruleName', 'status']).default('updatedAt').catch('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
})

export const pickerProfileListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  search: z.string().nullish().transform((v) => v ?? undefined),
  userId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  zoneId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  isEnabled: z.enum(['true', 'false']).nullish().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'sequenceNo', 'maxActiveTasks']).default('sequenceNo').catch('sequenceNo'),
  sortOrder: z.enum(['asc', 'desc']).default('asc').catch('asc'),
})

export type PickAssignmentRuleConfigInput = z.infer<typeof pickAssignmentRuleConfigSchema>
export type CreatePickAssignmentRuleInput = z.infer<typeof createPickAssignmentRuleSchema>
export type UpdatePickAssignmentRuleInput = z.infer<typeof updatePickAssignmentRuleSchema>
export type PickAssignmentRuleListQuery = z.infer<typeof pickAssignmentRuleListQuerySchema>
export type CreatePickerProfileInput = z.infer<typeof createPickerProfileSchema>
export type UpdatePickerProfileInput = z.infer<typeof updatePickerProfileSchema>
export type PickerProfileListQuery = z.infer<typeof pickerProfileListQuerySchema>
export type PickOrderAssignmentSource = z.infer<typeof pickOrderAssignmentSourceSchema>
export type PickAssignmentStrategyType = z.infer<typeof pickAssignmentStrategyTypeSchema>
