import { z } from 'zod'

// ASN类型枚举
export const AsnType = {
  NORMAL: 'NORMAL',
  RETURN: 'RETURN',
  TRANSFER: 'TRANSFER',
  PRODUCTION: 'PRODUCTION',
  ADJUSTMENT: 'ADJUSTMENT',
} as const

// ASN状态枚举
export const AsnStatus = {
  CREATED: 'CREATED',
  PENDING_RECEIVING: 'PENDING_RECEIVING',
  RECEIVING: 'RECEIVING',
  RECEIVED: 'RECEIVED',
  PUTTING_AWAY: 'PUTTING_AWAY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
} as const

// ASN明细状态枚举
export const AsnLineStatus = {
  PENDING: 'PENDING',
  RECEIVING: 'RECEIVING',
  RECEIVED: 'RECEIVED',
  PARTIAL_PUTAWAY: 'PARTIAL_PUTAWAY',
  PUTAWAY: 'PUTAWAY',
  CANCELLED: 'CANCELLED',
} as const

// 创建ASN Schema
export const createAsnSchema = z.object({
  clientId: z.string().uuid('客户ID格式错误'),
  warehouseId: z.string().uuid('仓库ID格式错误'),
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
  lines: z
    .array(
      z.object({
        skuId: z.string().uuid('SKU ID格式错误'),
        skuCode: z.string().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
        skuName: z.string().max(256, 'SKU名称最多256个字符').optional().nullable(),
        expectedQty: z.coerce.number().int().positive('预期数量必须为正整数'),
        uomId: z.string().uuid('单位ID格式错误').optional().nullable(),
        uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
        batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
        expiryDate: z.coerce.date().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional()
    .default([]),
})

// 更新ASN Schema
export const updateAsnSchema = z.object({
  clientId: z.string().uuid('客户ID格式错误').optional(),
  warehouseId: z.string().uuid('仓库ID格式错误').optional(),
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

// ASN列表查询参数 Schema
export const asnListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  asnNumber: z.string().nullish().transform(v => v ?? undefined),
  skuCode: z.string().nullish().transform(v => v ?? undefined),
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
  receivingMethod: z
    .enum(['SKU', 'CONTAINER', 'DIRECT_PUTAWAY'])
    .nullish()
    .transform(v => v ?? undefined),
  clientId: z.string().uuid().nullish().transform(v => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  expectedArrivalDateFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  expectedArrivalDateTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  createdAtFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  createdAtTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  arrivalFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  arrivalTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  receivingEndFrom: z.coerce.date().nullish().transform(v => v ?? undefined),
  receivingEndTo: z.coerce.date().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 修改ASN状态 Schema
export const changeAsnStatusSchema = z.object({
  status: z.enum(
    [
      'CREATED',
      'PENDING_RECEIVING',
      'RECEIVING',
      'RECEIVED',
      'PUTTING_AWAY',
      'COMPLETED',
      'CANCELLED',
      'CLOSED',
    ],
    {
      errorMap: () => ({ message: '无效的ASN状态' }),
    }
  ),
  reason: z.string().optional(),
})

// 创建ASN明细 Schema
export const createAsnLineSchema = z.object({
  skuId: z.string().uuid('SKU ID格式错误'),
  skuCode: z.string().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
  skuName: z.string().max(256, 'SKU名称最多256个字符').optional().nullable(),
  expectedQty: z.coerce.number().int().positive('预期数量必须为正整数'),
  uomId: z.string().uuid('单位ID格式错误').optional().nullable(),
  uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// 更新ASN明细 Schema
export const updateAsnLineSchema = z.object({
  expectedQty: z.coerce.number().int().positive('预期数量必须为正整数').optional(),
  uomId: z.string().uuid('单位ID格式错误').optional().nullable(),
  uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
  batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// 取消ASN Schema
export const cancelAsnSchema = z.object({
  reason: z.string().min(1, '取消原因不能为空').max(500, '取消原因最多500个字符'),
})

// 回滚ASN Schema
export const rollbackAsnSchema = z.object({
  reason: z.string().min(1, '回滚原因不能为空').max(500, '回滚原因最多500个字符'),
})

// 强制完结收货 Schema
export const forceCompleteReceivingSchema = z.object({
  reason: z.string().min(1, '强制完结原因不能为空').max(500, '强制完结原因最多500个字符'),
})

// 强制完结上架 Schema
export const forceCompletePutawaySchema = z.object({
  reason: z.string().min(1, '强制完结原因不能为空').max(500, '强制完结原因最多500个字符'),
})

// 类型导出
export type CreateAsnInput = z.infer<typeof createAsnSchema>
export type UpdateAsnInput = z.infer<typeof updateAsnSchema>
export type AsnListQuery = z.infer<typeof asnListQuerySchema>
export type ChangeAsnStatusInput = z.infer<typeof changeAsnStatusSchema>
export type CreateAsnLineInput = z.infer<typeof createAsnLineSchema>
export type UpdateAsnLineInput = z.infer<typeof updateAsnLineSchema>
export type CancelAsnInput = z.infer<typeof cancelAsnSchema>
export type RollbackAsnInput = z.infer<typeof rollbackAsnSchema>
export type ForceCompleteReceivingInput = z.infer<typeof forceCompleteReceivingSchema>
export type ForceCompletePutawayInput = z.infer<typeof forceCompletePutawaySchema>
