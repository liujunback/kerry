'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface WarehouseTypeBadgeProps {
  type: string
}

export function WarehouseTypeBadge({ type }: WarehouseTypeBadgeProps) {
  const t = useTranslations('warehouse')

  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    SELF_BUILT: 'default',
    THIRD_PARTY: 'secondary',
    BONDED: 'outline',
  }

  return (
    <Badge variant={variants[type] || 'secondary'}>
      {t(`types.${type}` as 'types.SELF_BUILT' | 'types.THIRD_PARTY' | 'types.BONDED')}
    </Badge>
  )
}
