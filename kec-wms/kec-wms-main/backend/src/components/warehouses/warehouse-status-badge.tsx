'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface WarehouseStatusBadgeProps {
  status: string
}

export function WarehouseStatusBadge({ status }: WarehouseStatusBadgeProps) {
  const t = useTranslations('warehouse')

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    MAINTENANCE: 'outline',
  }

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {t(`status.${status}` as 'status.ACTIVE' | 'status.INACTIVE' | 'status.MAINTENANCE')}
    </Badge>
  )
}
