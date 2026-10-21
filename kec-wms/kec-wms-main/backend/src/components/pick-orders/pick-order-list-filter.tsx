'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { endOfMonth, format, startOfMonth, subDays, subMonths } from '@/lib/utils/date-formatter'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import {
  AppliedFilterChips,
  CompactFilterActions,
  compactAppliedFilterChips,
  EntitySelect,
  EnumFilterSelect,
  ListFilterCard,
} from '@/components/list-filters'
import type { AppliedFilterChip } from '@/components/list-filters'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'
import { resolveReadableOptionLabel } from '@/lib/filters/readable-filter-value'

interface UserOption {
  id: string
  fullName: string
  username: string
}

const statuses = ['PENDING', 'IN_PROGRESS', 'PICKED', 'SORTING', 'PACKING', 'COMPLETED', 'CANCELLED'] as const
const searchTypes = ['taskNumber', 'orderNumber', 'waveNumber', 'containerNumber'] as const
const orderBusinessTypes = ['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'] as const
const taskTypes = ['SINGLE_ONE_HOT', 'SINGLE_MULTI_HOT', 'SINGLE_ONE_NORMAL', 'SINGLE_MULTI_NORMAL', 'MULTI_FIXED_COMBO', 'MULTI_NON_FIXED'] as const
const pickModes = ['SKU_BATCH', 'MIXED_BATCH'] as const
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'
const fullWidthExpandedRowClassName = 'grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2 xl:grid-cols-8 xl:items-end'

type DateType = 'created' | 'completed'
type DatePreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

const BATCH_SPLIT_REGEX = /[\n,\uFF0C;\uFF1B\s]+/

const getDateRange = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date()
  const formatStr = 'yyyy-MM-dd'

  switch (preset) {
    case 'today':
      return { from: format(today, formatStr), to: format(today, formatStr) }
    case 'last7days':
      return { from: format(subDays(today, 6), formatStr), to: format(today, formatStr) }
    case 'last30days':
      return { from: format(subDays(today, 29), formatStr), to: format(today, formatStr) }
    case 'thisMonth':
      return { from: format(startOfMonth(today), formatStr), to: format(endOfMonth(today), formatStr) }
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1)
      return { from: format(startOfMonth(lastMonth), formatStr), to: format(endOfMonth(lastMonth), formatStr) }
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

