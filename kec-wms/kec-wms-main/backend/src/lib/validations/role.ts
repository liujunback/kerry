import { z } from 'zod'

// 角色编码正则：大写字母开头，只能包含大写字母、数字和下划线
const roleCodeRegex = /^[A-Z][A-Z0-9_]*$/

export const createRoleSchema = z.object({
  roleCode: z
    .string()
    .min(2, '角色编码至少2个字符')
    .max(32, '角色编码最多32个字符')
    .regex(roleCodeRegex, '角色编码必须以大写字母开头，只能包含大写字母、数字和下划线'),
  roleName: z
    .string()
    .min(2, '角色名称至少2个字符')
    .max(64, '角色名称最多64个字符'),
  description: z
    .string()
    .max(500, '描述最多500个字符')
    .optional()
    .nullable(),
  roleLevel: z
    .number()
    .int()
    .min(1, '角色等级最小为1')
    .max(3, '角色等级最大为3')
    .default(3),
  parentRoleId: z
    .string()
    .uuid('无效的父角色ID')
    .optional()
    .nullable(),
})

export const updateRoleSchema = createRoleSchema.partial()

export const assignPermissionSchema = z.object({
  permissionId: z.string().uuid('无效的权限ID'),
  limitation: z.record(z.any()).optional().nullable(),
  isGranted: z.boolean().default(true),
})

export const batchAssignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid('无效的权限ID')),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type AssignPermissionInput = z.infer<typeof assignPermissionSchema>
export type BatchAssignPermissionsInput = z.infer<typeof batchAssignPermissionsSchema>
