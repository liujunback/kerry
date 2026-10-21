'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface BinLocationLockBadgeProps {
  lockStatus: string
}

export function BinLocationLockBadge({ lockStatus }: BinLocationLockBadgeProps) {
  const t = useTranslations('binLocation')

  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    UNLOCKED: 'default',
    LOCKED: 'destructive',
  }

  return (
    <Badge variant={variants[lockStatus] || 'secondary'}>
      {t(`lockStatus.${lockStatus}` as 'lockStatus.UNLOCKED' | 'lockStatus.LOCKED')}
    </Badge>
  )
}
