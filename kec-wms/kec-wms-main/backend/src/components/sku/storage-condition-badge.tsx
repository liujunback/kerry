'use client'

import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface StorageConditionBadgeProps {
  condition: string
}

export function StorageConditionBadge({ condition }: StorageConditionBadgeProps) {
  const t = useTranslations('sku')

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    NORMAL: 'default',
    COLD: 'secondary',
    FROZEN: 'outline',
    HAZMAT: 'destructive',
    CONTROLLED: 'destructive',
  }

  return (
    <Badge variant={variants[condition] || 'outline'}>
      {t(`storageCondition.${condition}`)}
    </Badge>
  )
}
