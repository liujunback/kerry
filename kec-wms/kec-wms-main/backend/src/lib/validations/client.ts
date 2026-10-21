import { z } from 'zod'

// 客户类型枚举
export const ClientType = {
  STANDARD: 'STANDARD',
  VIP: 'VIP',
  ENTERPRISE: 'ENTERPRISE',
  TRIAL: 'TRIAL',
} as const

// 创建客户 Schema
export const createClientSchema = z.object({
  clientCode: z
    .string()
    .min(2, '客户编码至少2个字符')
    .max(32, '客户编码最多32个字符')
    .regex(/^[A-Z0-9-]+$/, '客户编码只能包含大写字母、数字和连字符'),
  clientName: z
    .string()
    .min(2, '客户名称至少2个字符')
    .max(128, '客户名称最多128个字符'),
  shortName: z.string().max(64, '客户简称最多64个字符').optional().or(z.literal('')),
  clientType: z
    .enum(['STANDARD', 'VIP', 'ENTERPRISE', 'TRIAL'], {
      errorMap: () => ({ message: '无效的客户类型' }),
    })
    .default('STANDARD'),
  contactPerson: z.string().max(64, '联系人最多64个字符').optional().or(z.literal('')),
  contactPhone: z.string().max(32, '联系电话最多32个字符').optional().or(z.literal('')),
  contactEmail: z.string().email('邮箱格式不正确').max(128).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().max(64, '城市最多64个字符').optional().or(z.literal('')),
  province: z.string().max(64, '省份最多64个字符').optional().or(z.literal('')),
  country: z.string().max(64, '国家代码最多64个字符').default('CN'),
  postalCode: z.string().max(20, '邮政编码最多20个字符').optional().or(z.literal('')),
  taxNumber: z.string().max(64, '税号最多64个字符').optional().or(z.literal('')),
  bankName: z.string().max(128, '开户银行最多128个字符').optional().or(z.literal('')),
  bankAccount: z.string().max(64, '银行账号最多64个字符').optional().or(z.literal('')),
  creditLimit: z.coerce.number().positive('信用额度必须为正数').optional().nullable(),
  paymentTerms: z.coerce.number().int().min(0).max(365).default(30),
  notes: z.string().optional().or(z.literal('')),
})

// 更新客户 Schema
export const updateClientSchema = createClientSchema.partial()

// 修改客户状态 Schema
export const changeClientStatusSchema = z.object({
  isActive: z.boolean(),
})

// 客户列表查询参数 Schema
export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  clientType: z.enum(['STANDARD', 'VIP', 'ENTERPRISE', 'TRIAL']).nullish().transform(v => v ?? undefined),
  isActive: z
    .string()
    .nullish()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  city: z.string().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ChangeClientStatusInput = z.infer<typeof changeClientStatusSchema>
export type ClientListQuery = z.infer<typeof clientListQuerySchema>
