import type { AuthUser } from '@/lib/auth/middleware'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'

const PDA_INVENTORY_COUNT_PERMISSION = 'inventory:count'

export async function requirePdaInventoryCountPermission(authUser: AuthUser) {
  return requirePermissionForUser(authUser.id, PDA_INVENTORY_COUNT_PERMISSION)
}
