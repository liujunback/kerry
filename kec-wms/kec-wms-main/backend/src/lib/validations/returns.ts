import { z } from 'zod'

export const ReturnType = {
  BUYER_RETURN: 'BUYER_RETURN',
  COURIER_RETURN: 'COURIER_RETURN',
} as const

export const ReturnStatus = {
  PENDING_SIGN: 'PENDING_SIGN',
  SIGNED: 'SIGNED',
  COUNTING: 'COUNTING',
  WAIT_DISPOSITION: 'WAIT_DISPOSITION',
  DISPOSITION_RECEIVED: 'DISPOSITION_RECEIVED',
  PENDING_PUTAWAY: 'PENDING_PUTAWAY',
  PUTAWAYING: 'PUTAWAYING',
  COMPLETED: 'COMPLETED',
} as const

export const ReturnQuality = {
  GOOD: 'GOOD',
  DAMAGED: 'DAMAGED',
} as const

export const ReturnDispositionAction = {
  GOOD_PUTAWAY: 'GOOD_PUTAWAY',
  DAMAGED_PUTAWAY: 'DAMAGED_PUTAWAY',
  DESTROY: 'DESTROY',
} as const

const nullableText = z.string().trim().optional().nullable().transform((value) => value || undefined)

export const returnListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  search: nullableText,
  status: z.enum(Object.values(ReturnStatus) as [string, ...string[]]).optional().nullable().transform((value) => value || undefined),
  returnType: z.enum(Object.values(ReturnType) as [string, ...string[]]).optional().nullable().transform((value) => value || undefined),
  clientId: z.string().uuid().optional().nullable().transform((value) => value || undefined),
  dateFrom: nullableText,
  dateTo: nullableText,
  sortBy: z.string().optional().nullable().transform((value) => value || 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().nullable().transform((value) => value || 'desc'),
})

export const createReturnOrderSchema = z.object({
  clientId: z.string().uuid('客户ID格式错误'),
  warehouseId: z.string().uuid('仓库ID格式错误').optional(),
  preReturnNo: z.string().trim().max(64, '预报退件单号最多64个字符').optional().nullable(),
  logisticsNo: z.string().trim().min(1, '物流单号不能为空').max(64, '物流单号最多64个字符'),
  notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
  lines: z.array(z.object({
    skuId: z.string().uuid('SKU ID格式错误'),
    expectedQty: z.coerce.number().int().positive('预报数量必须为正整数'),
    notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
  })).min(1, '至少需要一条退件明细'),
})

export const externalCreateReturnOrderSchema = z.object({
  clientCode: z.string().trim().min(1, '客户编码不能为空').max(64, '客户编码最多64个字符'),
  warehouseCode: z.string().trim().min(1, '仓库编码不能为空').max(32, '仓库编码最多32个字符'),
  preReturnNo: z.string().trim().min(1, '预报退件单号不能为空').max(64, '预报退件单号最多64个字符'),
  logisticsNo: z.string().trim().min(1, '物流单号不能为空').max(64, '物流单号最多64个字符'),
  notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
  lines: z.array(z.object({
    skuCode: z.string().trim().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
    expectedQty: z.coerce.number().int().positive('预报数量必须为正整数'),
    notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
  })).min(1, '至少需要一条退件明细'),
})

export const signInLookupSchema = z.object({
  logisticsNo: z.string().trim().min(1, '物流单号不能为空').max(64, '物流单号最多64个字符'),
})

export const confirmSignInSchema = signInLookupSchema.extend({
  returnOrderId: z.string().uuid().optional(),
  outboundOrderId: z.string().uuid().optional(),
})

export const countingLookupSchema = signInLookupSchema

