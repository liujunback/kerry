import { z } from 'zod'

// 用户类型枚举
export const UserType = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
  SYSTEM: 'SYSTEM',
  API: 'API',
} as const

// 用户状态枚举
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  LOCKED: 'LOCKED',
  DISABLED: 'DISABLED',
} as const

// 权限范围类型枚举
export const ScopeType = {
  GLOBAL: 'GLOBAL',
  WAREHOUSE: 'WAREHOUSE',
  ZONE: 'ZONE',
} as const

// 密码复杂度正则：至少8位，包含大小写字母、数字、特殊字符
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{}|;':",.<>\/\\`~])/

// 创建用户 Schema
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(64, '用户名最多64个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  fullName: z
    .string()
    .min(2, '姓名至少2个字符')
    .max(128, '姓名最多128个字符'),
  email: z
    .string()
    .email('邮箱格式不正确')
    .max(128, '邮箱最多128个字符')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(32, '手机号最多32个字符')
    .optional()
    .or(z.literal('')),
  employeeId: z
    .string()
    .max(64, '工号最多64个字符')
    .optional()
    .or(z.literal('')),
  department: z
    .string()
    .max(128, '部门最多128个字符')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(64, '职位最多64个字符')
    .optional()
    .or(z.literal('')),
  userType: z.enum(['INTERNAL', 'EXTERNAL', 'SYSTEM', 'API'], {
    errorMap: () => ({ message: '无效的用户类型' }),
  }),
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(passwordRegex, '密码必须包含大小写字母、数字和特殊字符'),
})

// 更新用户 Schema（不包含密码）
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(64, '用户名最多64个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线')
    .optional(),
  fullName: z
    .string()
    .min(2, '姓名至少2个字符')
    .max(128, '姓名最多128个字符')
    .optional(),
  email: z
    .string()
    .email('邮箱格式不正确')
    .max(128, '邮箱最多128个字符')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(32, '手机号最多32个字符')
    .optional()
    .or(z.literal('')),
  employeeId: z
    .string()
    .max(64, '工号最多64个字符')
    .optional()
    .or(z.literal('')),
  department: z
    .string()
    .max(128, '部门最多128个字符')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(64, '职位最多64个字符')
    .optional()
    .or(z.literal('')),
  userType: z
    .enum(['INTERNAL', 'EXTERNAL', 'SYSTEM', 'API'], {
      errorMap: () => ({ message: '无效的用户类型' }),
    })
    .optional(),
})

// 修改用户状态 Schema
export const changeStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED'], {
    errorMap: () => ({ message: '无效的用户状态' }),
  }),
})

// 重置密码 Schema
export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(passwordRegex, '密码必须包含大小写字母、数字和特殊字符'),
})

// 分配角色 Schema
export const assignRoleSchema = z.object({
  roleId: z.string().uuid('无效的角色ID'),
  scopeType: z
    .enum(['GLOBAL', 'WAREHOUSE', 'ZONE'], {
      errorMap: () => ({ message: '无效的权限范围类型' }),
    })
    .default('GLOBAL'),
  scopeId: z.string().uuid('无效的范围ID').optional().nullable(),
})

export const bindUserWarehouseSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
  isDefault: z.boolean().optional().default(false),
})

export const setDefaultUserWarehouseSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
})

export const batchBindUserWarehouseSchema = z.object({
  userIds: z
    .array(z.string().uuid('无效的用户ID'))
    .min(1, '至少需要一个用户ID')
    .max(100, '每次最多100个用户'),
  warehouseIds: z
    .array(z.string().uuid('无效的仓库ID'))
    .min(1, '至少需要一个仓库ID')
    .max(20, '每次最多20个仓库'),
  defaultWarehouseId: z.string().uuid('无效的默认仓库ID').optional().nullable(),
  skipExisting: z.boolean().default(true),
  continueOnError: z.boolean().default(true),
}).refine(
  (data) => !data.defaultWarehouseId || data.warehouseIds.includes(data.defaultWarehouseId),
  { message: '默认仓库必须在已选择的仓库内', path: ['defaultWarehouseId'] }
)

export const batchUnbindUserWarehouseSchema = z.object({
  userIds: z
    .array(z.string().uuid('无效的用户ID'))
    .min(1, '至少需要一个用户ID')
    .max(100, '每次最多100个用户'),
  warehouseId: z.string().uuid('无效的仓库ID'),
  skipMissing: z.boolean().default(true),
  continueOnError: z.boolean().default(true),
})

// 批量分配角色 - 单个角色分配项 Schema
export const batchRoleAssignmentItemSchema = z
  .object({
    roleId: z.string().uuid('无效的角色ID'),
    scopeType: z
      .enum(['GLOBAL', 'WAREHOUSE', 'ZONE'], {
        errorMap: () => ({ message: '无效的权限范围类型' }),
      })
      .default('GLOBAL'),
    scopeId: z.string().uuid('无效的范围ID').optional().nullable(),
    isPrimary: z.boolean().default(false),
    effectiveDate: z.string().date('无效的日期格式').optional().nullable(),
    expiresAt: z.string().datetime('无效的日期时间格式').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.scopeType !== 'GLOBAL' && !data.scopeId) {
        return false
      }
      return true
    },
    { message: '当权限范围为仓库或区域时，必须指定范围ID', path: ['scopeId'] }
  )

// 批量分配角色 Schema
export const batchAssignRolesSchema = z.object({
  userIds: z
    .array(z.string().uuid('无效的用户ID'))
    .min(1, '至少需要一个用户ID')
    .max(100, '每次最多100个用户'),
  assignments: z
    .array(batchRoleAssignmentItemSchema)
    .min(1, '至少需要一个角色分配')
    .max(20, '每次最多20个角色分配'),
  skipExisting: z.boolean().default(true),
  continueOnError: z.boolean().default(true),
})

export const batchSetPdaLoginQrExpirySchema = z.object({
  userIds: z
    .array(z.string().uuid('无效的用户ID'))
    .min(1, '至少需要一个用户ID')
    .max(100, '每次最多100个用户'),
  expiresAt: z.string().datetime('无效的日期时间格式').nullable(),
})

// 用户列表查询参数 Schema
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED'])
    .nullish()
    .transform(v => v ?? undefined),
  userType: z.enum(['INTERNAL', 'EXTERNAL', 'SYSTEM', 'API']).nullish().transform(v => v ?? undefined),
  // SYSTEM 用户可按租户筛选
  tenantId: z.string().uuid().nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 类型导出
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type AssignRoleInput = z.infer<typeof assignRoleSchema>
export type BindUserWarehouseInput = z.infer<typeof bindUserWarehouseSchema>
export type SetDefaultUserWarehouseInput = z.infer<typeof setDefaultUserWarehouseSchema>
export type BatchBindUserWarehouseInput = z.infer<typeof batchBindUserWarehouseSchema>
export type BatchUnbindUserWarehouseInput = z.infer<typeof batchUnbindUserWarehouseSchema>
export type UserListQuery = z.infer<typeof userListQuerySchema>
export type BatchRoleAssignmentItem = z.infer<typeof batchRoleAssignmentItemSchema>
export type BatchAssignRolesInput = z.infer<typeof batchAssignRolesSchema>
export type BatchSetPdaLoginQrExpiryInput = z.infer<typeof batchSetPdaLoginQrExpirySchema>
