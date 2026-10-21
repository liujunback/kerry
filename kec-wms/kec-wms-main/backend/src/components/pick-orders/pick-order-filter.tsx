'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths } from '@/lib/utils/date-formatter'
import { ClientSelect } from '@/components/clients/client-select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import {
  AppliedFilterChips,
  CompactFilterActions,
  compactAppliedFilterChips,
  EnumFilterSelect,
  ListFilterCard,
} from '@/components/list-filters'
import type { AppliedFilterChip } from '@/components/list-filters'
import { formatCodeNameLabel, resolveReadableOptionLabel } from '@/lib/filters/readable-filter-value'

interface Client {
  id: string
  clientCode: string
  clientName: string
}

interface PickOrderFilterProps {
  clients: Client[]
  basePath?: string
}

const orderBusinessTypes = ['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'] as const
const orderStructureTypes = ['SINGLE_ITEM_SINGLE', 'SINGLE_ITEM_MULTI', 'MULTI_ITEM'] as const
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'
const secondaryFilterGridClassName = 'grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end'

type DatePreset = 'last30days' | 'last7days' | 'today' | 'thisMonth' | 'lastMonth' | 'custom'

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

function parseBatchValues(value: string) {
  return value
    .split(BATCH_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeBatchInput(value: string) {
  return parseBatchValues(value).join(',')
}

export function PickOrderFilter({ clients, basePath = '/pick-orders/create' }: PickOrderFilterProps) {
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

  const appliedOrderNumber = searchParams.get('orderNumber') || ''
  const appliedClientId = searchParams.get('clientId') || ''
  const appliedOrderBusinessType = searchParams.get('orderBusinessType') || ''
  const appliedOrderType = searchParams.get('orderType') || 'SINGLE_ITEM_SINGLE'
  const appliedIsCombined = searchParams.get('isCombined') || ''
  const appliedCreatedDatePreset = (searchParams.get('createdDatePreset') as DatePreset) || 'last30days'
  const appliedCreatedDateFrom = searchParams.get('createdDateFrom') || ''
  const appliedCreatedDateTo = searchParams.get('createdDateTo') || ''
  const appliedExpectedOutboundPreset = (searchParams.get('expectedOutboundPreset') as DatePreset) || ''
  const appliedPlatform = searchParams.get('platform') || ''
  const appliedHasSerialItems = searchParams.get('hasSerialItems') || ''
  const appliedBrand = searchParams.get('brand') || ''
  const appliedTotalSkuCountMin = searchParams.get('totalSkuCountMin') || ''
  const appliedTotalSkuCountMax = searchParams.get('totalSkuCountMax') || ''
  const appliedTotalOrderedQtyMin = searchParams.get('totalOrderedQtyMin') || ''
  const appliedTotalOrderedQtyMax = searchParams.get('totalOrderedQtyMax') || ''
  const appliedTotalWeightKgMin = searchParams.get('totalWeightKgMin') || ''
  const appliedTotalWeightKgMax = searchParams.get('totalWeightKgMax') || ''
  const appliedHasNotes = searchParams.get('hasNotes') || ''
  const preservedPageSize = searchParams.get('pageSize') || ''

  const [orderNumber, setOrderNumber] = useState(appliedOrderNumber)
  const [clientId, setClientId] = useState(appliedClientId)
  const [orderBusinessType, setOrderBusinessType] = useState(appliedOrderBusinessType)
  const [orderType, setOrderType] = useState(appliedOrderType)
  const [isCombined, setIsCombined] = useState(appliedIsCombined)
  const [createdDatePreset, setCreatedDatePreset] = useState<DatePreset | ''>(appliedCreatedDatePreset)
  const [createdDateFrom, setCreatedDateFrom] = useState(normalizeDateTimeLocalValue(appliedCreatedDateFrom, 'start'))
  const [createdDateTo, setCreatedDateTo] = useState(normalizeDateTimeLocalValue(appliedCreatedDateTo, 'end'))
  const [expectedOutboundPreset, setExpectedOutboundPreset] = useState<DatePreset | ''>(appliedExpectedOutboundPreset)
  const [platform, setPlatform] = useState(appliedPlatform)
  const [hasSerialItems, setHasSerialItems] = useState(appliedHasSerialItems)
  const [brand, setBrand] = useState(appliedBrand)
  const [totalSkuCountMin, setTotalSkuCountMin] = useState(appliedTotalSkuCountMin)
  const [totalSkuCountMax, setTotalSkuCountMax] = useState(appliedTotalSkuCountMax)
  const [totalOrderedQtyMin, setTotalOrderedQtyMin] = useState(appliedTotalOrderedQtyMin)
  const [totalOrderedQtyMax, setTotalOrderedQtyMax] = useState(appliedTotalOrderedQtyMax)
  const [totalWeightKgMin, setTotalWeightKgMin] = useState(appliedTotalWeightKgMin)
  const [totalWeightKgMax, setTotalWeightKgMax] = useState(appliedTotalWeightKgMax)
  const [hasNotes, setHasNotes] = useState(appliedHasNotes)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const searchCount = parseBatchValues(orderNumber).length
  const normalizedOrderNumber = normalizeBatchInput(orderNumber)

  const orderNumberPending = normalizedOrderNumber !== normalizeBatchInput(appliedOrderNumber)
  const clientPending = clientId !== appliedClientId
  const businessTypePending = orderBusinessType !== appliedOrderBusinessType
  const orderTypePending = orderType !== appliedOrderType
  const isCombinedPending = isCombined !== appliedIsCombined
  const createdDatePending =
    createdDatePreset !== appliedCreatedDatePreset ||
    (createdDatePreset ? createdDateFrom : '') !== (appliedCreatedDatePreset ? appliedCreatedDateFrom : '') ||
    (createdDatePreset ? createdDateTo : '') !== (appliedCreatedDatePreset ? appliedCreatedDateTo : '')
  const expectedOutboundPending = expectedOutboundPreset !== appliedExpectedOutboundPreset
  const platformPending = platform !== appliedPlatform
  const hasSerialItemsPending = hasSerialItems !== appliedHasSerialItems
  const brandPending = brand !== appliedBrand
  const skuRangePending =
    totalSkuCountMin !== appliedTotalSkuCountMin || totalSkuCountMax !== appliedTotalSkuCountMax
  const qtyRangePending =
    totalOrderedQtyMin !== appliedTotalOrderedQtyMin || totalOrderedQtyMax !== appliedTotalOrderedQtyMax
  const weightRangePending =
    totalWeightKgMin !== appliedTotalWeightKgMin || totalWeightKgMax !== appliedTotalWeightKgMax
  const hasNotesPending = hasNotes !== appliedHasNotes
  const pendingChangeCount = [
    orderNumberPending,
    clientPending,
    businessTypePending,
    orderTypePending,
    isCombinedPending,
    createdDatePending,
    expectedOutboundPending,
    platformPending,
    hasSerialItemsPending,
    brandPending,
    skuRangePending,
    qtyRangePending,
    weightRangePending,
    hasNotesPending,
  ].filter(Boolean).length

  const pushFilters = () => {
    const params = new URLSearchParams()

    if (normalizedOrderNumber) params.set('orderNumber', normalizedOrderNumber)
    if (clientId) params.set('clientId', clientId)
    if (orderBusinessType) params.set('orderBusinessType', orderBusinessType)
    if (orderType) params.set('orderType', orderType)
    if (isCombined) params.set('isCombined', isCombined)

    if (createdDatePreset) {
      params.set('createdDatePreset', createdDatePreset)
      if (createdDateFrom) params.set('createdDateFrom', normalizeQueryDateTimeValue(createdDateFrom, 'start'))
      if (createdDateTo) params.set('createdDateTo', normalizeQueryDateTimeValue(createdDateTo, 'end'))
    }
    if (expectedOutboundPreset) {
      params.set('expectedOutboundPreset', expectedOutboundPreset)
    }

    if (platform) params.set('platform', platform)
    if (hasSerialItems) params.set('hasSerialItems', hasSerialItems)
    if (brand) params.set('brand', brand)
    if (totalSkuCountMin) params.set('totalSkuCountMin', totalSkuCountMin)
    if (totalSkuCountMax) params.set('totalSkuCountMax', totalSkuCountMax)
    if (totalOrderedQtyMin) params.set('totalOrderedQtyMin', totalOrderedQtyMin)
    if (totalOrderedQtyMax) params.set('totalOrderedQtyMax', totalOrderedQtyMax)
    if (totalWeightKgMin) params.set('totalWeightKgMin', totalWeightKgMin)
    if (totalWeightKgMax) params.set('totalWeightKgMax', totalWeightKgMax)
    if (hasNotes) params.set('hasNotes', hasNotes)
    if (preservedPageSize) params.set('pageSize', preservedPageSize)

    params.set('page', '1')
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleDatePresetChange = (preset: string) => {
    if (preset === 'all') {
      setCreatedDatePreset('')
      setCreatedDateFrom('')
      setCreatedDateTo('')
      return
    }

    setCreatedDatePreset(preset as DatePreset)
    if (preset === 'custom') {
      setCreatedDateFrom((current) => current || formatDateTimeLocalValue(startOfDay(new Date())))
      setCreatedDateTo((current) => current || formatDateTimeLocalValue(endOfDay(new Date())))
      return
    }

    if (preset !== 'custom') {
      const range = getDateRange(preset as DatePreset)
      setCreatedDateFrom(range.from)
      setCreatedDateTo(range.to)
    }
  }

  const handleExpectedOutboundPresetChange = (preset: string) => {
    if (preset === 'all') {
      setExpectedOutboundPreset('')
      return
    }
    setExpectedOutboundPreset(preset as DatePreset)
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFiltersExpanded(false)
    pushFilters()
  }

  const resetFilters = () => {
    setOrderNumber('')
    setClientId('')
    setOrderBusinessType('')
    setOrderType('SINGLE_ITEM_SINGLE')
    setIsCombined('')
    setCreatedDatePreset('last30days')
    setCreatedDateFrom('')
    setCreatedDateTo('')
    setExpectedOutboundPreset('')
    setPlatform('')
    setHasSerialItems('')
    setBrand('')
    setTotalSkuCountMin('')
    setTotalSkuCountMax('')
    setTotalOrderedQtyMin('')
    setTotalOrderedQtyMax('')
    setTotalWeightKgMin('')
    setTotalWeightKgMax('')
    setHasNotes('')
    setFiltersExpanded(false)

    const params = new URLSearchParams()
    if (preservedPageSize) params.set('pageSize', preservedPageSize)
    router.push(`${basePath}?${params.toString()}`)
  }

  const clearLocalFilters = (keys: string[]) => {
    keys.forEach((key) => {
      switch (key) {
        case 'orderNumber':
          setOrderNumber('')
          break
        case 'clientId':
          setClientId('')
          break
        case 'orderBusinessType':
          setOrderBusinessType('')
          break
        case 'orderType':
          setOrderType('SINGLE_ITEM_SINGLE')
          break
        case 'isCombined':
          setIsCombined('')
          break
        case 'createdDatePreset':
          setCreatedDatePreset('')
          break
        case 'createdDateFrom':
          setCreatedDateFrom('')
          break
        case 'createdDateTo':
          setCreatedDateTo('')
          break
        case 'expectedOutboundPreset':
          setExpectedOutboundPreset('')
          break
        case 'platform':
          setPlatform('')
          break
        case 'hasSerialItems':
          setHasSerialItems('')
          break
        case 'brand':
          setBrand('')
          break
        case 'totalSkuCountMin':
          setTotalSkuCountMin('')
          break
        case 'totalSkuCountMax':
          setTotalSkuCountMax('')
          break
        case 'totalOrderedQtyMin':
          setTotalOrderedQtyMin('')
          break
        case 'totalOrderedQtyMax':
          setTotalOrderedQtyMax('')
          break
        case 'totalWeightKgMin':
          setTotalWeightKgMin('')
          break
        case 'totalWeightKgMax':
          setTotalWeightKgMax('')
          break
        case 'hasNotes':
          setHasNotes('')
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
    normalizedOrderNumber
      ? {
          key: 'orderNumber',
          label: t('orderNumber'),
          value: normalizedOrderNumber,
          pending: orderNumberPending,
          onRemove: () => clearLocalFilters(['orderNumber']),
        }
      : null,
    clientId
      ? {
          key: 'clientId',
          label: t('client'),
          value: clientLabel || loadingLabel,
          pending: clientPending,
          onRemove: () => clearLocalFilters(['clientId']),
        }
      : null,
    orderBusinessType
      ? {
          key: 'orderBusinessType',
          label: t('businessType'),
          value: tOutbound(`types.${orderBusinessType}`),
          pending: businessTypePending,
          onRemove: () => clearLocalFilters(['orderBusinessType']),
        }
      : null,
    orderType
      ? {
          key: 'orderType',
          label: t('orderType'),
          value: tOutbound(`orderStructureTypes.${orderType}`),
          pending: orderTypePending,
          onRemove: () => clearLocalFilters(['orderType']),
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
    createdDatePreset
      ? {
          key: 'createdDate',
          label: t('createdDate'),
          value:
            createdDatePreset === 'custom'
              ? `${createdDateFrom || '-'} ~ ${createdDateTo || '-'}`
              : tCommon(createdDatePreset),
          pending: createdDatePending,
          onRemove: () => clearLocalFilters(['createdDatePreset', 'createdDateFrom', 'createdDateTo']),
        }
      : null,
    expectedOutboundPreset
      ? {
          key: 'expectedOutbound',
          label: t('expectedOutbound'),
          value: tCommon(expectedOutboundPreset),
          pending: expectedOutboundPending,
          onRemove: () => clearLocalFilters(['expectedOutboundPreset']),
        }
      : null,
    platform
      ? {
          key: 'platform',
          label: t('platform'),
          value: platform,
          pending: platformPending,
          onRemove: () => clearLocalFilters(['platform']),
        }
      : null,
    hasSerialItems
      ? {
          key: 'hasSerialItems',
          label: t('hasSerialItems'),
          value: hasSerialItems === 'true' ? tCommon('yes') : tCommon('no'),
          pending: hasSerialItemsPending,
          onRemove: () => clearLocalFilters(['hasSerialItems']),
        }
      : null,
    brand
      ? {
          key: 'brand',
          label: t('brand'),
          value: brand,
          pending: brandPending,
          onRemove: () => clearLocalFilters(['brand']),
        }
      : null,
    hasNotes
      ? {
          key: 'hasNotes',
          label: t('hasNotes'),
          value: hasNotes === 'true' ? tCommon('yes') : tCommon('no'),
          pending: hasNotesPending,
          onRemove: () => clearLocalFilters(['hasNotes']),
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
            <span className="text-xs text-muted-foreground">{t('orderNumber')}</span>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
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
            <span className="text-xs text-muted-foreground">{t('client')}</span>
            <ClientSelect value={clientId} onValueChange={setClientId} showAll />
          </div>

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
            <span className="text-xs text-muted-foreground">{t('orderType')}</span>
            <EnumFilterSelect
              value={orderType}
              onValueChange={setOrderType}
              allLabel={tCommon('all')}
              options={orderStructureTypes.map((type) => ({
                value: type,
                label: tOutbound(`orderStructureTypes.${type}`),
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
              className="mt-4 xl:mt-0 xl:w-[180px] xl:shrink-0"
            />
          </div>
        </div>

        {filtersExpanded && (
          <div className={filterRowShellClassName}>
            <div className={secondaryFilterGridClassName}>
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

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('hasSerialItems')}</span>
              <EnumFilterSelect
                value={hasSerialItems}
                onValueChange={setHasSerialItems}
                allLabel={tCommon('all')}
                options={[
                  { value: 'true', label: tCommon('yes') },
                  { value: 'false', label: tCommon('no') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('expectedOutbound')}</span>
              <EnumFilterSelect
                value={expectedOutboundPreset}
                onValueChange={handleExpectedOutboundPresetChange}
                allLabel={tCommon('all')}
                options={[
                  { value: 'today', label: tCommon('today') },
                  { value: 'last7days', label: tCommon('last7days') },
                  { value: 'thisMonth', label: tCommon('thisMonth') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('hasNotes')}</span>
              <EnumFilterSelect
                value={hasNotes}
                onValueChange={setHasNotes}
                allLabel={tCommon('all')}
                options={[
                  { value: 'true', label: tCommon('yes') },
                  { value: 'false', label: tCommon('no') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('brand')}</span>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-8 text-sm" />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('platform')}</span>
              <Input value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-8 text-sm" />
            </div>

            </div>
            <div className="hidden xl:block" aria-hidden="true" />
          </div>
        )}

        {filtersExpanded && (
          <div className={filterRowShellClassName}>
            <div className={secondaryFilterGridClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('skuCount')}</span>
              <div className="flex gap-2">
                <Input type="number" value={totalSkuCountMin} onChange={(e) => setTotalSkuCountMin(e.target.value)} className="h-8 text-sm" placeholder={tCommon('min')} />
                <Input type="number" value={totalSkuCountMax} onChange={(e) => setTotalSkuCountMax(e.target.value)} className="h-8 text-sm" placeholder={tCommon('max')} />
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('itemCount')}</span>
              <div className="flex gap-2">
                <Input type="number" value={totalOrderedQtyMin} onChange={(e) => setTotalOrderedQtyMin(e.target.value)} className="h-8 text-sm" placeholder={tCommon('min')} />
                <Input type="number" value={totalOrderedQtyMax} onChange={(e) => setTotalOrderedQtyMax(e.target.value)} className="h-8 text-sm" placeholder={tCommon('max')} />
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('weight')}</span>
              <div className="flex gap-2">
                <Input type="number" value={totalWeightKgMin} onChange={(e) => setTotalWeightKgMin(e.target.value)} className="h-8 text-sm" placeholder={tCommon('min')} />
                <Input type="number" value={totalWeightKgMax} onChange={(e) => setTotalWeightKgMax(e.target.value)} className="h-8 text-sm" placeholder={tCommon('max')} />
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('createdDate')}</span>
              <EnumFilterSelect
                value={createdDatePreset}
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
                type="datetime-local"
                value={createdDateFrom}
                onChange={(e) => setCreatedDateFrom(normalizeBoundaryInputValue(e.target.value, 'start'))}
                className="h-8 text-sm"
                disabled={createdDatePreset !== 'custom'}
                step={1}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('endDateTime')}</span>
              <Input
                type="datetime-local"
                value={createdDateTo}
                onChange={(e) => setCreatedDateTo(normalizeBoundaryInputValue(e.target.value, 'end'))}
                className="h-8 text-sm"
                disabled={createdDatePreset !== 'custom'}
                step={1}
              />
            </div>
            </div>
            <div className="hidden xl:block" aria-hidden="true" />
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
