import { z } from 'zod'

// 库区类型枚举
export const ZoneType = {
  RECEIVING: 'RECEIVING',
  STORAGE: 'STORAGE',
  PICKING: 'PICKING',
  PACKING: 'PACKING',
  SHIPPING: 'SHIPPING',
} as const

// 质量类型枚举
export const QualityType = {
  GOOD: 'GOOD',
  DAMAGED: 'DAMAGED',
  QUARANTINE: 'QUARANTINE',
} as const

// 库区状态枚举
export const ZoneStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

// 创建库区 Schema
export const createZoneSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
  zoneCode: z
    .string()
    .min(2, '库区编码至少2个字符')
    .max(32, '库区编码最多32个字符')
    .regex(/^[A-Z0-9-]+$/, '库区编码只能包含大写字母、数字和连字符'),
  zoneName: z.string().max(128, '库区名称最多128个字符').optional().or(z.literal('')),
  zoneType: z.enum(['RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING'], {
    errorMap: () => ({ message: '无效的库区类型' }),
  }),
  qualityType: z
    .enum(['GOOD', 'DAMAGED', 'QUARANTINE'], {
      errorMap: () => ({ message: '无效的质量类型' }),
    })
    .default('GOOD'),
  capacityUnits: z.coerce.number().int().positive('容量必须为正整数').optional().nullable(),
})

// 更新库区 Schema
export const updateZoneSchema = createZoneSchema.partial().omit({ warehouseId: true })

// 修改库区状态 Schema
export const changeZoneStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: '无效的库区状态' }),
  }),
})

// 库区列表查询参数 Schema
export const zoneListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  search: z.string().nullish().transform(v => v ?? undefined),
  zoneType: z.enum(['RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING']).nullish().transform(v => v ?? undefined),
  status: z.enum(['ACTIVE', 'INACTIVE']).nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateZoneInput = z.infer<typeof createZoneSchema>
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>
export type ChangeZoneStatusInput = z.infer<typeof changeZoneStatusSchema>
export type ZoneListQuery = z.infer<typeof zoneListQuerySchema>
