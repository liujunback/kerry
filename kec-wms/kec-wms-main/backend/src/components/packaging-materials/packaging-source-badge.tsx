'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface PackagingSourceBadgeProps {
  source: string
}

const sourceColors: Record<string, string> = {
  PURCHASE: 'bg-green-500 hover:bg-green-600',
  CUSTOMER_PROVIDED: 'bg-blue-500 hover:bg-blue-600',
  RECYCLED: 'bg-amber-500 hover:bg-amber-600',
}

export function PackagingSourceBadge({ source }: PackagingSourceBadgeProps) {
  const t = useTranslations('packagingMaterial')

  const colorClass = sourceColors[source] || 'bg-gray-500 hover:bg-gray-600'

  return (
    <Badge className={colorClass}>
      {t(`sources.${source}`)}
    </Badge>
  )
}
