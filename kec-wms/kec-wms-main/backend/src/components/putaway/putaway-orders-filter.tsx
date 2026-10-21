'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from '@/lib/utils/date-formatter'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ClientSelect } from '@/components/clients/client-select'
import {
  AppliedFilterChips,
  CompactFilterActions,
  compactAppliedFilterChips,
  EnumFilterSelect,
  ListFilterCard,
} from '@/components/list-filters'
import type { AppliedFilterChip } from '@/components/list-filters'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'
import { formatCodeNameLabel, resolveReadableOptionLabel } from '@/lib/filters/readable-filter-value'

interface ClientOption {
  id: string
  clientCode: string
  clientName: string
}

const statuses = ['PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED'] as const
const putawayModes = ['TASK_MODE', 'CONTAINER_MODE', 'MIXED_MODE'] as const
const filterFieldClassName = 'flex h-full flex-col justify-end gap-1'

type DatePreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

const BATCH_SPLIT_REGEX = /[\n,\uFF0C;\uFF1B\s]+/
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm:ss"

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
  return normalizeDateTimeLocalValue(value, boundary)
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

function parseBatchValues(value: string) {
  return value
    .split(BATCH_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeBatchInput(value: string) {
  return parseBatchValues(value).join(',')
}

export function PutawayOrdersFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('putaway')
  const tCommon = useTranslations('common')

  const noActiveFiltersLabel =
    ('has' in t && typeof t.has === 'function' && t.has('noActiveFilters'))
      ? t('noActiveFilters')
      : 'No active filters'
  const loadingLabel =
    ('has' in tCommon && typeof tCommon.has === 'function' && tCommon.has('loading'))
      ? tCommon('loading')
      : 'Loading...'
  const moreFiltersLabel =
    ('has' in t && typeof t.has === 'function' && t.has('moreFilters'))
      ? t('moreFilters')
      : '更多筛选'
  const collapseFiltersLabel =
    ('has' in t && typeof t.has === 'function' && t.has('collapseFilters'))
      ? t('collapseFilters')
      : '收起筛选'

  const { options: clients } = useCachedOptions<ClientOption>({
    cacheKey: 'clients:active:list',
    fetcher: async () => {
      const response = await fetch('/api/v1/clients?pageSize=100&isActive=true')
      const result = await response.json()
      return result.success ? (result.data || []) : []
    },
  })
  const initialSearch = searchParams.get('search') || ''
  const initialAsnNumber = searchParams.get('asnNumber') || ''
  const initialStatus = searchParams.get('status') || ''
  const initialPutawayMode = searchParams.get('putawayMode') || ''
  const initialClientId = searchParams.get('clientId') || ''
  const initialDatePreset = (searchParams.get('datePreset') as DatePreset) || ''
  const initialDateFrom = normalizeDateTimeLocalValue(searchParams.get('dateFrom') || '', 'start')
  const initialDateTo = normalizeDateTimeLocalValue(searchParams.get('dateTo') || '', 'end')

  const [search, setSearch] = useState(initialSearch)
  const [asnNumber, setAsnNumber] = useState(initialAsnNumber)
  const [status, setStatus] = useState(initialStatus)
  const [putawayMode, setPutawayMode] = useState(initialPutawayMode)
  const [clientId, setClientId] = useState(initialClientId)
  const [datePreset, setDatePreset] = useState<DatePreset | ''>(initialDatePreset)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const searchCount = search ? parseBatchValues(search).length : 0
  const asnNumberCount = asnNumber ? parseBatchValues(asnNumber).length : 0
  const appliedSearch = normalizeBatchInput(searchParams.get('search') || '')
  const appliedAsnNumber = normalizeBatchInput(searchParams.get('asnNumber') || '')
  const appliedStatus = searchParams.get('status') || ''
  const appliedPutawayMode = searchParams.get('putawayMode') || ''
  const appliedClientId = searchParams.get('clientId') || ''
  const appliedDatePreset = (searchParams.get('datePreset') as DatePreset) || ''
  const appliedDateFrom = normalizeDateTimeLocalValue(searchParams.get('dateFrom') || '', 'start')
  const appliedDateTo = normalizeDateTimeLocalValue(searchParams.get('dateTo') || '', 'end')
  const normalizedSearch = normalizeBatchInput(search)
  const normalizedAsnNumber = normalizeBatchInput(asnNumber)
  const draftDateFrom = datePreset ? dateFrom : ''
  const draftDateTo = datePreset ? dateTo : ''
  const currentDatePreset = datePreset || ''
  const visibleDateRange = useMemo(() => {
    if (!datePreset) {
      return { from: '', to: '' }
    }

    if (datePreset === 'custom') {
      return { from: dateFrom, to: dateTo }
    }

    const presetRange = getDateRange(datePreset)
    return {
      from: normalizeDateTimeLocalValue(dateFrom || presetRange.from, 'start'),
      to: normalizeDateTimeLocalValue(dateTo || presetRange.to, 'end'),
    }
  }, [dateFrom, datePreset, dateTo])
  const searchPending = normalizedSearch !== appliedSearch
  const asnNumberPending = normalizedAsnNumber !== appliedAsnNumber
  const statusPending = status !== appliedStatus
  const putawayModePending = putawayMode !== appliedPutawayMode
  const clientPending = clientId !== appliedClientId
  const dateRangePending =
    currentDatePreset !== appliedDatePreset ||
    draftDateFrom !== (appliedDatePreset ? appliedDateFrom : '') ||
    draftDateTo !== (appliedDatePreset ? appliedDateTo : '')
  const pendingChangeCount = [
    searchPending,
    asnNumberPending,
    statusPending,
    putawayModePending,
    clientPending,
    dateRangePending,
  ].filter(Boolean).length

  const pushFilters = (nextFilters: {
    search?: string
    asnNumber?: string
    status?: string
    putawayMode?: string
    clientId?: string
    datePreset?: DatePreset | ''
    dateFrom?: string
    dateTo?: string
  }) => {
    const params = new URLSearchParams()

    if (nextFilters.search) params.set('search', nextFilters.search)
    if (nextFilters.asnNumber) params.set('asnNumber', nextFilters.asnNumber)
    if (nextFilters.status) params.set('status', nextFilters.status)
    if (nextFilters.putawayMode) params.set('putawayMode', nextFilters.putawayMode)
    if (nextFilters.clientId) params.set('clientId', nextFilters.clientId)
    if (nextFilters.datePreset) {
      params.set('datePreset', nextFilters.datePreset)
      if (nextFilters.dateFrom) params.set('dateFrom', normalizeQueryDateTimeValue(nextFilters.dateFrom, 'start'))
      if (nextFilters.dateTo) params.set('dateTo', normalizeQueryDateTimeValue(nextFilters.dateTo, 'end'))
    }

    params.set('page', '1')
    router.push(`/putaway?${params.toString()}`)
  }

  const handleDatePresetChange = (preset: string) => {
    if (preset === 'all') {
      setDatePreset('')
      setDateFrom('')
      setDateTo('')
      return
    }

    setDatePreset(preset as DatePreset)
    if (preset === 'custom') {
      setDateFrom((current) => current || formatDateTimeLocalValue(startOfDay(new Date())))
      setDateTo((current) => current || formatDateTimeLocalValue(endOfDay(new Date())))
      return
    }

    if (preset !== 'custom') {
      const range = getDateRange(preset as DatePreset)
      setDateFrom(range.from)
      setDateTo(range.to)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFiltersExpanded(false)
    const submittedDateFrom = datePreset === 'custom' ? dateFrom : visibleDateRange.from
    const submittedDateTo = datePreset === 'custom' ? dateTo : visibleDateRange.to
    pushFilters({
      search: normalizedSearch,
      asnNumber: normalizedAsnNumber,
      status,
      putawayMode,
      clientId,
      datePreset,
      dateFrom: submittedDateFrom,
      dateTo: submittedDateTo,
    })
  }

  const resetFilters = () => {
    setSearch('')
    setAsnNumber('')
    setStatus('')
    setPutawayMode('')
    setClientId('')
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setFiltersExpanded(false)
    router.push('/putaway')
  }

  const clearLocalFilters = (keys: string[]) => {
    keys.forEach((key) => {
      switch (key) {
        case 'search':
          setSearch('')
          break
        case 'asnNumber':
          setAsnNumber('')
          break
        case 'status':
          setStatus('')
          break
        case 'putawayMode':
          setPutawayMode('')
          break
        case 'clientId':
          setClientId('')
          break
        case 'datePreset':
          setDatePreset('')
          break
        case 'dateFrom':
          setDateFrom('')
          break
        case 'dateTo':
          setDateTo('')
          break
        default:
          break
      }
    })
  }

  const clientLabel = clientId
    ? resolveReadableOptionLabel(
        clientId,
        clients,
        (client) => formatCodeNameLabel(client.clientCode, client.clientName),
        ''
      )
    : ''

  const chipItems = [
    search
      ? {
          key: 'search',
          label: t('filter.orderNumber'),
          value: normalizedSearch,
          pending: searchPending,
          onRemove: () => clearLocalFilters(['search']),
        }
      : null,
    asnNumber
      ? {
          key: 'asnNumber',
          label: t('filter.asnNumber'),
          value: normalizedAsnNumber,
          pending: asnNumberPending,
          onRemove: () => clearLocalFilters(['asnNumber']),
        }
      : null,
    status
      ? {
          key: 'status',
          label: t('filter.status'),
          value: t(`statuses.${status}`),
          pending: statusPending,
          onRemove: () => clearLocalFilters(['status']),
        }
      : null,
    clientId
      ? {
          key: 'clientId',
          label: t('filter.client'),
          value: clientLabel || loadingLabel,
          pending: clientPending,
          onRemove: () => clearLocalFilters(['clientId']),
        }
      : null,
    putawayMode
      ? {
          key: 'putawayMode',
          label: t('filter.putawayMode'),
          value: t(`orderDetail.modes.${putawayMode}`),
          pending: putawayModePending,
          onRemove: () => clearLocalFilters(['putawayMode']),
        }
      : null,
    datePreset
      ? {
          key: 'dateRange',
          label: t('filter.dateRange'),
          value:
            `${datePreset === 'custom' ? t('filter.datePresets.custom') : t(`filter.datePresets.${datePreset}`)} / ${visibleDateRange.from || '-'} ~ ${visibleDateRange.to || '-'}`,
          pending: dateRangePending,
          onRemove: () => clearLocalFilters(['datePreset', 'dateFrom', 'dateTo']),
        }
      : null,
  ]

  const activeChips: AppliedFilterChip[] = compactAppliedFilterChips(chipItems)

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filter.orderNumber')}</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('filter.orderNumberPlaceholder')}
                  className="h-8 pl-7 pr-8 text-sm"
                />
                {searchCount > 1 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
                    {searchCount}
                  </span>
                )}
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filter.asnNumber')}</span>
              <div className="relative">
                <Input
                  value={asnNumber}
                  onChange={(e) => setAsnNumber(e.target.value)}
                  placeholder={t('filter.asnNumberPlaceholder')}
                  className="h-8 pr-8 text-sm"
                />
                {asnNumberCount > 1 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
                    {asnNumberCount}
                  </span>
                )}
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filter.status')}</span>
              <EnumFilterSelect
                value={status}
                onValueChange={setStatus}
                allLabel={tCommon('all')}
                options={statuses.map((item) => ({
                  value: item,
                  label: t(`statuses.${item}`),
                }))}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filter.client')}</span>
              <ClientSelect
                value={clientId}
                onValueChange={setClientId}
                showAll
                className="h-8"
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filter.putawayMode')}</span>
              <EnumFilterSelect
                value={putawayMode}
                onValueChange={setPutawayMode}
                allLabel={tCommon('all')}
                options={putawayModes.map((mode) => ({
                  value: mode,
                  label: t(`orderDetail.modes.${mode}`),
                }))}
              />
            </div>
          </div>

          <div className={filterFieldClassName}>
            <span className="invisible text-xs">Actions</span>
            <CompactFilterActions
              pendingChangeCount={pendingChangeCount}
              searchLabel={tCommon('search')}
              resetLabel={tCommon('reset')}
              moreLabel={moreFiltersLabel}
              collapseLabel={collapseFiltersLabel}
              expanded={filtersExpanded}
              onReset={resetFilters}
              onToggleExpanded={() => setFiltersExpanded((prev) => !prev)}
            />
          </div>
        </div>

        {filtersExpanded && (
          <div className="grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2 xl:grid-cols-[220px_220px_220px_220px_minmax(0,1fr)] xl:items-end">
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filter.dateRange')}</span>
              <EnumFilterSelect
                value={datePreset}
                onValueChange={handleDatePresetChange}
                allLabel={tCommon('all')}
                options={[
                  { value: 'today', label: t('filter.datePresets.today') },
                  { value: 'last7days', label: t('filter.datePresets.last7days') },
                  { value: 'last30days', label: t('filter.datePresets.last30days') },
                  { value: 'thisMonth', label: t('filter.datePresets.thisMonth') },
                  { value: 'lastMonth', label: t('filter.datePresets.lastMonth') },
                  { value: 'custom', label: t('filter.datePresets.custom') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('startDateTime')}</span>
              <Input
                type="datetime-local"
                value={visibleDateRange.from}
                onChange={(e) => setDateFrom(normalizeBoundaryInputValue(e.target.value, 'start'))}
                className="h-8 text-sm"
                disabled={datePreset !== 'custom'}
                step={1}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('endDateTime')}</span>
              <Input
                type="datetime-local"
                value={visibleDateRange.to}
                onChange={(e) => setDateTo(normalizeBoundaryInputValue(e.target.value, 'end'))}
                className="h-8 text-sm"
                disabled={datePreset !== 'custom'}
                step={1}
              />
            </div>
          </div>
        )}

        <AppliedFilterChips
          chips={activeChips}
          emptyText={noActiveFiltersLabel}
          collapseLabel={tCommon('collapse')}
        />
      </form>
    </ListFilterCard>
  )
}
