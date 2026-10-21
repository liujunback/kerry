import { z } from 'zod'

// 租户状态枚举
export const TenantStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const

// 创建租户 Schema
export const createTenantSchema = z.object({
  tenantCode: z
    .string()
    .min(2, '租户编码至少2个字符')
    .max(32, '租户编码最多32个字符')
    .regex(/^[A-Z0-9-]+$/, '租户编码只能包含大写字母、数字和连字符'),
  tenantName: z
    .string()
    .min(2, '租户名称至少2个字符')
    .max(128, '租户名称最多128个字符'),
  contactPerson: z.string().max(64, '联系人最多64个字符').optional().or(z.literal('')),
  contactPhone: z.string().max(32, '联系电话最多32个字符').optional().or(z.literal('')),
  contactEmail: z.string().email('邮箱格式不正确').max(128).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  config: z.record(z.unknown()).optional().default({}),
})

// 更新租户 Schema
export const updateTenantSchema = createTenantSchema.partial()

// 修改租户状态 Schema
export const changeTenantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    errorMap: () => ({ message: '无效的状态值' }),
  }),
})

// 租户列表查询参数 Schema
export const tenantListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type ChangeTenantStatusInput = z.infer<typeof changeTenantStatusSchema>
export type TenantListQuery = z.infer<typeof tenantListQuerySchema>
