import { z } from 'zod'

// 上架任务状态枚举
export const PutawayTaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  EXCEPTION: 'EXCEPTION',
  CANCELLED: 'CANCELLED',
} as const

// 上架模式枚举
export const PutawayMode = {
  CONTAINER: 'CONTAINER',
  SKU: 'SKU',
  DIRECT: 'DIRECT',
} as const

// 创建上架任务 Schema
export const createPutawayTasksSchema = z.object({
  asnLineIds: z
    .array(z.string().uuid('ASN明细ID格式错误'))
    .min(1, '至少选择一个明细'),
  putawayMode: z.enum(['CONTAINER', 'SKU', 'DIRECT']).default('SKU'),
  containerId: z.string().uuid('容器ID格式错误').optional().nullable(),
  priority: z.coerce.number().int().min(1).max(10).default(5),
})

// 开始上架任务 Schema
export const startPutawayTaskSchema = z.object({
  operatorId: z.string().uuid('操作员ID格式错误').optional().nullable(),
})

// 执行上架 Schema
export const executePutawaySchema = z.object({
  locationId: z.string().uuid('库位ID格式错误'),
  putawayQty: z.coerce.number().int().positive('上架数量必须为正整数'),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  lpn: z.string().max(64, 'LPN最多64个字符').optional().nullable(),
  notes: z.string().max(500, '备注最多500个字符').optional().nullable(),
})

// 完成上架任务 Schema
export const completePutawayTaskSchema = z.object({
  notes: z.string().max(500, '备注最多500个字符').optional().nullable(),
})

// 上架任务列表查询参数 Schema
export const putawayTaskListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXCEPTION', 'CANCELLED'])
    .nullish()
    .transform((v) => v ?? undefined),
  asnId: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? undefined),
  warehouseId: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? undefined),
  skuId: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? undefined),
  containerId: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? undefined),
  priority: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .nullish()
    .transform((v) => v ?? undefined),
  sortBy: z
    .string()
    .nullish()
    .transform((v) => v ?? 'createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .nullish()
    .transform((v) => v ?? 'desc'),
})

// 库位推荐查询 Schema
export const locationRecommendationQuerySchema = z.object({
  skuId: z.string().uuid('SKU ID格式错误'),
  warehouseId: z.string().uuid('仓库ID格式错误'),
  quantity: z.coerce.number().int().positive('数量必须为正整数').optional().default(1),
})

// 类型导出
export type CreatePutawayTasksInput = z.infer<typeof createPutawayTasksSchema>
export type StartPutawayTaskInput = z.infer<typeof startPutawayTaskSchema>
export type ExecutePutawayInput = z.infer<typeof executePutawaySchema>
export type CompletePutawayTaskInput = z.infer<typeof completePutawayTaskSchema>
export type PutawayTaskListQuery = z.infer<typeof putawayTaskListQuerySchema>
export type LocationRecommendationQuery = z.infer<typeof locationRecommendationQuerySchema>
