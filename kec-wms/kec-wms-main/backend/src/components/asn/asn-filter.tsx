'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths } from '@/lib/utils/date-formatter'
import { Input } from '@/components/ui/input'
import { AppliedFilterChips } from '@/components/list-filters/applied-filter-chips'
import {
  CompactFilterActions,
  EnumFilterSelect,
  ListFilterCard,
} from '@/components/list-filters'
import { Search } from 'lucide-react'
import { ClientSelect } from '@/components/clients/client-select'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'
import { formatCodeNameLabel, resolveReadableOptionLabel } from '@/lib/filters/readable-filter-value'

const statuses = [
  'CREATED',
  'PENDING_RECEIVING',
  'RECEIVING',
  'RECEIVED',
  'PUTAWAY',
  'COMPLETED',
  'CANCELLED',
  'CLOSED',
] as const

const asnTypes = ['NORMAL', 'RETURN', 'TRANSFER', 'PRODUCTION', 'ADJUSTMENT'] as const
const receivingMethods = ['SKU', 'CONTAINER', 'DIRECT_PUTAWAY'] as const

type DateType = 'created' | 'arrival' | 'receivingEnd'
type DatePreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'
type AsnFilterKey =
  | 'search'
  | 'status'
  | 'asnType'
  | 'dateType'
  | 'datePreset'
  | 'dateFrom'
  | 'dateTo'
  | 'receivingMethod'
  | 'clientId'
  | 'skuCode'

interface ClientOption {
  id: string
  clientCode: string
  clientName: string
}

const filterKeys = [
  'search',
  'status',
  'asnType',
  'dateType',
  'datePreset',
  'dateFrom',
  'dateTo',
  'receivingMethod',
  'clientId',
  'skuCode',
] as const satisfies readonly AsnFilterKey[]

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

function normalizeSelectableValue(value: string) {
  return value === 'all' ? '' : value
}

const BATCH_INPUT_SPLIT_REGEX = /[\s,\uFF0C;\uFF1B]+/

