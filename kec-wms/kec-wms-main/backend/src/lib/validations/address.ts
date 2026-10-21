import { z } from 'zod'

// 地址创建 Schema
export const addressSchema = z.object({
  contactName: z.string().min(1, '联系人姓名不能为空'),
  contactPhone: z.string().max(32, '联系人电话最多32个字符').optional().nullable(),
  contactEmail: z.string().email('邮箱格式错误').max(128).optional().nullable(),
  addressLine: z.string().min(1, '详细地址不能为空'),
  city: z.string().max(64, '城市最多64个字符').optional().nullable(),
  province: z.string().max(64, '省份最多64个字符').optional().nullable(),
  country: z.string().max(64, '国家最多64个字符').default('CN'),
  postalCode: z.string().max(20, '邮编最多20个字符').optional().nullable(),
})

// 地址更新 Schema（所有字段可选）
export const addressUpdateSchema = z.object({
  contactName: z.string().min(1, '联系人姓名不能为空').optional(),
  contactPhone: z.string().max(32, '联系人电话最多32个字符').optional().nullable(),
  contactEmail: z.string().email('邮箱格式错误').max(128).optional().nullable(),
  addressLine: z.string().min(1, '详细地址不能为空').optional(),
  city: z.string().max(64, '城市最多64个字符').optional().nullable(),
  province: z.string().max(64, '省份最多64个字符').optional().nullable(),
  country: z.string().max(64, '国家最多64个字符').optional(),
  postalCode: z.string().max(20, '邮编最多20个字符').optional().nullable(),
})

// 类型导出
export type AddressInput = z.infer<typeof addressSchema>
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>
