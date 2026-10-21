import { z } from 'zod'

// SKU状态枚举
export const SkuStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

// 存储条件枚举
export const StorageCondition = {
  NORMAL: 'NORMAL',
  COLD: 'COLD',
  FROZEN: 'FROZEN',
  HAZMAT: 'HAZMAT',
  CONTROLLED: 'CONTROLLED',
} as const

// 条码类型枚举
export const BarcodeType = {
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPC: 'UPC',
  CODE128: 'CODE128',
  CODE39: 'CODE39',
  QR: 'QR',
  INTERNAL: 'INTERNAL',
} as const

// 属性类型枚举
export const AttributeType = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  JSON: 'JSON',
} as const

// ==================== SKU分类 ====================

// 创建SKU分类 Schema
export const createSkuCategorySchema = z.object({
  categoryCode: z
    .string()
    .min(2, '分类编码至少2个字符')
    .max(32, '分类编码最多32个字符')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z0-9-_]+$/.test(val), '分类编码只能包含字母、数字、连字符和下划线'),
  categoryName: z
    .string()
    .min(1, '分类名称不能为空')
    .max(128, '分类名称最多128个字符'),
  parentId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  description: z.string().optional().or(z.literal('')),
})

// 更新SKU分类 Schema
export const updateSkuCategorySchema = createSkuCategorySchema.partial()

// SKU分类列表查询参数 Schema
export const skuCategoryListQuerySchema = z.object({
  clientId: z.string().uuid().nullish().transform(v => v ?? undefined),
  parentId: z.string().uuid().nullish().transform(v => v ?? undefined),
  isActive: z
    .string()
    .nullish()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  search: z.string().nullish().transform(v => v ?? undefined),
})

// ==================== SKU主表 ====================

// 创建SKU Schema
export const createSkuSchema = z.object({
  // 基本信息
  skuCode: z
    .string()
    .min(2, 'SKU编码至少2个字符')
    .max(64, 'SKU编码最多64个字符'),
  skuName: z
    .string()
    .min(1, 'SKU名称不能为空')
    .max(256, 'SKU名称最多256个字符'),
  barcode: z.string().max(64, '条码最多64个字符').optional().or(z.literal('')),
  clientId: z.string().uuid('客户ID格式不正确'),
  categoryId: z.string().uuid().optional().nullable(),

  // 计量单位
  unit: z.string().max(32).default('PCS'),

  // 物理属性
  lengthCm: z.coerce.number().positive().optional().nullable(),
  widthCm: z.coerce.number().positive().optional().nullable(),
  heightCm: z.coerce.number().positive().optional().nullable(),
  volumeCbm: z.coerce.number().positive().optional().nullable(),
  weightKg: z.coerce.number().positive().optional().nullable(),

  // 价格信息
  unitPrice: z.coerce.number().positive().optional().nullable(),
  currency: z.string().max(3).default('CNY'),

  // 产地与海关
  originCountry: z.string().max(64).optional().or(z.literal('')),
  hsCode: z.string().max(32).optional().or(z.literal('')),

  // 保质期管理
  shelfLifeWarningDays: z.coerce.number().int().positive().optional().nullable(),

  // 管理要求
  isBatchManaged: z.boolean().default(false),
  isSerialManaged: z.boolean().default(false),
  isLotManaged: z.boolean().default(false),
  isExpiryManaged: z.boolean().default(false),

  // 存储条件
  storageCondition: z
    .enum(['NORMAL', 'COLD', 'FROZEN', 'HAZMAT', 'CONTROLLED'])
    .default('NORMAL'),

  // 分类
  abcClass: z.enum(['A', 'B', 'C']).optional().nullable(),

  // 电子产品属性
  hasBattery: z.boolean().default(false),
  batteryType: z.string().max(32).optional().or(z.literal('')),
  batteryCount: z.coerce.number().int().min(0).optional().nullable(),
  isDangerous: z.boolean().default(false),

  // 首次收货与包装
  isSelfPackaged: z.boolean().default(false),

  // 图片
  imageUrl: z.string().url().max(512).optional().or(z.literal('')),

  // 扩展配置
  config: z.record(z.unknown()).optional().default({}),
  notes: z.string().optional().or(z.literal('')),
})

// 更新SKU Schema
export const updateSkuSchema = createSkuSchema.partial().omit({ clientId: true }).extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

// 修改SKU状态 Schema
export const changeSkuStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

// SKU列表查询参数 Schema
export const skuListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  clientCode: z.string().nullish().transform(v => v ?? undefined),
  clientId: z.string().uuid().nullish().transform(v => v ?? undefined),
  categoryId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum(['ACTIVE', 'INACTIVE']).nullish().transform(v => v ?? undefined),
  abcClass: z.enum(['A', 'B', 'C']).nullish().transform(v => v ?? undefined),
  storageCondition: z.enum(['NORMAL', 'COLD', 'FROZEN', 'HAZMAT', 'CONTROLLED']).nullish().transform(v => v ?? undefined),
  isBatchManaged: z
    .string()
    .nullish()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  isSerialManaged: z
    .string()
    .nullish()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  isFirstReceiving: z
    .string()
    .nullish()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// ==================== SKU包装单位 ====================

