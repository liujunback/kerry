'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface AsnTypeBadgeProps {
  type: string
}

const typeColors: Record<string, string> = {
  NORMAL: 'bg-blue-100 text-blue-800',
  RETURN: 'bg-amber-100 text-amber-800',
  TRANSFER: 'bg-purple-100 text-purple-800',
  PRODUCTION: 'bg-green-100 text-green-800',
  ADJUSTMENT: 'bg-gray-100 text-gray-800',
}

export function AsnTypeBadge({ type }: AsnTypeBadgeProps) {
  const t = useTranslations('asn')

  return (
    <Badge className={typeColors[type] || 'bg-gray-100 text-gray-800'}>
      {t(`types.${type}`)}
    </Badge>
  )
}
