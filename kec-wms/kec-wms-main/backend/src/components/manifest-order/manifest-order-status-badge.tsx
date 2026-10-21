'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ManifestOrderStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export function ManifestOrderStatusBadge({ status }: ManifestOrderStatusBadgeProps) {
  const t = useTranslations('manifestOrder')

  return (
    <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
      {t(`statuses.${status}`)}
    </Badge>
  )
}
