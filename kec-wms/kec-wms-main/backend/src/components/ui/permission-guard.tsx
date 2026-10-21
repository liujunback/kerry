'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/contexts/permission-context'

interface PermissionGuardProps {
  permission: string | string[]
  mode?: 'any' | 'all'
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({
  permission,
  mode = 'any',
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) return null

  const codes = Array.isArray(permission) ? permission : [permission]

  let hasAccess: boolean
  if (codes.length === 1) {
    hasAccess = hasPermission(codes[0])
  } else {
    hasAccess = mode === 'all' ? hasAllPermissions(codes) : hasAnyPermission(codes)
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
