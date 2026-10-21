import { z } from 'zod'

const numericSegmentSchema = z.string().regex(/^\d+$/, '必须为数字')
const optionalNumericSegmentSchema = z.union([numericSegmentSchema, z.literal('')]).optional()

// 库位类型枚举
export const LocationType = {
  RACK: 'RACK',
  SHELF: 'SHELF',
  FLOOR: 'FLOOR',
  STAGING: 'STAGING',
  DOCK: 'DOCK',
} as const

// 锁定状态枚举
export const LockStatus = {
  UNLOCKED: 'UNLOCKED',
  LOCKED: 'LOCKED',
} as const

// 库位状态枚举
export const BinLocationStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

// 创建库位 Schema
export const createBinLocationSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
  zoneId: z.string().uuid('无效的库区ID'),
  locationCode: z
    .string()
    .min(2, '库位编码至少2个字符')
    .max(32, '库位编码最多32个字符'),
  aisle: z.string().max(8, '通道最多8个字符').optional().or(z.literal('')),
  rack: optionalNumericSegmentSchema.refine((value) => !value || value.length <= 8, '货架最多8个字符'),
  shelf: optionalNumericSegmentSchema.refine((value) => !value || value.length <= 8, '层最多8个字符'),
  bin: optionalNumericSegmentSchema.refine((value) => !value || value.length <= 8, '格最多8个字符'),
  locationType: z
    .enum(['RACK', 'SHELF', 'FLOOR', 'STAGING', 'DOCK'], {
      errorMap: () => ({ message: '无效的库位类型' }),
    })
    .optional()
    .nullable(),
  isPickable: z.boolean().default(false),
  isReceivable: z.boolean().default(false),
  lengthCm: z.coerce.number().positive('长度必须大于0').optional().nullable(),
  widthCm: z.coerce.number().positive('宽度必须大于0').optional().nullable(),
  heightCm: z.coerce.number().positive('高度必须大于0').optional().nullable(),
  putawayPriority: z.coerce.number().int().min(1, '上架优先级最小为1').default(100),
  pickPriority: z.coerce.number().int().min(1, '拣货优先级最小为1').default(100),
  pickSequence: z.coerce.number().int().min(0, '拣货顺序不能为负数').default(0),
  maxSkuCount: z.coerce.number().int().min(1, '最大SKU数最小为1').default(1),
})

// 更新库位 Schema（库位编码不可编辑，状态编辑需要单独校验库存）
export const updateBinLocationSchema = createBinLocationSchema
  .partial()
  .omit({ warehouseId: true, zoneId: true, locationCode: true })
  .extend({
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: '无效的库位状态' }),
    }).optional(),
  })

// 修改库位状态 Schema
export const changeBinLocationStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: '无效的库位状态' }),
  }),
})

// 修改锁定状态 Schema
export const changeLockStatusSchema = z.object({
  lockStatus: z.enum(['UNLOCKED', 'LOCKED'], {
    errorMap: () => ({ message: '无效的锁定状态' }),
  }),
})

// 批量创建库位 Schema
export const bulkCreateBinLocationSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
  zoneId: z.string().uuid('无效的库区ID'),
  prefix: z.string().min(1, '前缀不能为空').max(10, '前缀最多10个字符'),
  aisleStart: z.string().max(8, '通道起始最多8个字符'),
  aisleEnd: z.string().max(8, '通道结束最多8个字符'),
  rackStart: numericSegmentSchema.refine((value) => value.length <= 8, '货架起始最多8个字符'),
  rackEnd: numericSegmentSchema.refine((value) => value.length <= 8, '货架结束最多8个字符'),
  shelfStart: numericSegmentSchema.refine((value) => value.length <= 8, '层起始最多8个字符'),
  shelfEnd: numericSegmentSchema.refine((value) => value.length <= 8, '层结束最多8个字符'),
  binStart: optionalNumericSegmentSchema.refine((value) => !value || value.length <= 8, '格起始最多8个字符'),
  binEnd: optionalNumericSegmentSchema.refine((value) => !value || value.length <= 8, '格结束最多8个字符'),
  locationType: z.enum(['RACK', 'SHELF', 'FLOOR', 'STAGING', 'DOCK'], {
    errorMap: () => ({ message: '无效的库位类型' }),
  }),
  isPickable: z.boolean().default(false),
  isReceivable: z.boolean().default(false),
  lengthCm: z.coerce.number().positive('长度必须大于0').optional().nullable(),
  widthCm: z.coerce.number().positive('宽度必须大于0').optional().nullable(),
  heightCm: z.coerce.number().positive('高度必须大于0').optional().nullable(),
  putawayPriority: z.coerce.number().int().min(1, '上架优先级最小为1').default(100),
  pickPriority: z.coerce.number().int().min(1, '拣货优先级最小为1').default(100),
  pickSequence: z.coerce.number().int().min(0, '拣货顺序不能为负数').default(0),
  maxSkuCount: z.coerce.number().int().min(1, '最大SKU数最小为1').default(1),
})

// 库位列表查询参数 Schema
export const binLocationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  zoneId: z.string().uuid().nullish().transform(v => v ?? undefined),
  search: z.string().nullish().transform(v => v ?? undefined),
  locationType: z.enum(['RACK', 'SHELF', 'FLOOR', 'STAGING', 'DOCK']).nullish().transform(v => v ?? undefined),
  status: z.enum(['ACTIVE', 'INACTIVE']).nullish().transform(v => v ?? undefined),
  lockStatus: z.enum(['UNLOCKED', 'LOCKED']).nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateBinLocationInput = z.infer<typeof createBinLocationSchema>
export type UpdateBinLocationInput = z.infer<typeof updateBinLocationSchema>
export type ChangeBinLocationStatusInput = z.infer<typeof changeBinLocationStatusSchema>
export type ChangeLockStatusInput = z.infer<typeof changeLockStatusSchema>
export type BulkCreateBinLocationInput = z.infer<typeof bulkCreateBinLocationSchema>
export type BinLocationListQuery = z.infer<typeof binLocationListQuerySchema>
