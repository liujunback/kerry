'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

interface TimeGranularitySelectorProps {
  value: TimeGranularity
  onChange: (value: TimeGranularity) => void
  className?: string
}

export function TimeGranularitySelector({
  value,
  onChange,
  className,
}: TimeGranularitySelectorProps) {
  const t = useTranslations('reports.timeGranularity')

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hour">{t('hour')}</SelectItem>
        <SelectItem value="day">{t('day')}</SelectItem>
        <SelectItem value="week">{t('week')}</SelectItem>
        <SelectItem value="month">{t('month')}</SelectItem>
        <SelectItem value="quarter">{t('quarter')}</SelectItem>
        <SelectItem value="year">{t('year')}</SelectItem>
      </SelectContent>
    </Select>
  )
}
