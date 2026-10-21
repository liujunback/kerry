import { z } from 'zod'

// 仓库类型枚举
export const WarehouseType = {
  SELF_BUILT: 'SELF_BUILT',
  THIRD_PARTY: 'THIRD_PARTY',
  BONDED: 'BONDED',
} as const

// 仓库状态枚举
export const WarehouseStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
} as const

// 创建仓库 Schema
export const createWarehouseSchema = z.object({
  warehouseCode: z
    .string()
    .min(2, '仓库编码至少2个字符')
    .max(32, '仓库编码最多32个字符')
    .regex(/^[A-Z0-9-]+$/, '仓库编码只能包含大写字母、数字和连字符'),
  warehouseName: z
    .string()
    .min(2, '仓库名称至少2个字符')
    .max(128, '仓库名称最多128个字符'),
  warehouseType: z
    .enum(['SELF_BUILT', 'THIRD_PARTY', 'BONDED'], {
      errorMap: () => ({ message: '无效的仓库类型' }),
    })
    .default('SELF_BUILT'),
  address: z.string().max(255, '地址最多255个字符').optional().or(z.literal('')),
  city: z.string().max(64, '城市最多64个字符').optional().or(z.literal('')),
  country: z.string().max(2, '国家代码最多2个字符').optional().or(z.literal('')),
  zipCode: z.string().max(20, '邮编最多20个字符').optional().or(z.literal('')),
  contactName: z.string().max(64, '联系人最多64个字符').optional().or(z.literal('')),
  contactPhone: z.string().max(32, '联系电话最多32个字符').optional().or(z.literal('')),
  contactEmail: z.string().max(128, '邮箱最多128个字符').email('请输入有效的邮箱地址').optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  region: z.string().max(32, '区域最多32个字符').optional().or(z.literal('')),
  warehouseArea: z.coerce.number().positive('面积必须为正数').optional().nullable(),
})

// 更新仓库 Schema
export const updateWarehouseSchema = createWarehouseSchema.partial()

// 修改仓库状态 Schema
export const changeWarehouseStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE'], {
    errorMap: () => ({ message: '无效的仓库状态' }),
  }),
})

// 仓库列表查询参数 Schema
export const warehouseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).nullish().transform(v => v ?? undefined),
  warehouseType: z.enum(['SELF_BUILT', 'THIRD_PARTY', 'BONDED']).nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>
export type ChangeWarehouseStatusInput = z.infer<typeof changeWarehouseStatusSchema>
export type WarehouseListQuery = z.infer<typeof warehouseListQuerySchema>
