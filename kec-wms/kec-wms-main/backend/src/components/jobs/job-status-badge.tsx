'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface JobStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  PROCESSING: 'bg-blue-500 hover:bg-blue-600 text-white',
  COMPLETED: 'bg-green-500 hover:bg-green-600 text-white',
  FAILED: 'bg-red-500 hover:bg-red-600 text-white',
  CANCELLED: 'bg-gray-500 hover:bg-gray-600 text-white',
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const t = useTranslations('jobs')

  return (
    <Badge className={statusColors[status] || 'bg-gray-500 text-white'}>
      {t(`statuses.${status}`)}
    </Badge>
  )
}
