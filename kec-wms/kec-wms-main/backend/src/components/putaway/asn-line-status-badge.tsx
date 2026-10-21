'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface AsnLineStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-500 hover:bg-gray-600 text-white',
  RECEIVING: 'bg-cyan-500 hover:bg-cyan-600 text-white',
  RECEIVED: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  PARTIAL_PUTAWAY: 'bg-purple-500 hover:bg-purple-600 text-white',
  PUTAWAY: 'bg-purple-500 hover:bg-purple-600 text-white',
  COMPLETED: 'bg-green-500 hover:bg-green-600 text-white',
}

export function AsnLineStatusBadge({ status }: AsnLineStatusBadgeProps) {
  const t = useTranslations('putaway')

  return (
    <Badge className={statusColors[status] || 'bg-gray-500 text-white'}>
      {t(`asnLineStatuses.${status}`)}
    </Badge>
  )
}
