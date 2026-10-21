'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface AuditStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  UNAUDITED: 'bg-gray-500 hover:bg-gray-600',
  AUDITING: 'bg-blue-500 hover:bg-blue-600',
  APPROVED: 'bg-green-500 hover:bg-green-600',
  REJECTED: 'bg-red-500 hover:bg-red-600',
  ARCHIVED: 'bg-purple-500 hover:bg-purple-600',
}

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  const t = useTranslations('packagingMaterialTransaction')

  const colorClass = statusColors[status] || 'bg-gray-500 hover:bg-gray-600'

  return (
    <Badge className={colorClass}>
      {t(`auditStatus.${status}`)}
    </Badge>
  )
}
