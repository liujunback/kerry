'use client'

import { forwardRef } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { usePermissions } from '@/contexts/permission-context'

interface PermissionButtonProps extends ButtonProps {
  permission: string
  fallback?: React.ReactNode
}

export const PermissionButton = forwardRef<HTMLButtonElement, PermissionButtonProps>(
  ({ permission, fallback = null, children, ...props }, ref) => {
    const { hasPermission, loading } = usePermissions()

    if (loading) return null
    if (!hasPermission(permission)) return <>{fallback}</>

    return (
      <Button ref={ref} {...props}>
        {children}
      </Button>
    )
  }
)

PermissionButton.displayName = 'PermissionButton'
