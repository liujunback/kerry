'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ContainerStatusBadgeProps {
  enabledStatus: string
  workStatus: string
}

export function ContainerStatusBadge({ enabledStatus, workStatus }: ContainerStatusBadgeProps) {
  const t = useTranslations('containers')

  const getEnabledVariant = (status: string) => {
    switch (status) {
      case 'ENABLED':
        return 'success'
      case 'DISABLED':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getWorkVariant = (status: string) => {
    switch (status) {
      case 'IDLE':
        return 'outline'
      case 'OCCUPIED':
        return 'warning'
      case 'CLOSED':
        return 'default'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="flex gap-1">
      <Badge variant={getEnabledVariant(enabledStatus) as 'success' | 'secondary'}>
        {t(`enabledStatuses.${enabledStatus}` as 'enabledStatuses.ENABLED' | 'enabledStatuses.DISABLED')}
      </Badge>
      <Badge variant={getWorkVariant(workStatus) as 'outline' | 'warning' | 'secondary'}>
        {t(`workStatuses.${workStatus}` as 'workStatuses.IDLE' | 'workStatuses.OCCUPIED')}
      </Badge>
    </div>
  )
}
