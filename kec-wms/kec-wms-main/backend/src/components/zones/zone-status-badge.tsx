'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ZoneStatusBadgeProps {
  status: string
}

export function ZoneStatusBadge({ status }: ZoneStatusBadgeProps) {
  const t = useTranslations('zone')

  const variants: Record<string, 'default' | 'secondary'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
  }

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {t(`status.${status}` as 'status.ACTIVE' | 'status.INACTIVE')}
    </Badge>
  )
}
