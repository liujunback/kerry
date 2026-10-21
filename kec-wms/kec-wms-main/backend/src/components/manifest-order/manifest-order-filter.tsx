'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths } from '@/lib/utils/date-formatter'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { CompactFilterActions, EnumFilterSelect, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

const statuses = ['CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

type DateType = 'created' | 'completed'
type DatePreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'
type ManifestFilterKey = 'search' | 'status' | 'dateType' | 'datePreset' | 'dateFrom' | 'dateTo'

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm:ss"
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'

const formatDateTimeLocalValue = (value: Date) => format(value, DATETIME_LOCAL_FORMAT)

const normalizeDateTimeLocalValue = (value: string, boundary: 'start' | 'end') => {
  if (!value) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const baseDate = new Date(`${value}T00:00:00`)
    return formatDateTimeLocalValue(boundary === 'end' ? endOfDay(baseDate) : startOfDay(baseDate))
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return formatDateTimeLocalValue(parsed)
}

const normalizeBoundaryInputValue = (value: string, boundary: 'start' | 'end') => {
  if (!value) return ''
  return normalizeDateTimeLocalValue(value.slice(0, 10), boundary)
}

const normalizeQueryDateTimeValue = (value: string, boundary: 'start' | 'end') => {
  if (!value) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return boundary === 'end' ? `${value}T23:59:59` : `${value}T00:00:00`
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return boundary === 'end' ? `${value}:59` : `${value}:00`
  }

  return value
}

const getDateRange = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date()

  switch (preset) {
    case 'today':
      return {
        from: formatDateTimeLocalValue(startOfDay(today)),
        to: formatDateTimeLocalValue(endOfDay(today)),
      }
    case 'last7days':
      return {
        from: formatDateTimeLocalValue(startOfDay(subDays(today, 6))),
        to: formatDateTimeLocalValue(endOfDay(today)),
      }
    case 'last30days':
      return {
        from: formatDateTimeLocalValue(startOfDay(subDays(today, 29))),
        to: formatDateTimeLocalValue(endOfDay(today)),
      }
    case 'thisMonth':
      return {
        from: formatDateTimeLocalValue(startOfDay(startOfMonth(today))),
        to: formatDateTimeLocalValue(endOfDay(endOfMonth(today))),
      }
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1)
      return {
        from: formatDateTimeLocalValue(startOfDay(startOfMonth(lastMonth))),
        to: formatDateTimeLocalValue(endOfDay(endOfMonth(lastMonth))),
      }
    }
    default:
      return { from: '', to: '' }
  }
}

const manifestFilterKeys = [
  'search',
  'status',
  'dateType',
  'datePreset',
  'dateFrom',
  'dateTo',
] as const satisfies readonly ManifestFilterKey[]

function getManifestDefaultFilters() {
  const range = getDateRange('last30days')
  return {
    dateType: 'created',
    datePreset: 'last30days',
    dateFrom: range.from,
    dateTo: range.to,
  } satisfies Partial<Record<ManifestFilterKey, string>>
}

