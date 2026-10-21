'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ClientStatusBadgeProps {
  isActive: boolean
}

export function ClientStatusBadge({ isActive }: ClientStatusBadgeProps) {
  const t = useTranslations('client')

  if (isActive) {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        {t('status.ACTIVE')}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {t('status.INACTIVE')}
    </Badge>
  )
}
