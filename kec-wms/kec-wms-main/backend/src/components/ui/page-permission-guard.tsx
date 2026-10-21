'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/contexts/permission-context'
import { Loader2 } from 'lucide-react'

interface PagePermissionGuardProps {
  permission: string | string[]
  mode?: 'any' | 'all'
  children: React.ReactNode
}

export function PagePermissionGuard({
  permission,
  mode = 'any',
  children,
}: PagePermissionGuardProps) {
  const router = useRouter()
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  const codes = Array.isArray(permission) ? permission : [permission]

  let hasAccess: boolean
  if (loading) {
    hasAccess = true // 加载中暂时允许
  } else if (codes.length === 1) {
    hasAccess = hasPermission(codes[0])
  } else {
    hasAccess = mode === 'all' ? hasAllPermissions(codes) : hasAnyPermission(codes)
  }

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/forbidden')
    }
  }, [loading, hasAccess, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}