export function ManifestOrderFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('manifestOrder')
  const tCommon = useTranslations('common')
  const defaultFilters = getManifestDefaultFilters()
  const { currentFilters, resetToDefaults } = usePersistedListFilters<ManifestFilterKey>({
    storageKey: 'manifest-orders:list:filters',
    pathname: '/manifest-orders',
    filterKeys: manifestFilterKeys,
    initializeDefaults: getManifestDefaultFilters,
    resetTo: getManifestDefaultFilters,
  })

  const currentSearch = currentFilters.search || ''
  const currentStatus = currentFilters.status || ''
  const currentDateType = (currentFilters.dateType as DateType) || (defaultFilters.dateType as DateType)
  const currentDatePreset = (currentFilters.datePreset as DatePreset) || (defaultFilters.datePreset as DatePreset)
  const currentDateFrom = normalizeDateTimeLocalValue(currentFilters.dateFrom || defaultFilters.dateFrom || '', 'start')
  const currentDateTo = normalizeDateTimeLocalValue(currentFilters.dateTo || defaultFilters.dateTo || '', 'end')

  const dateRange = useMemo(() => {
    if (currentDatePreset === 'custom') {
      return {
        from: currentDateFrom || formatDateTimeLocalValue(startOfDay(new Date())),
        to: currentDateTo || formatDateTimeLocalValue(endOfDay(new Date())),
      }
    }
    return getDateRange(currentDatePreset)
  }, [currentDatePreset, currentDateFrom, currentDateTo])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/manifest-orders?${params.toString()}`)
  }

  const updateDateFilter = (type: DateType, preset: DatePreset, from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('dateType', type)
    params.set('datePreset', preset)

    if (preset === 'custom') {
      if (from) params.set('dateFrom', normalizeQueryDateTimeValue(from, 'start'))
      else params.delete('dateFrom')
      if (to) params.set('dateTo', normalizeQueryDateTimeValue(to, 'end'))
      else params.delete('dateTo')
    } else {
      const range = getDateRange(preset)
      params.set('dateFrom', normalizeQueryDateTimeValue(range.from, 'start'))
      params.set('dateTo', normalizeQueryDateTimeValue(range.to, 'end'))
    }

    params.set('page', '1')
    router.push(`/manifest-orders?${params.toString()}`)
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    updateFilter('search', String(formData.get('search') || ''))
  }

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8 xl:items-end">
          <div className={`${filterFieldClassName} xl:col-span-2`}>
            <span className="text-xs text-muted-foreground">{tCommon('search')}</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="search" defaultValue={currentSearch} placeholder={t('searchPlaceholder')} className="h-8 pl-9" />
            </div>
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('status')}</span>
            <EnumFilterSelect
              value={currentStatus}
              onValueChange={(value) => updateFilter('status', value)}
              allLabel={tCommon('all')}
              options={statuses.map((item) => ({ value: item, label: t(`statuses.${item}`) }))}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('dateType')}</span>
            <EnumFilterSelect
              value={currentDateType}
              onValueChange={(value) => updateDateFilter(value as DateType, currentDatePreset)}
              showAllOption={false}
              allLabel={t('dateRange.created')}
              options={[
                { value: 'created', label: t('dateRange.created') },
                { value: 'completed', label: t('dateRange.completed') },
              ]}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('datePreset')}</span>
            <EnumFilterSelect
              value={currentDatePreset}
              onValueChange={(value) => updateDateFilter(currentDateType, (value || 'last30days') as DatePreset)}
              showAllOption={false}
              allLabel={tCommon('custom')}
              options={[
                { value: 'today', label: tCommon('today') },
                { value: 'last7days', label: tCommon('last7days') },
                { value: 'last30days', label: tCommon('last30days') },
                { value: 'thisMonth', label: tCommon('thisMonth') },
                { value: 'lastMonth', label: tCommon('lastMonth') },
                { value: 'custom', label: tCommon('custom') },
              ]}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('startDateTime')}</span>
            <Input
              type="datetime-local"
              value={dateRange.from}
              onChange={(e) => updateDateFilter(currentDateType, 'custom', normalizeBoundaryInputValue(e.target.value, 'start'), dateRange.to)}
              className="h-8 flex-1"
              disabled={currentDatePreset !== 'custom'}
              step={1}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('endDateTime')}</span>
            <Input
              type="datetime-local"
              value={dateRange.to}
              onChange={(e) => updateDateFilter(currentDateType, 'custom', dateRange.from, normalizeBoundaryInputValue(e.target.value, 'end'))}
              className="h-8 flex-1"
              disabled={currentDatePreset !== 'custom'}
              step={1}
            />
          </div>
          </div>

          <CompactFilterActions
            pendingChangeCount={0}
            searchLabel={tCommon('search')}
            resetLabel={tCommon('reset')}
            moreLabel=""
            collapseLabel=""
            expanded={false}
            onReset={resetToDefaults}
            onToggleExpanded={() => {}}
            showToggle={false}
            className="mt-2 xl:mt-0 xl:w-[180px] xl:shrink-0"
          />
        </div>
      </form>
    </ListFilterCard>
  )
}
