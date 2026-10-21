'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface AsnStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  PENDING_RECEIVING: 'bg-blue-100 text-blue-800',
  RECEIVING: 'bg-cyan-100 text-cyan-800',
  RECEIVED: 'bg-indigo-100 text-indigo-800',
  PUTTING_AWAY: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-slate-100 text-slate-800',
}

export function AsnStatusBadge({ status }: AsnStatusBadgeProps) {
  const t = useTranslations('asn')

  return (
    <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
      {t(`statuses.${status}`)}
    </Badge>
  )
}
