'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface AsnLineStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-500 hover:bg-gray-600',
  RECEIVING: 'bg-cyan-500 hover:bg-cyan-600',
  RECEIVED: 'bg-blue-500 hover:bg-blue-600',
  PARTIAL_PUTAWAY: 'bg-purple-500 hover:bg-purple-600',
  PUTAWAY: 'bg-green-500 hover:bg-green-600',
  CANCELLED: 'bg-red-500 hover:bg-red-600',
}

export function AsnLineStatusBadge({ status }: AsnLineStatusBadgeProps) {
  const t = useTranslations('asn')

  return (
    <Badge className={statusColors[status] || 'bg-gray-500'}>
      {t(`line.statuses.${status}`)}
    </Badge>
  )
}
