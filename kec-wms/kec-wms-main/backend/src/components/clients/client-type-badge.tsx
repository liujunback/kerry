'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ClientTypeBadgeProps {
  type: string
}

const typeColors: Record<string, string> = {
  STANDARD: 'bg-blue-500 hover:bg-blue-600',
  VIP: 'bg-amber-500 hover:bg-amber-600',
  ENTERPRISE: 'bg-purple-500 hover:bg-purple-600',
  TRIAL: 'bg-gray-500 hover:bg-gray-600',
}

export function ClientTypeBadge({ type }: ClientTypeBadgeProps) {
  const t = useTranslations('client')

  return (
    <Badge className={typeColors[type] || 'bg-gray-500'}>
      {t(`types.${type}`)}
    </Badge>
  )
}