function parseBatchValues(value: string) {
  return value
    .split(BATCH_INPUT_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeBatchInput(value: string) {
  return parseBatchValues(value).join(',')
}

const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'
const secondaryFilterGridClassName = 'grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end'

export function AsnFilter() {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters<AsnFilterKey>({
    storageKey: 'asn:list:filters',
    pathname: '/asn',
    filterKeys,
  })

  return (
    <AsnFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialStatus={currentFilters.status}
      initialAsnType={currentFilters.asnType}
      initialDateType={(currentFilters.dateType as DateType) || 'created'}
      initialDatePreset={(currentFilters.datePreset as DatePreset) || ''}
      initialDateFrom={currentFilters.dateFrom}
      initialDateTo={currentFilters.dateTo}
      initialReceivingMethod={currentFilters.receivingMethod}
      initialClientId={normalizeSelectableValue(currentFilters.clientId)}
      initialSkuCode={currentFilters.skuCode}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface AsnFilterFormProps {
  initialSearch: string
  initialStatus: string
  initialAsnType: string
  initialDateType: DateType
  initialDatePreset: DatePreset | ''
  initialDateFrom: string
  initialDateTo: string
  initialReceivingMethod: string
  initialClientId: string
  initialSkuCode: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function AsnFilterForm({
  initialSearch,
  initialStatus,
  initialAsnType,
  initialDateType,
  initialDatePreset,
  initialDateFrom,
  initialDateTo,
  initialReceivingMethod,
  initialClientId,
  initialSkuCode,
  clearStoredFilters,
  t,
  tCommon,
}: AsnFilterFormProps) {
  const router = useRouter()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [asnType, setAsnType] = useState(initialAsnType)
  const [dateType, setDateType] = useState<DateType>(initialDateType)
  const [datePreset, setDatePreset] = useState<DatePreset | ''>(initialDatePreset)
  const [dateFrom, setDateFrom] = useState(normalizeDateTimeLocalValue(initialDateFrom, 'start'))
  const [dateTo, setDateTo] = useState(normalizeDateTimeLocalValue(initialDateTo, 'end'))
  const [receivingMethod, setReceivingMethod] = useState(initialReceivingMethod)
  const [clientId, setClientId] = useState(initialClientId)
  const [skuCode, setSkuCode] = useState(initialSkuCode)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])

  const searchCount = parseBatchValues(search).length
  const skuSearchCount = parseBatchValues(skuCode).length
  const appliedSearch = normalizeBatchInput(initialSearch)
  const appliedSkuCode = normalizeBatchInput(initialSkuCode)
  const normalizedSearch = normalizeBatchInput(search)
  const normalizedSkuCode = normalizeBatchInput(skuCode)
  const appliedDatePreset = initialDatePreset || ''
  const draftDateType = datePreset ? dateType : 'created'
  const draftDateFrom = datePreset ? dateFrom : ''
  const draftDateTo = datePreset ? dateTo : ''
  const appliedDateType = appliedDatePreset ? initialDateType : 'created'
  const appliedDateFrom = appliedDatePreset ? initialDateFrom : ''
  const appliedDateTo = appliedDatePreset ? initialDateTo : ''
  const searchPending = normalizedSearch !== appliedSearch
  const skuCodePending = normalizedSkuCode !== appliedSkuCode
  const statusPending = status !== initialStatus
  const asnTypePending = asnType !== initialAsnType
  const receivingMethodPending = receivingMethod !== initialReceivingMethod
  const clientPending = clientId !== initialClientId
  const dateRangePending =
    datePreset !== appliedDatePreset ||
    draftDateType !== appliedDateType ||
    draftDateFrom !== appliedDateFrom ||
    draftDateTo !== appliedDateTo
  const pendingChangeCount = [
    searchPending,
    skuCodePending,
    statusPending,
    asnTypePending,
    receivingMethodPending,
    clientPending,
    dateRangePending,
  ].filter(Boolean).length

  useEffect(() => {
    let cancelled = false

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/v1/clients?pageSize=100&isActive=true')
        const result = await response.json()

        if (!cancelled && result.success) {
          setClientOptions(result.data || [])
        }
      } catch {
        if (!cancelled) {
          setClientOptions([])
        }
      }
    }

    fetchClients()

    return () => {
      cancelled = true
    }
  }, [])


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

  const hasActiveFilters = Boolean(
    normalizedSearch ||
      status ||
      asnType ||
      datePreset ||
      receivingMethod ||
      clientId ||
      normalizedSkuCode
  )

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!hasActiveFilters) {
      clearStoredFilters()
    }

    const params = new URLSearchParams()
    if (normalizedSearch) params.set('search', normalizedSearch)
    if (status) params.set('status', status)
    if (clientId) params.set('clientId', clientId)

    if (normalizedSkuCode) params.set('skuCode', normalizedSkuCode)
    if (asnType) params.set('asnType', asnType)
    if (receivingMethod) params.set('receivingMethod', receivingMethod)

    if (datePreset) {
      params.set('dateType', dateType)
      params.set('datePreset', datePreset)
      if (dateFrom) params.set('dateFrom', normalizeQueryDateTimeValue(dateFrom, 'start'))
      if (dateTo) params.set('dateTo', normalizeQueryDateTimeValue(dateTo, 'end'))
    }

    params.set('page', '1')

    setFiltersExpanded(false)
    router.push(`/asn?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setAsnType('')
    setDateType('created')
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setReceivingMethod('')
    setClientId('')
    setSkuCode('')
    clearStoredFilters()
    setFiltersExpanded(false)
    router.push('/asn')
  }

  const dateTypeLabel = dateType === 'arrival'
    ? t('actualArrivalAt')
    : dateType === 'receivingEnd'
      ? t('receivingEndAt')
      : t('createdAt')

  const clientLabel = clientId
    ? resolveReadableOptionLabel(
        clientId,
        clientOptions,
        (client) => formatCodeNameLabel(client.clientCode, client.clientName),
        clientOptions.length > 0 ? clientId : ''
      )
    : ''

  // Chips represent the local draft filters. Highlighted chips have unapplied changes.
  const activeChips = [
    search
      ? {
          key: 'search' as const,
          label: t('asnNumber'),
          value: search,
          removeKeys: ['search'],
          pending: searchPending,
        }
      : null,
    skuCode
      ? {
          key: 'skuCode' as const,
          label: t('skuCode'),
          value: skuCode,
          removeKeys: ['skuCode'],
          pending: skuCodePending,
        }
      : null,
    status
      ? {
          key: 'status' as const,
          label: t('status'),
          value: t(`statuses.${status}`),
          removeKeys: ['status'],
          pending: statusPending,
        }
      : null,
    asnType
      ? {
          key: 'asnType' as const,
          label: t('asnType'),
          value: t(`asnTypes.${asnType}`),
          removeKeys: ['asnType'],
          pending: asnTypePending,
        }
      : null,
    receivingMethod
      ? {
          key: 'receivingMethod' as const,
          label: t('receivingMethod'),
          value: t(`receivingMethods.${receivingMethod}`),
          removeKeys: ['receivingMethod'],
          pending: receivingMethodPending,
        }
      : null,
    clientId
      ? clientLabel
        ? {
            key: 'clientId' as const,
            label: t('client'),
            value: clientLabel,
            removeKeys: ['clientId'],
            pending: clientPending,
          }
        : null
      : null,
    datePreset
      ? {
          key: 'dateRange' as const,
          label: t('dateRange.label'),
          value:
            datePreset === 'custom'
              ? `${dateFrom || '-'} ~ ${dateTo || '-'}`
              : `${dateTypeLabel} / ${t(`dateRange.${datePreset}`)}`,
          removeKeys: ['dateType', 'datePreset', 'dateFrom', 'dateTo'],
          pending: dateRangePending,
        }
      : null,
  ].filter(
    (
      chip
    ): chip is {
      key:
        | 'search'
        | 'skuCode'
        | 'status'
        | 'asnType'
        | 'receivingMethod'
        | 'clientId'
        | 'dateRange'
      label: string
      value: string
      removeKeys: string[]
      pending: boolean
    } => Boolean(chip)
  )

  const clearLocalFilters = (keys: string[]) => {
    keys.forEach((key) => {
      switch (key) {
        case 'search':
          setSearch('')
          break
        case 'skuCode':
          setSkuCode('')
          break
        case 'status':
          setStatus('')
          break
        case 'asnType':
          setAsnType('')
          break
        case 'dateType':
          setDateType('created')
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
        case 'receivingMethod':
          setReceivingMethod('')
          break
        case 'clientId':
          setClientId('')
          break
        default:
          break
      }
    })
  }

  const removeFilter = (keys: string[]) => {
    clearLocalFilters(keys)
  }

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className={filterRowShellClassName}>
          <div className={primaryFilterGridClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('asnNumber')}</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
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
              <span className="text-xs text-muted-foreground">{t('skuCode')}</span>
              <div className="relative">
                <Input
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder={t('skuCodePlaceholder')}
                  className="h-8 flex-1 pr-8 text-sm"
                />
                {skuSearchCount > 1 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
                    {skuSearchCount}
                  </span>
                )}
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('status')}</span>
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
              <span className="text-xs text-muted-foreground">{t('receivingMethod')}</span>
              <EnumFilterSelect
                value={receivingMethod}
                onValueChange={setReceivingMethod}
                allLabel={tCommon('all')}
                options={receivingMethods.map((item) => ({
                  value: item,
                  label: t(`receivingMethods.${item}`),
                }))}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('client')}</span>
              <ClientSelect
                value={clientId}
                onValueChange={(value) => setClientId(normalizeSelectableValue(value))}
                showAll
                className="h-8"
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('asnType')}</span>
              <EnumFilterSelect
                value={asnType}
                onValueChange={setAsnType}
                allLabel={tCommon('all')}
                options={asnTypes.map((item) => ({
                  value: item,
                  label: t(`asnTypes.${item}`),
                }))}
              />
            </div>
          </div>

          <CompactFilterActions
            pendingChangeCount={pendingChangeCount}
            searchLabel={tCommon('search')}
            resetLabel={tCommon('reset')}
            moreLabel={t('moreFilters')}
            collapseLabel={t('collapseFilters')}
            expanded={filtersExpanded}
            onReset={resetFilters}
            onToggleExpanded={() => setFiltersExpanded((prev) => !prev)}
            className="mt-4 xl:mt-0 xl:w-[180px] xl:shrink-0"
          />
        </div>

        {filtersExpanded && (
          <div className={filterRowShellClassName}>
            <div className={secondaryFilterGridClassName}>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('dateType')}</span>
                <EnumFilterSelect
                  value={dateType}
                  onValueChange={(value) => setDateType(value as DateType)}
                  allLabel={t('createdAt')}
                  showAllOption={false}
                  options={[
                    { value: 'created', label: t('createdAt') },
                    { value: 'arrival', label: t('actualArrivalAt') },
                    { value: 'receivingEnd', label: t('receivingEndAt') },
                  ]}
                />
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('dateRange.label')}</span>
                <EnumFilterSelect
                  value={datePreset}
                  onValueChange={handleDatePresetChange}
                  allLabel={tCommon('all')}
                  options={[
                    { value: 'today', label: tCommon('today') },
                    { value: 'last7days', label: t('dateRange.last7days') },
                    { value: 'last30days', label: t('dateRange.last30days') },
                    { value: 'thisMonth', label: t('dateRange.thisMonth') },
                    { value: 'lastMonth', label: t('dateRange.lastMonth') },
                    { value: 'custom', label: t('dateRange.custom') },
                  ]}
                />
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{tCommon('startDateTime')}</span>
                <Input
                  type="datetime-local"
                  value={dateFrom}
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
                  value={dateTo}
                  onChange={(e) => setDateTo(normalizeBoundaryInputValue(e.target.value, 'end'))}
                  className="h-8 text-sm"
                  disabled={datePreset !== 'custom'}
                  step={1}
                />
              </div>
            </div>
            <div className="hidden xl:block" aria-hidden="true" />
          </div>
        )}

        <AppliedFilterChips
          chips={activeChips.map((chip) => ({
            key: chip.key,
            label: chip.label,
            value: chip.value,
            pending: chip.pending,
            onRemove: () => removeFilter(chip.removeKeys),
          }))}
          emptyText={t('noActiveFilters')}
          collapseLabel={tCommon('collapse')}
        />
      </form>
    </ListFilterCard>
  )
}
