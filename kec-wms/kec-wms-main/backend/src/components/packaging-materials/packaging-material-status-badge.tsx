'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface PackagingMaterialStatusBadgeProps {
  isActive: boolean
}

export function PackagingMaterialStatusBadge({ isActive }: PackagingMaterialStatusBadgeProps) {
  const t = useTranslations('packagingMaterial')

  if (isActive) {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        {t('status.ENABLED')}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {t('status.DISABLED')}
    </Badge>
  )
}
