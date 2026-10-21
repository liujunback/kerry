import { z } from 'zod'

// 库存状态枚举
export const InventoryStatus = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
} as const

// 更新库存设置 Schema
export const updateInventorySettingsSchema = z.object({
  safetyStock: z.coerce.number().int().min(0, '安全库存不能为负数').optional(),
  minimumStock: z.coerce.number().int().min(0, '最低库存不能为负数').optional(),
  maximumStock: z.coerce.number().int().min(0, '最高库存不能为负数').optional().nullable(),
})

// 入库 Schema
export const packagingMaterialInboundSchema = z.object({
  materialId: z.string().uuid('无效的包材ID'),
  warehouseId: z.string().uuid('无效的仓库ID'),
  quantity: z.coerce.number().int().positive('入库数量必须大于0'),
  batchNumber: z.string().max(64).optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  unitCost: z.coerce.number().positive().optional().nullable(),
  referenceType: z.string().max(32).optional().or(z.literal('')),
  referenceNumber: z.string().max(64).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

// 出库 Schema
export const packagingMaterialOutboundSchema = z.object({
  materialId: z.string().uuid('无效的包材ID'),
  warehouseId: z.string().uuid('无效的仓库ID'),
  quantity: z.coerce.number().int().positive('出库数量必须大于0'),
  referenceType: z.string().max(32).optional().or(z.literal('')),
  referenceNumber: z.string().max(64).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

// 库存列表查询参数 Schema
export const packagingMaterialInventoryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum(['NORMAL', 'WARNING', 'LOW_STOCK', 'OUT_OF_STOCK']).nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'materialCode'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'asc'),
})

// 类型导出
export type UpdateInventorySettingsInput = z.infer<typeof updateInventorySettingsSchema>
export type PackagingMaterialInboundInput = z.infer<typeof packagingMaterialInboundSchema>
export type PackagingMaterialOutboundInput = z.infer<typeof packagingMaterialOutboundSchema>
export type PackagingMaterialInventoryListQuery = z.infer<typeof packagingMaterialInventoryListQuerySchema>
