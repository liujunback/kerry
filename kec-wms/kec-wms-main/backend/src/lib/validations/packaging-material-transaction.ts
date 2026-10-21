import { z } from 'zod'

// 流水类型枚举
export const TransactionType = {
  PURCHASE_INBOUND: 'PURCHASE_INBOUND',
  RETURN_INBOUND: 'RETURN_INBOUND',
  ORDER_OUTBOUND: 'ORDER_OUTBOUND',
  COUNT_ADJUSTMENT_IN: 'COUNT_ADJUSTMENT_IN',
  COUNT_ADJUSTMENT_OUT: 'COUNT_ADJUSTMENT_OUT',
  DAMAGE_ADJUSTMENT_OUT: 'DAMAGE_ADJUSTMENT_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  SCRAP: 'SCRAP',
  OTHER_IN: 'OTHER_IN',
  OTHER_OUT: 'OTHER_OUT',
} as const

// 关联业务类型枚举
export const ReferenceType = {
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  SALES_ORDER: 'SALES_ORDER',
  SHIPMENT: 'SHIPMENT',
  RETURN_ORDER: 'RETURN_ORDER',
  CYCLE_COUNT: 'CYCLE_COUNT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER: 'TRANSFER',
  SCRAP_ORDER: 'SCRAP_ORDER',
} as const

// 审计状态枚举
export const AuditStatus = {
  UNAUDITED: 'UNAUDITED',
  AUDITING: 'AUDITING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
} as const

// 流水列表查询参数 Schema
export const packagingMaterialTransactionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  materialId: z.string().uuid().nullish().transform(v => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  transactionType: z.string().nullish().transform(v => v ?? undefined),
  referenceType: z.string().nullish().transform(v => v ?? undefined),
  auditStatus: z.string().nullish().transform(v => v ?? undefined),
  startDate: z.string().nullish().transform(v => v ?? undefined),
  endDate: z.string().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'operationTime'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 审计 Schema
export const auditTransactionSchema = z.object({
  auditStatus: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().max(256).optional().or(z.literal('')),
})

// 类型导出
export type PackagingMaterialTransactionListQuery = z.infer<typeof packagingMaterialTransactionListQuerySchema>
export type AuditTransactionInput = z.infer<typeof auditTransactionSchema>
