import { z } from 'zod'

// 差异类型枚举
export const DiscrepancyType = {
  SHORTAGE: 'SHORTAGE',
  OVERAGE: 'OVERAGE',
  DAMAGE: 'DAMAGE',
  WRONG_SKU: 'WRONG_SKU',
  QUALITY_ISSUE: 'QUALITY_ISSUE',
  SIGNING_ISSUE: 'SIGNING_ISSUE',
  EXPIRY_ISSUE: 'EXPIRY_ISSUE',
  OTHER: 'OTHER',
} as const

// 差异状态枚举
export const DiscrepancyStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const

// 创建差异记录 Schema
export const createDiscrepancySchema = z.object({
  asnId: z.string().uuid('ASN ID格式错误'),
  asnLineId: z.string().uuid('ASN明细ID格式错误').optional().nullable(),
  skuId: z.string().uuid('SKU ID格式错误').optional().nullable(),
  discrepancyType: z.enum(
    ['SHORTAGE', 'OVERAGE', 'DAMAGE', 'WRONG_SKU', 'QUALITY_ISSUE', 'SIGNING_ISSUE', 'EXPIRY_ISSUE', 'OTHER'],
    {
      errorMap: () => ({ message: '无效的差异类型' }),
    }
  ),
  expectedQty: z.coerce.number().int().optional().nullable(),
  actualQty: z.coerce.number().int().optional().nullable(),
  varianceQty: z.coerce.number().int().optional().nullable(),
  description: z.string().max(2000, '描述最多2000个字符').optional().nullable(),
  evidenceImages: z.array(z.string().url('图片URL格式错误')).optional().default([]),
})

// 更新差异记录 Schema
export const updateDiscrepancySchema = z.object({
  discrepancyType: z
    .enum(
      ['SHORTAGE', 'OVERAGE', 'DAMAGE', 'WRONG_SKU', 'QUALITY_ISSUE', 'SIGNING_ISSUE', 'EXPIRY_ISSUE', 'OTHER'],
      {
        errorMap: () => ({ message: '无效的差异类型' }),
      }
    )
    .optional(),
  expectedQty: z.coerce.number().int().optional().nullable(),
  actualQty: z.coerce.number().int().optional().nullable(),
  varianceQty: z.coerce.number().int().optional().nullable(),
  description: z.string().max(2000, '描述最多2000个字符').optional().nullable(),
  evidenceImages: z.array(z.string().url('图片URL格式错误')).optional(),
})

// 处理差异 Schema
export const resolveDiscrepancySchema = z.object({
  resolution: z.string().min(1, '处理结果不能为空').max(2000, '处理结果最多2000个字符'),
  status: z
    .enum(['RESOLVED', 'CLOSED'], {
      errorMap: () => ({ message: '无效的状态' }),
    })
    .default('RESOLVED'),
})

// 差异列表查询参数 Schema
export const discrepancyListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  asnId: z.string().uuid().nullish().transform(v => v ?? undefined),
  skuId: z.string().uuid().nullish().transform(v => v ?? undefined),
  discrepancyType: z
    .enum(['SHORTAGE', 'OVERAGE', 'DAMAGE', 'WRONG_SKU', 'QUALITY_ISSUE', 'SIGNING_ISSUE', 'EXPIRY_ISSUE', 'OTHER'])
    .nullish()
    .transform(v => v ?? undefined),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).nullish().transform(v => v ?? undefined),
  createdAtFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  createdAtTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateDiscrepancyInput = z.infer<typeof createDiscrepancySchema>
export type UpdateDiscrepancyInput = z.infer<typeof updateDiscrepancySchema>
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancySchema>
export type DiscrepancyListQuery = z.infer<typeof discrepancyListQuerySchema>
