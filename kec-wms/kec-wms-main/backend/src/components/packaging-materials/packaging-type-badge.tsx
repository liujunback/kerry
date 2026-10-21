'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface PackagingTypeBadgeProps {
  type: string
}

const typeColors: Record<string, string> = {
  BOX: 'bg-blue-500 hover:bg-blue-600',
  BAG: 'bg-purple-500 hover:bg-purple-600',
  ENVELOPE: 'bg-cyan-500 hover:bg-cyan-600',
  BUBBLE_WRAP: 'bg-pink-500 hover:bg-pink-600',
  FOAM: 'bg-orange-500 hover:bg-orange-600',
  TAPE: 'bg-yellow-500 hover:bg-yellow-600',
  LABEL: 'bg-indigo-500 hover:bg-indigo-600',
  FILLER: 'bg-teal-500 hover:bg-teal-600',
  OTHER: 'bg-gray-500 hover:bg-gray-600',
}

export function PackagingTypeBadge({ type }: PackagingTypeBadgeProps) {
  const t = useTranslations('packagingMaterial')

  const colorClass = typeColors[type] || typeColors.OTHER

  return (
    <Badge className={colorClass}>
      {t(`types.${type}`)}
    </Badge>
  )
}
