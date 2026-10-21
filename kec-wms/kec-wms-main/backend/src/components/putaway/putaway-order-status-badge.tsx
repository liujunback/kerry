'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { variant: 'secondary' },
  PARTIAL: { variant: 'default' },
  COMPLETED: { variant: 'outline' },
  CANCELLED: { variant: 'destructive' },
}

export function PutawayOrderStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('putaway')
  const config = statusConfig[status] || { variant: 'secondary' as const }

  return <Badge variant={config.variant}>{t(`statuses.${status}`)}</Badge>
}
