'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ZoneTypeBadgeProps {
  type: string
}

export function ZoneTypeBadge({ type }: ZoneTypeBadgeProps) {
  const t = useTranslations('zone')

  const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    RECEIVING: 'default',
    STORAGE: 'secondary',
    PICKING: 'outline',
    PACKING: 'outline',
    SHIPPING: 'destructive',
  }

  return (
    <Badge variant={variants[type] || 'secondary'}>
      {t(`types.${type}` as 'types.RECEIVING' | 'types.STORAGE' | 'types.PICKING' | 'types.PACKING' | 'types.SHIPPING')}
    </Badge>
  )
}
