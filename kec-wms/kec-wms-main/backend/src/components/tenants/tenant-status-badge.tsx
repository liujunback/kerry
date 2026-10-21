'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface TenantStatusBadgeProps {
  status: string
}

export function TenantStatusBadge({ status }: TenantStatusBadgeProps) {
  const t = useTranslations('tenant')

  const variants: Record<string, string> = {
    ACTIVE: 'bg-green-500 hover:bg-green-600',
    INACTIVE: 'bg-gray-500 hover:bg-gray-600',
    SUSPENDED: 'bg-red-500 hover:bg-red-600',
  }

  return (
    <Badge variant="default" className={variants[status] || 'bg-gray-500'}>
      {t(`status.${status}`)}
    </Badge>
  )
}
