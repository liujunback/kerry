'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface UserStatusBadgeProps {
  status: string
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const t = useTranslations('users.userStatus')

  const getVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'INACTIVE':
        return 'secondary'
      case 'SUSPENDED':
        return 'warning'
      case 'LOCKED':
        return 'destructive'
      case 'DISABLED':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <Badge variant={getVariant(status) as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'}>
      {t(status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DISABLED')}
    </Badge>
  )
}
