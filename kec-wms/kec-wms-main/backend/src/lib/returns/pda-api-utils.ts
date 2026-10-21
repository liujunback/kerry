import type { AuthUser } from '@/lib/auth/middleware'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'

export async function requireReturnPdaPermission(user: AuthUser, permissionCode: string) {
  return requirePermissionForUser(user.id, permissionCode)
}
