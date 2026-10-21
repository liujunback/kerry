import { z } from 'zod'

// 包材类型枚举
export const MaterialType = {
  BOX: 'BOX',
  BAG: 'BAG',
  ENVELOPE: 'ENVELOPE',
  BUBBLE_WRAP: 'BUBBLE_WRAP',
  FOAM: 'FOAM',
  TAPE: 'TAPE',
  LABEL: 'LABEL',
  FILLER: 'FILLER',
  OTHER: 'OTHER',
} as const

// 来源枚举
export const PackagingSource = {
  PURCHASE: 'PURCHASE',
  CUSTOMER_PROVIDED: 'CUSTOMER_PROVIDED',
  RECYCLED: 'RECYCLED',
} as const

// 创建包材 Schema
export const createPackagingMaterialSchema = z.object({
  materialCode: z
    .string()
    .min(2, '包材编码至少2个字符')
    .max(32, '包材编码最多32个字符')
    .regex(/^[A-Z0-9-]+$/, '包材编码只能包含大写字母、数字和连字符'),
  materialName: z
    .string()
    .min(2, '包材名称至少2个字符')
    .max(128, '包材名称最多128个字符'),
  materialType: z.enum(['BOX', 'BAG', 'ENVELOPE', 'BUBBLE_WRAP', 'FOAM', 'TAPE', 'LABEL', 'FILLER', 'OTHER'], {
    errorMap: () => ({ message: '无效的包材类型' }),
  }),
  specification: z.string().max(256, '规格描述最多256个字符').optional().or(z.literal('')),
  lengthCm: z.coerce.number().positive('长度必须为正数').optional().nullable(),
  widthCm: z.coerce.number().positive('宽度必须为正数').optional().nullable(),
  heightCm: z.coerce.number().positive('高度必须为正数').optional().nullable(),
  weightKg: z.coerce.number().positive('重量必须为正数').optional().nullable(),
  maxLoadWeightKg: z.coerce.number().positive('最大承重必须为正数').optional().nullable(),
  unit: z.string().max(32).default('PCS'),
  unitPrice: z.coerce.number().positive('单价必须为正数').optional().nullable(),
  currency: z.string().max(3).default('CNY'),
  supplierName: z.string().max(128, '供应商名称最多128个字符').optional().or(z.literal('')),
  barcode: z.string().max(64, '条码最多64个字符').optional().or(z.literal('')),
  imageUrl: z.string().max(512).optional().or(z.literal('')),
  source: z.enum(['PURCHASE', 'CUSTOMER_PROVIDED', 'RECYCLED']).default('PURCHASE'),
  isReusable: z.boolean().default(false),
  notes: z.string().optional().or(z.literal('')),
  warehouseId: z.string().uuid().optional().nullable(),
})

// 更新包材 Schema
export const updatePackagingMaterialSchema = createPackagingMaterialSchema.partial()

// 修改包材状态 Schema
export const changePackagingMaterialStatusSchema = z.object({
  isActive: z.boolean(),
})

// 包材列表查询参数 Schema
export const packagingMaterialListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  materialType: z.enum(['BOX', 'BAG', 'ENVELOPE', 'BUBBLE_WRAP', 'FOAM', 'TAPE', 'LABEL', 'FILLER', 'OTHER']).nullish().transform(v => v ?? undefined),
  source: z.enum(['PURCHASE', 'CUSTOMER_PROVIDED', 'RECYCLED']).nullish().transform(v => v ?? undefined),
  isActive: z
    .string()
    .nullish()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreatePackagingMaterialInput = z.infer<typeof createPackagingMaterialSchema>
export type UpdatePackagingMaterialInput = z.infer<typeof updatePackagingMaterialSchema>
export type ChangePackagingMaterialStatusInput = z.infer<typeof changePackagingMaterialStatusSchema>
export type PackagingMaterialListQuery = z.infer<typeof packagingMaterialListQuerySchema>
