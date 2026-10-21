'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from '@/lib/utils/date-formatter'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onDateChange: (start: Date | null, end: Date | null) => void
  className?: string
}

type PresetKey = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const t = useTranslations('reports')
  const [preset, setPreset] = useState<PresetKey>('last7days')

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'today', label: t('dateRange.today') },
    { key: 'last7days', label: t('dateRange.last7days') },
    { key: 'last30days', label: t('dateRange.last30days') },
    { key: 'thisMonth', label: t('dateRange.thisMonth') },
    { key: 'lastMonth', label: t('dateRange.lastMonth') },
    { key: 'custom', label: t('dateRange.custom') },
  ]

  const handlePresetChange = (value: PresetKey) => {
    setPreset(value)
    const today = new Date()

    switch (value) {
      case 'today':
        onDateChange(today, today)
        break
      case 'last7days':
        onDateChange(subDays(today, 6), today)
        break
      case 'last30days':
        onDateChange(subDays(today, 29), today)
        break
      case 'thisMonth':
        onDateChange(startOfMonth(today), endOfMonth(today))
        break
      case 'lastMonth':
        const lastMonth = subMonths(today, 1)
        onDateChange(startOfMonth(lastMonth), endOfMonth(lastMonth))
        break
      case 'custom':
        break
    }
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onDateChange(date, endDate)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onDateChange(startDate, date)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.key} value={p.key}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={handleStartDateChange}
            className="w-[140px]"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={handleEndDateChange}
            className="w-[140px]"
          />
        </div>
      )}
    </div>
  )
}
