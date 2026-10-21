'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { usePathname } from 'next/navigation'

interface PermissionContextType {
  permissions: string[]
  loading: boolean
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
  hasAllPermissions: (codes: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | null>(null)

const CACHE_KEY = 'wms_permissions'
const CACHE_EXPIRY_KEY = 'wms_permissions_expiry'
const CACHE_DURATION = 10 * 60 * 1000 // 10 分钟

function getCachedPermissions(): string[] | null {
  if (typeof window === 'undefined') return null
  try {
    const expiry = sessionStorage.getItem(CACHE_EXPIRY_KEY)
    if (expiry && Date.now() < parseInt(expiry, 10)) {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached)
    }
  } catch {
    // 忽略缓存读取错误
  }
  return null
}

function setCachedPermissions(permissions: string[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(permissions))
    sessionStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION))
  } catch {
    // 忽略缓存写入错误
  }
}

function clearCachedPermissions() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CACHE_KEY)
    sessionStorage.removeItem(CACHE_EXPIRY_KEY)
  } catch {
    // 忽略缓存清除错误
  }
}

export function PermissionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // 初始状态必须在服务端和客户端一致，避免 hydration 错误
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = getCachedPermissions()
      if (cached) {
        setPermissions(cached)
        setLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/v1/auth/me')
      const result = await response.json()
      if (result.success && result.data.permissions) {
        setPermissions(result.data.permissions)
        setCachedPermissions(result.data.permissions)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // 路由变化时检查缓存是否过期，过期则刷新
  useEffect(() => {
    const cached = getCachedPermissions()
    if (!cached) {
      // 缓存已过期，重新获取
      fetchPermissions(true)
    }
  }, [pathname, fetchPermissions])

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
    [permissions]
  )

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((c) => permissions.includes(c)),
    [permissions]
  )

  const hasAllPermissions = useCallback(
    (codes: string[]) => codes.every((c) => permissions.includes(c)),
    [permissions]
  )

  // 导出清除缓存的方法，供登出时使用
  const refreshPermissions = useCallback(async () => {
    clearCachedPermissions()
    await fetchPermissions(true)
  }, [fetchPermissions])

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider')
  }
  return context
}

// 导出清除缓存的方法，供登出时使用
export function clearPermissionCache() {
  clearCachedPermissions()
}
