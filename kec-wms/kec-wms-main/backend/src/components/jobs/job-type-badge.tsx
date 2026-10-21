'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface JobTypeBadgeProps {
  jobType: string
  jobSubType?: string | null
}

const typeColors: Record<string, string> = {
  DATA_UPLOAD: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  REPORT_EXPORT: 'bg-purple-500 hover:bg-purple-600 text-white',
  INVENTORY_ALLOCATION: 'bg-cyan-500 hover:bg-cyan-600 text-white',
  INVENTORY_COUNT_SCOPE: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  WAVE_STRATEGY_EXECUTE: 'bg-blue-600 hover:bg-blue-700 text-white',
  WAVE_RELEASE: 'bg-sky-600 hover:bg-sky-700 text-white',
  SHIPMENT_STATUS_PUSH: 'bg-orange-500 hover:bg-orange-600 text-white',
}

export function JobTypeBadge({ jobType, jobSubType }: JobTypeBadgeProps) {
  const t = useTranslations('jobs')

  return (
    <div className="flex items-center gap-1">
      <Badge className={typeColors[jobType] || 'bg-gray-500 text-white'}>
        {t(`types.${jobType}`)}
      </Badge>
      {jobSubType && (
        <Badge variant="outline" className="text-xs">
          {t(`subTypes.${jobSubType}`)}
        </Badge>
      )}
    </div>
  )
}
