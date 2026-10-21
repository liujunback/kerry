'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface RoleLevelBadgeProps {
  level: number
}

export function RoleLevelBadge({ level }: RoleLevelBadgeProps) {
  const t = useTranslations('role.roleLevels')

  const getVariant = (level: number) => {
    switch (level) {
      case 1:
        return 'destructive'
      case 2:
        return 'warning'
      case 3:
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  return (
    <Badge variant={getVariant(level) as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'}>
      {t(String(level) as '1' | '2' | '3')}
    </Badge>
  )
}