// 创建SKU UOM Schema
export const createSkuUomSchema = z.object({
  skuId: z.string().uuid('SKU ID格式不正确'),
  uomCode: z
    .string()
    .min(1, 'UOM编码不能为空')
    .max(32, 'UOM编码最多32个字符'),
  uomName: z
    .string()
    .min(1, 'UOM名称不能为空')
    .max(64, 'UOM名称最多64个字符'),
  conversionFactor: z.coerce.number().positive('换算系数必须为正数').default(1),
  barcode: z.string().max(64).optional().or(z.literal('')),
  lengthCm: z.coerce.number().positive().optional().nullable(),
  widthCm: z.coerce.number().positive().optional().nullable(),
  heightCm: z.coerce.number().positive().optional().nullable(),
  volumeCbm: z.coerce.number().positive().optional().nullable(),
  weightKg: z.coerce.number().positive().optional().nullable(),
  isBaseUom: z.boolean().default(false),
  isReceivingUom: z.boolean().default(false),
  isShippingUom: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

// 更新SKU UOM Schema
export const updateSkuUomSchema = createSkuUomSchema.partial().omit({ skuId: true })

// ==================== SKU条码 ====================

// 创建SKU条码 Schema
export const createSkuBarcodeSchema = z.object({
  skuId: z.string().uuid('SKU ID格式不正确'),
  barcode: z
    .string()
    .min(1, '条码不能为空')
    .max(64, '条码最多64个字符'),
  barcodeType: z
    .enum(['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'QR', 'INTERNAL'])
    .default('EAN13'),
  uomId: z.string().uuid().optional().nullable(),
  isPrimary: z.boolean().default(false),
})

// 更新SKU条码 Schema
export const updateSkuBarcodeSchema = createSkuBarcodeSchema.partial().omit({ skuId: true })

// ==================== SKU图片 ====================

// 创建SKU图片 Schema
export const createSkuImageSchema = z.object({
  skuId: z.string().uuid('SKU ID格式不正确'),
  imageUrl: z.string().url('图片URL格式不正确').max(512),
  thumbnailUrl: z.string().url().max(512).optional().or(z.literal('')),
  imageType: z.enum(['MAIN', 'DETAIL', 'PACKAGE', 'OTHER']).default('MAIN'),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

// 更新SKU图片 Schema
export const updateSkuImageSchema = createSkuImageSchema.partial().omit({ skuId: true })

// ==================== SKU扩展属性 ====================

// 创建SKU属性 Schema
export const createSkuAttributeSchema = z.object({
  skuId: z.string().uuid('SKU ID格式不正确'),
  attributeName: z
    .string()
    .min(1, '属性名称不能为空')
    .max(64, '属性名称最多64个字符'),
  attributeValue: z.string().max(512).optional().or(z.literal('')),
  attributeType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON']).default('STRING'),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

// 更新SKU属性 Schema
export const updateSkuAttributeSchema = createSkuAttributeSchema.partial().omit({ skuId: true })

// ==================== 组合商品 ====================

// 创建组合商品 Schema
export const createComboProductSchema = z.object({
  clientId: z.string().uuid('客户ID格式不正确'),
  comboCode: z
    .string()
    .min(2, '组合商品编码至少2个字符')
    .max(64, '组合商品编码最多64个字符'),
  comboName: z
    .string()
    .min(1, '组合商品名称不能为空')
    .max(256, '组合商品名称最多256个字符'),
  comboBarcode: z.string().max(64).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().nullable(),
  effectiveDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  components: z.array(z.object({
    skuId: z.string().uuid('SKU ID格式不正确'),
    quantity: z.coerce.number().positive('数量必须为正数').default(1),
    unit: z.string().max(32).default('EA'),
    sortOrder: z.coerce.number().int().min(0).default(0),
  })).min(1, '组合商品至少需要一个组件'),
})

// 更新组合商品 Schema
export const updateComboProductSchema = createComboProductSchema.partial().omit({ clientId: true })

// 修改组合商品状态 Schema
export const changeComboProductStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

// 组合商品列表查询参数 Schema
export const comboProductListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  clientId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum(['ACTIVE', 'INACTIVE']).nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// ==================== 类型导出 ====================

export type CreateSkuCategoryInput = z.infer<typeof createSkuCategorySchema>
export type UpdateSkuCategoryInput = z.infer<typeof updateSkuCategorySchema>
export type SkuCategoryListQuery = z.infer<typeof skuCategoryListQuerySchema>

export type UpdateSkuInput = z.infer<typeof updateSkuSchema>
export type ChangeSkuStatusInput = z.infer<typeof changeSkuStatusSchema>
export type SkuListQuery = z.infer<typeof skuListQuerySchema>

export type CreateSkuUomInput = z.infer<typeof createSkuUomSchema>
export type UpdateSkuUomInput = z.infer<typeof updateSkuUomSchema>

export type CreateSkuBarcodeInput = z.infer<typeof createSkuBarcodeSchema>
export type UpdateSkuBarcodeInput = z.infer<typeof updateSkuBarcodeSchema>

export type CreateSkuImageInput = z.infer<typeof createSkuImageSchema>
export type UpdateSkuImageInput = z.infer<typeof updateSkuImageSchema>

export type CreateSkuAttributeInput = z.infer<typeof createSkuAttributeSchema>
export type UpdateSkuAttributeInput = z.infer<typeof updateSkuAttributeSchema>

export type CreateComboProductInput = z.infer<typeof createComboProductSchema>
export type UpdateComboProductInput = z.infer<typeof updateComboProductSchema>
export type ChangeComboProductStatusInput = z.infer<typeof changeComboProductStatusSchema>
export type ComboProductListQuery = z.infer<typeof comboProductListQuerySchema>
