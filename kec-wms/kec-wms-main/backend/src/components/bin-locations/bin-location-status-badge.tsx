'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface BinLocationStatusBadgeProps {
  status: string
}

export function BinLocationStatusBadge({ status }: BinLocationStatusBadgeProps) {
  const t = useTranslations('binLocation')

  const variants: Record<string, 'default' | 'secondary'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    DISABLED: 'secondary',
  }

  const isKnownStatus = status === 'ACTIVE' || status === 'INACTIVE' || status === 'DISABLED'

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {isKnownStatus
        ? t(`status.${status}` as 'status.ACTIVE' | 'status.INACTIVE' | 'status.DISABLED')
        : status}
    </Badge>
  )
}