export const saveCountLineSchema = z.object({
  barcode: z.string().trim().min(1, 'SKU条码不能为空').max(64, 'SKU条码最多64个字符'),
  countedQty: z.coerce.number().int().positive('清点数量必须为正整数'),
  quality: z.enum(['GOOD', 'DAMAGED'], { errorMap: () => ({ message: '质量必须为GOOD或DAMAGED' }) }),
  batchNumber: z.string().trim().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  containerCode: z.string().trim().min(1, '容器号不能为空').max(32, '容器号最多32个字符'),
  tempLocationCode: z.string().trim().min(1, '退件暂存库位不能为空').max(32, '库位编码最多32个字符'),
  photoUrls: z.array(z.string().trim().min(1)).optional().default([]),
  notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
})

export const dispositionSchema = z.object({
  items: z.array(z.object({
    returnLineId: z.string().uuid('退件明细ID格式错误'),
    action: z.enum(['GOOD_PUTAWAY', 'DAMAGED_PUTAWAY', 'DESTROY']),
    quantity: z.coerce.number().int().positive('处理数量必须为正整数'),
    notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
  })).min(1, '至少需要一条处理方式'),
})

export const externalReturnDispositionSchema = z.object({
  clientCode: z.string().trim().min(1, '客户编码不能为空').max(64, '客户编码最多64个字符').optional(),
  warehouseCode: z.string().trim().min(1, '仓库编码不能为空').max(32, '仓库编码最多32个字符').optional(),
  items: z.array(z.object({
    returnLineNo: z.string().trim().max(40, '退件明细号最多40个字符').optional(),
    skuCode: z.string().trim().max(64, 'SKU编码最多64个字符').optional(),
    quality: z.enum(['GOOD', 'DAMAGED']).optional(),
    batchNumber: z.string().trim().max(64, '批次号最多64个字符').optional().nullable(),
    expiryDate: z.coerce.date().optional().nullable(),
    containerCode: z.string().trim().max(32, '容器号最多32个字符').optional().nullable(),
    tempLocationCode: z.string().trim().max(32, '暂存库位最多32个字符').optional().nullable(),
    action: z.enum(['GOOD_PUTAWAY', 'DAMAGED_PUTAWAY', 'DESTROY']),
    quantity: z.coerce.number().int().positive('处理数量必须为正整数'),
    notes: z.string().trim().max(500, '备注最多500个字符').optional().nullable(),
  }).refine((item) => item.returnLineNo || item.skuCode, {
    message: '退件处理意见必须提供 returnLineNo 或 skuCode',
  })).min(1, '至少需要一条处理方式'),
})

export const createReturnPutawayOrderSchema = z.object({
  dispositionIds: z.array(z.string().uuid('处理方式ID格式错误')).min(1, '请至少选择一条处理方式'),
})

export const executeReturnPutawaySchema = z.object({
  putawayOrderNumber: z.string().trim().min(1, '退件上架单号不能为空').max(32),
  containerCode: z.string().trim().min(1, '容器号不能为空').max(32),
  logisticsNo: z.string().trim().min(1, '包裹号不能为空').max(64),
  barcode: z.string().trim().min(1, 'SKU条码不能为空').max(64),
  quality: z.enum(['GOOD', 'DAMAGED']),
  quantity: z.coerce.number().int().positive('上架数量必须为正整数'),
  targetLocationCode: z.string().trim().min(1, '目标库位不能为空').max(32),
  deviceType: z.enum(['WEB', 'PDA']).optional().default('WEB'),
})

export type ReturnListQuery = z.infer<typeof returnListQuerySchema>
export type CreateReturnOrderInput = z.infer<typeof createReturnOrderSchema>
export type ExternalCreateReturnOrderInput = z.infer<typeof externalCreateReturnOrderSchema>
export type SaveCountLineInput = z.infer<typeof saveCountLineSchema>
export type DispositionInput = z.infer<typeof dispositionSchema>
export type ExternalReturnDispositionInput = z.infer<typeof externalReturnDispositionSchema>
export type CreateReturnPutawayOrderInput = z.infer<typeof createReturnPutawayOrderSchema>
export type ExecuteReturnPutawayInput = z.infer<typeof executeReturnPutawaySchema>
