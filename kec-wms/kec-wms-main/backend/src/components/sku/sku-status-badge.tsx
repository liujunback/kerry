'use client'

import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface SkuStatusBadgeProps {
  status: string
}

export function SkuStatusBadge({ status }: SkuStatusBadgeProps) {
  const t = useTranslations('sku')

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
  }

  return (
    <Badge variant={variants[status] || 'outline'}>
      {t(`status.${status}`)}
    </Badge>
  )
}
