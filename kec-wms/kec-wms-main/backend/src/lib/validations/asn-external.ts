import { z } from 'zod'

// 辅助函数：处理可选日期字段（空字符串转为null）
const optionalDateSchema = z
  .preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null
      return val
    },
    z.coerce.date().nullable()
  )
  .optional()

// 外部API创建ASN明细 Schema（使用skuCode而非skuId）
export const externalAsnLineSchema = z.object({
  skuCode: z.string().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
  expectedQty: z.coerce.number().int().positive('预期数量必须为正整数'),
  uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  carton: z.string().max(64, '箱号最多64个字符').optional().nullable(),
  expiryDate: optionalDateSchema,
  notes: z.string().optional().nullable(),
})

// 外部API创建ASN Schema（使用业务编码）
export const externalCreateAsnSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空'),
  warehouseCode: z.string().min(1, '仓库编码不能为空'),
  asnNumber: z
    .string()
    .min(1, 'ASN单号不能为空')
    .max(32, 'ASN单号最多32个字符')
    .optional(),
  externalNumber: z.string().max(64, '外部单号最多64个字符').optional().nullable(),
  asnType: z
    .enum(['NORMAL', 'RETURN', 'TRANSFER', 'PRODUCTION', 'ADJUSTMENT'], {
      errorMap: () => ({ message: '无效的ASN类型' }),
    })
    .default('NORMAL'),
  expectedArrivalDate: z.coerce.date().optional().nullable(),
  expectedArrivalTime: z.string().max(8, '预计到货时间格式错误').optional().nullable(),
  expectedPutawayDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional().default({}),
  lines: z.array(externalAsnLineSchema).min(1, 'ASN明细不能为空'),
})

// 外部API更新ASN Schema
export const externalUpdateAsnSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
  externalNumber: z.string().max(64, '外部单号最多64个字符').optional().nullable(),
  asnType: z
    .enum(['NORMAL', 'RETURN', 'TRANSFER', 'PRODUCTION', 'ADJUSTMENT'], {
      errorMap: () => ({ message: '无效的ASN类型' }),
    })
    .optional(),
  expectedArrivalDate: z.coerce.date().optional().nullable(),
  expectedArrivalTime: z.string().max(8, '预计到货时间格式错误').optional().nullable(),
  expectedPutawayDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
})

// 外部API添加ASN明细 Schema
export const externalAddAsnLineSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
  skuCode: z.string().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
  expectedQty: z.coerce.number().int().positive('预期数量必须为正整数'),
  uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: optionalDateSchema,
  notes: z.string().optional().nullable(),
})

// 外部API更新ASN明细 Schema
export const externalUpdateAsnLineSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
  expectedQty: z.coerce.number().int().positive('预期数量必须为正整数').optional(),
  uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: optionalDateSchema,
  notes: z.string().optional().nullable(),
})

// 外部API查询ASN列表参数 Schema
export const externalAsnListQuerySchema = z.object({
  clientCode: z.string().optional(),
  warehouseCode: z.string().optional(),
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  status: z
    .enum([
      'CREATED',
      'PENDING_RECEIVING',
      'RECEIVING',
      'RECEIVED',
      'PUTTING_AWAY',
      'COMPLETED',
      'CANCELLED',
      'CLOSED',
    ])
    .nullish()
    .transform(v => v ?? undefined),
  asnType: z
    .enum(['NORMAL', 'RETURN', 'TRANSFER', 'PRODUCTION', 'ADJUSTMENT'])
    .nullish()
    .transform(v => v ?? undefined),
  expectedArrivalDateFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  expectedArrivalDateTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  createdAtFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  createdAtTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 外部API取消ASN Schema
export const externalCancelAsnSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
  reason: z.string().min(1, '取消原因不能为空').max(500, '取消原因最多500个字符'),
})

// 类型导出
export type ExternalAsnLineInput = z.infer<typeof externalAsnLineSchema>
export type ExternalCreateAsnInput = z.infer<typeof externalCreateAsnSchema>
export type ExternalUpdateAsnInput = z.infer<typeof externalUpdateAsnSchema>
export type ExternalAddAsnLineInput = z.infer<typeof externalAddAsnLineSchema>
export type ExternalUpdateAsnLineInput = z.infer<typeof externalUpdateAsnLineSchema>
export type ExternalAsnListQuery = z.infer<typeof externalAsnListQuerySchema>
export type ExternalCancelAsnInput = z.infer<typeof externalCancelAsnSchema>
