/**
 * 权限缓存工具
 * 用于缓存用户权限，避免频繁查询数据库
 */

interface CacheEntry {
  permissions: string[]
  expiresAt: number
}

// 缓存过期时间（毫秒）- 默认5分钟
const CACHE_TTL = 5 * 60 * 1000

// 用户权限缓存 Map
const permissionCache = new Map<string, CacheEntry>()

/**
 * 获取用户权限（从缓存）
 */
export function getCachedPermissions(userId: string): string[] | null {
  const entry = permissionCache.get(userId)
  if (!entry) {
    return null
  }

  // 检查是否过期
  if (Date.now() > entry.expiresAt) {
    permissionCache.delete(userId)
    return null
  }

  return entry.permissions
}

/**
 * 设置用户权限缓存
 */
export function setCachedPermissions(userId: string, permissions: string[]): void {
  permissionCache.set(userId, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL,
  })
}

/**
 * 清除指定用户的权限缓存
 */
export function clearUserPermissionCache(userId: string): void {
  permissionCache.delete(userId)
}

/**
 * 清除指定角色相关的所有用户权限缓存
 * 当角色权限变更时调用
 */
export function clearRolePermissionCache(userIds: string[]): void {
  for (const userId of userIds) {
    permissionCache.delete(userId)
  }
}

/**
 * 清除所有权限缓存
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear()
}

/**
 * 获取缓存统计信息（用于调试）
 */
export function getPermissionCacheStats(): { size: number; keys: string[] } {
  return {
    size: permissionCache.size,
    keys: Array.from(permissionCache.keys()),
  }
}