export function PickOrderListFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pickOrder')
  const tOutbound = useTranslations('outbound.order')
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

  const { options: users } = useCachedOptions<UserOption>({
    cacheKey: 'users:active:list',
    fetcher: async () => {
      const response = await fetch('/api/v1/users?pageSize=100&status=ACTIVE')
      const result = await response.json()
      return result.success ? (result.data || []) : []
    },
  })
  const appliedSearchType = searchParams.get('searchType') || 'taskNumber'
  const appliedSearch = searchParams.get('search') || ''
  const appliedStatus = searchParams.get('status') || ''
  const appliedOrderBusinessType = searchParams.get('orderBusinessType') || ''
  const appliedDateType = (searchParams.get('dateType') as DateType) || 'created'
  const appliedDatePreset = (searchParams.get('datePreset') as DatePreset) || ''
  const appliedDateFrom = searchParams.get('dateFrom') || ''
  const appliedDateTo = searchParams.get('dateTo') || ''
  const appliedChannel = searchParams.get('channel') || ''
  const appliedIsCombined = searchParams.get('isCombined') || ''
  const appliedTaskType = searchParams.get('taskType') || ''
  const appliedPickMode = searchParams.get('pickMode') || ''
  const appliedAssignedUserId = searchParams.get('assignedUserId') || ''
  const preservedPageSize = searchParams.get('pageSize') || ''

  const [searchType, setSearchType] = useState(appliedSearchType)
  const [search, setSearch] = useState(appliedSearch)
  const [status, setStatus] = useState(appliedStatus)
  const [orderBusinessType, setOrderBusinessType] = useState(appliedOrderBusinessType)
  const [dateType, setDateType] = useState<DateType>(appliedDateType)
  const [datePreset, setDatePreset] = useState<DatePreset | ''>(appliedDatePreset)
  const [dateFrom, setDateFrom] = useState(appliedDateFrom)
  const [dateTo, setDateTo] = useState(appliedDateTo)
  const [channel, setChannel] = useState(appliedChannel)
  const [isCombined, setIsCombined] = useState(appliedIsCombined)
  const [taskType, setTaskType] = useState(appliedTaskType)
  const [pickMode, setPickMode] = useState(appliedPickMode)
  const [assignedUserId, setAssignedUserId] = useState(appliedAssignedUserId)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const searchCount = parseBatchValues(search).length
  const normalizedSearch = normalizeBatchInput(search)
  const draftDateType = datePreset ? dateType : 'created'
  const draftDateFrom = datePreset ? dateFrom : ''
  const draftDateTo = datePreset ? dateTo : ''
  const effectiveAppliedDateType = appliedDatePreset ? appliedDateType : 'created'
  const effectiveAppliedDateFrom = appliedDatePreset ? appliedDateFrom : ''
  const effectiveAppliedDateTo = appliedDatePreset ? appliedDateTo : ''

  const searchPending =
    normalizedSearch !== normalizeBatchInput(appliedSearch) ||
    (Boolean(normalizedSearch || appliedSearch) && searchType !== appliedSearchType)
  const statusPending = status !== appliedStatus
  const orderBusinessTypePending = orderBusinessType !== appliedOrderBusinessType
  const taskTypePending = taskType !== appliedTaskType
  const pickModePending = pickMode !== appliedPickMode
  const assignedUserPending = assignedUserId !== appliedAssignedUserId
  const channelPending = channel !== appliedChannel
  const isCombinedPending = isCombined !== appliedIsCombined
  const dateRangePending =
    datePreset !== appliedDatePreset ||
    draftDateType !== effectiveAppliedDateType ||
    draftDateFrom !== effectiveAppliedDateFrom ||
    draftDateTo !== effectiveAppliedDateTo

  const pendingChangeCount = [
    searchPending,
    statusPending,
    orderBusinessTypePending,
    taskTypePending,
    pickModePending,
    assignedUserPending,
    channelPending,
    isCombinedPending,
    dateRangePending,
  ].filter(Boolean).length

  const pushFilters = () => {
    const params = new URLSearchParams()

    if (normalizedSearch) params.set('search', normalizedSearch)
    if (normalizedSearch && searchType !== 'taskNumber') params.set('searchType', searchType)
    if (status) params.set('status', status)
    if (orderBusinessType) params.set('orderBusinessType', orderBusinessType)
    if (taskType) params.set('taskType', taskType)
    if (pickMode) params.set('pickMode', pickMode)
    if (assignedUserId) params.set('assignedUserId', assignedUserId)
    if (channel) params.set('channel', channel)
    if (isCombined) params.set('isCombined', isCombined)
    if (datePreset) {
      params.set('dateType', dateType)
      params.set('datePreset', datePreset)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    }
    if (preservedPageSize) params.set('pageSize', preservedPageSize)

    params.set('page', '1')
    router.push(`/pick-orders?${params.toString()}`)
  }

  const handleDatePresetChange = (preset: string) => {
    if (preset === 'all') {
      setDatePreset('')
      setDateFrom('')
      setDateTo('')
      return
    }

    setDatePreset(preset as DatePreset)
    if (preset !== 'custom') {
      const range = getDateRange(preset as DatePreset)
      setDateFrom(range.from)
      setDateTo(range.to)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFiltersExpanded(false)
    pushFilters()
  }

  const resetFilters = () => {
    setSearchType('taskNumber')
    setSearch('')
    setStatus('')
    setOrderBusinessType('')
    setDateType('created')
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setChannel('')
    setIsCombined('')
    setTaskType('')
    setPickMode('')
    setAssignedUserId('')
    setFiltersExpanded(false)

    const params = new URLSearchParams()
    if (preservedPageSize) params.set('pageSize', preservedPageSize)
    router.push(params.toString() ? `/pick-orders?${params.toString()}` : '/pick-orders')
  }

  const clearLocalFilters = (keys: string[]) => {
    keys.forEach((key) => {
      switch (key) {
        case 'search':
          setSearch('')
          setSearchType('taskNumber')
          break
        case 'status':
          setStatus('')
          break
        case 'orderBusinessType':
          setOrderBusinessType('')
          break
        case 'taskType':
          setTaskType('')
          break
        case 'pickMode':
          setPickMode('')
          break
        case 'assignedUserId':
          setAssignedUserId('')
          break
        case 'channel':
          setChannel('')
          break
        case 'isCombined':
          setIsCombined('')
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
        default:
          break
      }
    })
  }

  const assignedUserLabel = assignedUserId
    ? resolveReadableOptionLabel(
        assignedUserId,
        users,
        (user) => user.fullName || user.username,
        ''
      )
    : ''

  const chipItems = [
    normalizedSearch
      ? {
          key: 'search',
          label: t(`searchTypes.${searchType}`),
          value: normalizedSearch,
          pending: searchPending,
          onRemove: () => clearLocalFilters(['search']),
        }
      : null,
    status
      ? {
          key: 'status',
          label: t('status'),
          value: t(`statuses.${status}`),
          pending: statusPending,
          onRemove: () => clearLocalFilters(['status']),
        }
      : null,
    orderBusinessType
      ? {
          key: 'orderBusinessType',
          label: t('businessType'),
          value: tOutbound(`types.${orderBusinessType}`),
          pending: orderBusinessTypePending,
          onRemove: () => clearLocalFilters(['orderBusinessType']),
        }
      : null,
    taskType
      ? {
          key: 'taskType',
          label: t('taskType'),
          value: t(`taskTypes.${taskType}`),
          pending: taskTypePending,
          onRemove: () => clearLocalFilters(['taskType']),
        }
      : null,
    pickMode
      ? {
          key: 'pickMode',
          label: t('pickMode'),
          value: t(`pickModes.${pickMode}`),
          pending: pickModePending,
          onRemove: () => clearLocalFilters(['pickMode']),
        }
      : null,
    assignedUserId
      ? {
          key: 'assignedUserId',
          label: t('assignedUser'),
          value: assignedUserLabel || loadingLabel,
          pending: assignedUserPending,
          onRemove: () => clearLocalFilters(['assignedUserId']),
        }
      : null,
    channel
      ? {
          key: 'channel',
          label: t('channel'),
          value: channel,
          pending: channelPending,
          onRemove: () => clearLocalFilters(['channel']),
        }
      : null,
    isCombined
      ? {
          key: 'isCombined',
          label: t('isCombined'),
          value: isCombined === 'true' ? tCommon('yes') : tCommon('no'),
          pending: isCombinedPending,
          onRemove: () => clearLocalFilters(['isCombined']),
        }
      : null,
    datePreset
      ? {
          key: 'datePreset',
          label: t(`dateTypes.${dateType}`),
          value: datePreset === 'custom' ? `${dateFrom || '-'} ~ ${dateTo || '-'}` : tCommon(datePreset),
          pending: dateRangePending,
          onRemove: () => clearLocalFilters(['dateType', 'datePreset', 'dateFrom', 'dateTo']),
        }
      : null,
  ]

  const activeChips: AppliedFilterChip[] = compactAppliedFilterChips(chipItems)

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className={filterRowShellClassName}>
          <div className={primaryFilterGridClassName}>
          <div className={`${filterFieldClassName} xl:col-span-2`}>
            <span className="text-xs text-muted-foreground">{t(`searchTypes.${searchType}`)}</span>
            <div className="flex gap-2">
              <EnumFilterSelect
                value={searchType}
                onValueChange={setSearchType}
                showAllOption={false}
                allLabel={t(`searchTypes.${searchType}`)}
                className="w-[140px] shrink-0"
                options={searchTypes.map((type) => ({
                  value: type,
                  label: t(`searchTypes.${type}`),
                }))}
              />
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('taskType')}</span>
            <EnumFilterSelect
              value={taskType}
              onValueChange={setTaskType}
              allLabel={tCommon('all')}
              options={taskTypes.map((type) => ({
                value: type,
                label: t(`taskTypes.${type}`),
              }))}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('pickMode')}</span>
            <EnumFilterSelect
              value={pickMode}
              onValueChange={setPickMode}
              allLabel={tCommon('all')}
              options={pickModes.map((mode) => ({
                value: mode,
                label: t(`pickModes.${mode}`),
              }))}
            />
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
            <span className="text-xs text-muted-foreground">{t('isCombined')}</span>
            <EnumFilterSelect
              value={isCombined}
              onValueChange={setIsCombined}
              allLabel={tCommon('all')}
              options={[
                { value: 'true', label: tCommon('yes') },
                { value: 'false', label: tCommon('no') },
              ]}
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
              className="mt-4 xl:mt-0 xl:w-[180px] xl:shrink-0"
            />
          </div>
        </div>

        {filtersExpanded && (
          <div className={fullWidthExpandedRowClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('businessType')}</span>
              <EnumFilterSelect
                value={orderBusinessType}
                onValueChange={setOrderBusinessType}
                allLabel={tCommon('all')}
                options={orderBusinessTypes.map((type) => ({
                  value: type,
                  label: tOutbound(`types.${type}`),
                }))}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('assignedUser')}</span>
              <EntitySelect
                value={assignedUserId}
                onValueChange={setAssignedUserId}
                showAll
                placeholder={tCommon('all')}
                allLabel={tCommon('all')}
                searchPlaceholder={tCommon('search')}
                emptyText={tCommon('noResults')}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.fullName || user.username,
                  keywords: [user.fullName || '', user.username],
                }))}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('channel')}</span>
              <Input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('dateTypes.label')}</span>
              <EnumFilterSelect
                value={dateType}
                onValueChange={(value) => setDateType(value as DateType)}
                showAllOption={false}
                allLabel={t('dateTypes.created')}
                options={[
                  { value: 'created', label: t('dateTypes.created') },
                  { value: 'completed', label: t('dateTypes.completed') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('datePreset')}</span>
              <EnumFilterSelect
                value={datePreset}
                onValueChange={handleDatePresetChange}
                allLabel={tCommon('all')}
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
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-sm"
                disabled={datePreset !== 'custom'}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('endDateTime')}</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-sm"
                disabled={datePreset !== 'custom'}
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
