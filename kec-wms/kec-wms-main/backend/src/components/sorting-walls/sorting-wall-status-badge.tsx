'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface SortingWallStatusBadgeProps {
  status: string
  type: 'sort' | 'active'
}

export function SortingWallStatusBadge({
  status,
  type,
}: SortingWallStatusBadgeProps) {
  const t = useTranslations('sortingWall')

  if (type === 'sort') {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      IDLE: 'secondary',
      SORTING: 'default',
      SORTED: 'outline',
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {t(`sortStatuses.${status}`)}
      </Badge>
    )
  }

  if (type === 'active') {
    return (
      <Badge variant={status === 'true' ? 'default' : 'outline'}>
        {t(`activeStatuses.${status}`)}
      </Badge>
    )
  }

  return null
}
