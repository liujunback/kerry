'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { endOfMonth, format, startOfMonth, subDays, subMonths } from '@/lib/utils/date-formatter'
import { ClientSelect } from '@/components/clients/client-select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { AppliedFilterChips, CompactFilterActions, compactAppliedFilterChips, EnumFilterSelect, ListFilterCard } from '@/components/list-filters'
import type { AppliedFilterChip } from '@/components/list-filters'
import { formatCodeNameLabel, resolveReadableOptionLabel } from '@/lib/filters/readable-filter-value'

interface Client { id: string; clientCode: string; clientName: string }
interface OutboundOrderFilterProps { clients: Client[] }

const statuses = [
  'PENDING',
  'ALLOCATED',
  'OUT_OF_STOCK',
  'PENDING_PICK',
  'PICKING',
  'PICKED',
  'SORTING',
  'SORTED',
  'PACKING',
  'PACKED',
  'CHECKOUT_PENDING',
  'CHECKED_OUT',
  'CANCELLED',
  'ON_HOLD',
  'EXCEPTION',
] as const
const orderStructureTypes = ['SINGLE_ITEM_SINGLE', 'SINGLE_ITEM_MULTI', 'MULTI_ITEM'] as const
const orderBusinessTypes = ['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'] as const
const orderSources = ['MANUAL', 'API', 'IMPORT', 'PLATFORM'] as const
const interceptionStatuses = ['NOT_INTERCEPTED', 'PENDING_INTERCEPTION', 'INTERCEPTED'] as const
const interceptionSources = ['FOMS_CANCEL', 'MANUAL'] as const
const numberChangeStatuses = ['SUCCESS', 'FAILED', 'NONE'] as const
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'
const secondaryFilterGridClassName = 'grid grid-cols-1 gap-4 border-t pt-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end'
const BATCH_SPLIT_REGEX = /[\n,\uFF0C;\uFF1B\s]+/

type DateType = 'created' | 'audit' | 'shipped' | 'expectedShip'
type DatePreset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

const getDateRange = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date()
  const formatStr = 'yyyy-MM-dd'
  switch (preset) {
    case 'today': return { from: format(today, formatStr), to: format(today, formatStr) }
    case 'last7days': return { from: format(subDays(today, 6), formatStr), to: format(today, formatStr) }
    case 'last30days': return { from: format(subDays(today, 29), formatStr), to: format(today, formatStr) }
    case 'thisMonth': return { from: format(startOfMonth(today), formatStr), to: format(endOfMonth(today), formatStr) }
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1)
      return { from: format(startOfMonth(lastMonth), formatStr), to: format(endOfMonth(lastMonth), formatStr) }
    }
    default: return { from: '', to: '' }
  }
}

const parseBatchValues = (value: string) => value.split(BATCH_SPLIT_REGEX).map((item) => item.trim()).filter(Boolean)
const normalizeBatchInput = (value: string) => parseBatchValues(value).join(',')

export function OutboundOrderFilter({ clients }: OutboundOrderFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('outbound.order')
  const tCommon = useTranslations('common')
  const noActiveFiltersLabel = ('has' in t && typeof t.has === 'function' && t.has('noActiveFilters')) ? t('noActiveFilters') : 'No active filters'
  const loadingLabel = ('has' in tCommon && typeof tCommon.has === 'function' && tCommon.has('loading')) ? tCommon('loading') : 'Loading...'
  const moreFiltersLabel = ('has' in t && typeof t.has === 'function' && t.has('moreFilters')) ? t('moreFilters') : '更多筛选'
  const collapseFiltersLabel = ('has' in t && typeof t.has === 'function' && t.has('collapseFilters')) ? t('collapseFilters') : '收起筛选'

  const applied = {
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    orderStructureType: searchParams.get('orderStructureType') || '',
    orderBusinessType: searchParams.get('orderType') || '',
    numberChangeStatus: searchParams.get('numberChangeStatus') || '',
    dateType: (searchParams.get('dateType') as DateType) || 'created',
    datePreset: (searchParams.get('datePreset') as DatePreset) || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    orderSource: searchParams.get('orderSource') || '',
    platform: searchParams.get('platform') || '',
    clientId: searchParams.get('clientId') || '',
    skuCode: searchParams.get('skuCode') || '',
    barcode: searchParams.get('barcode') || '',
    isCombined: searchParams.get('isCombined') || '',
    interceptionStatus: searchParams.get('interceptionStatus') || '',
    interceptionSource: searchParams.get('interceptionSource') || '',
    totalSkuCountMin: searchParams.get('totalSkuCountMin') || '',
    totalSkuCountMax: searchParams.get('totalSkuCountMax') || '',
    totalOrderedQtyMin: searchParams.get('totalOrderedQtyMin') || '',
    totalOrderedQtyMax: searchParams.get('totalOrderedQtyMax') || '',
    hasNotes: searchParams.get('hasNotes') || '',
  }

  const [search, setSearch] = useState(applied.search)
  const [status, setStatus] = useState(applied.status)
  const [orderStructureType, setOrderStructureType] = useState(applied.orderStructureType)
  const [orderBusinessType, setOrderBusinessType] = useState(applied.orderBusinessType)
  const [numberChangeStatus, setNumberChangeStatus] = useState(applied.numberChangeStatus)
  const [dateType, setDateType] = useState<DateType>(applied.dateType)
  const [datePreset, setDatePreset] = useState<DatePreset | ''>(applied.datePreset)
  const [dateFrom, setDateFrom] = useState(applied.dateFrom)
  const [dateTo, setDateTo] = useState(applied.dateTo)
  const [orderSource, setOrderSource] = useState(applied.orderSource)
  const [platform, setPlatform] = useState(applied.platform)
  const [clientId, setClientId] = useState(applied.clientId)
  const [skuCode, setSkuCode] = useState(applied.skuCode)
  const [barcode, setBarcode] = useState(applied.barcode)
  const [isCombined, setIsCombined] = useState(applied.isCombined)
  const [interceptionStatus, setInterceptionStatus] = useState(applied.interceptionStatus)
  const [interceptionSource, setInterceptionSource] = useState(applied.interceptionSource)
  const [totalSkuCountMin, setTotalSkuCountMin] = useState(applied.totalSkuCountMin)
  const [totalSkuCountMax, setTotalSkuCountMax] = useState(applied.totalSkuCountMax)
  const [totalOrderedQtyMin, setTotalOrderedQtyMin] = useState(applied.totalOrderedQtyMin)
  const [totalOrderedQtyMax, setTotalOrderedQtyMax] = useState(applied.totalOrderedQtyMax)
  const [hasNotes, setHasNotes] = useState(applied.hasNotes)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const normalizedSearch = normalizeBatchInput(search)
  const normalizedAppliedSearch = normalizeBatchInput(applied.search)
  const searchCount = parseBatchValues(search).length

  const searchPending = normalizedSearch !== normalizedAppliedSearch
  const statusPending = status !== applied.status
  const orderStructureTypePending = orderStructureType !== applied.orderStructureType
  const orderBusinessTypePending = orderBusinessType !== applied.orderBusinessType
  const numberChangeStatusPending = numberChangeStatus !== applied.numberChangeStatus
  const dateRangePending = datePreset !== applied.datePreset || (datePreset ? dateType : 'created') !== (applied.datePreset ? applied.dateType : 'created') || (datePreset ? dateFrom : '') !== (applied.datePreset ? applied.dateFrom : '') || (datePreset ? dateTo : '') !== (applied.datePreset ? applied.dateTo : '')
  const orderSourcePending = orderSource !== applied.orderSource
  const platformPending = platform !== applied.platform
  const clientPending = clientId !== applied.clientId
  const skuCodePending = skuCode !== applied.skuCode
  const barcodePending = barcode !== applied.barcode
  const isCombinedPending = isCombined !== applied.isCombined
  const interceptionPending = interceptionStatus !== applied.interceptionStatus
  const interceptionSourcePending = interceptionSource !== applied.interceptionSource
  const skuRangePending = totalSkuCountMin !== applied.totalSkuCountMin || totalSkuCountMax !== applied.totalSkuCountMax
  const qtyRangePending = totalOrderedQtyMin !== applied.totalOrderedQtyMin || totalOrderedQtyMax !== applied.totalOrderedQtyMax
  const hasNotesPending = hasNotes !== applied.hasNotes
  const pendingChangeCount = [searchPending, statusPending, orderStructureTypePending, orderBusinessTypePending, numberChangeStatusPending, dateRangePending, orderSourcePending, platformPending, clientPending, skuCodePending, barcodePending, isCombinedPending, interceptionPending, interceptionSourcePending, skuRangePending, qtyRangePending, hasNotesPending].filter(Boolean).length

  const preserveParams = () => {
    const params = new URLSearchParams()
    const pageSize = searchParams.get('pageSize')
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder')
    if (pageSize) params.set('pageSize', pageSize)
    if (sortBy) params.set('sortBy', sortBy)
    if (sortOrder) params.set('sortOrder', sortOrder)
    return params
  }

  const clientLabel = clientId ? resolveReadableOptionLabel(clientId, clients, (client) => formatCodeNameLabel(client.clientCode, client.clientName), '') : ''
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

  const pushFilters = () => {
    const params = preserveParams()
    if (normalizedSearch) params.set('search', normalizedSearch)
    if (status) params.set('status', status)
    if (orderStructureType) params.set('orderStructureType', orderStructureType)
    if (orderBusinessType) params.set('orderType', orderBusinessType)
    if (numberChangeStatus) params.set('numberChangeStatus', numberChangeStatus)
    if (datePreset) {
      params.set('dateType', dateType)
      params.set('datePreset', datePreset)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    }
    if (orderSource) params.set('orderSource', orderSource)
    if (platform) params.set('platform', platform)
    if (clientId) params.set('clientId', clientId)
    if (skuCode) params.set('skuCode', skuCode)
    if (barcode) params.set('barcode', barcode)
    if (isCombined) params.set('isCombined', isCombined)
    if (interceptionStatus) params.set('interceptionStatus', interceptionStatus)
    if (interceptionSource) params.set('interceptionSource', interceptionSource)
    if (totalSkuCountMin) params.set('totalSkuCountMin', totalSkuCountMin)
    if (totalSkuCountMax) params.set('totalSkuCountMax', totalSkuCountMax)
    if (totalOrderedQtyMin) params.set('totalOrderedQtyMin', totalOrderedQtyMin)
    if (totalOrderedQtyMax) params.set('totalOrderedQtyMax', totalOrderedQtyMax)
    if (hasNotes) params.set('hasNotes', hasNotes)
    params.set('page', '1')
    router.push(`/orders?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFiltersExpanded(false)
    pushFilters()
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setOrderStructureType('')
    setOrderBusinessType('')
    setNumberChangeStatus('')
    setDateType('created')
    setDatePreset('')
    setDateFrom('')
    setDateTo('')
    setOrderSource('')
    setPlatform('')
    setClientId('')
    setSkuCode('')
    setBarcode('')
    setIsCombined('')
    setInterceptionStatus('')
    setInterceptionSource('')
    setTotalSkuCountMin('')
    setTotalSkuCountMax('')
    setTotalOrderedQtyMin('')
    setTotalOrderedQtyMax('')
    setHasNotes('')
    setFiltersExpanded(false)
    const params = preserveParams()
    router.push(params.toString() ? `/orders?${params.toString()}` : '/orders')
  }

  const clearLocalFilters = (keys: string[]) => {
    keys.forEach((key) => {
      switch (key) {
        case 'search': setSearch(''); break
        case 'status': setStatus(''); break
        case 'orderStructureType': setOrderStructureType(''); break
        case 'orderType': setOrderBusinessType(''); break
        case 'numberChangeStatus': setNumberChangeStatus(''); break
        case 'dateType': setDateType('created'); break
        case 'datePreset': setDatePreset(''); break
        case 'dateFrom': setDateFrom(''); break
        case 'dateTo': setDateTo(''); break
        case 'orderSource': setOrderSource(''); break
        case 'platform': setPlatform(''); break
        case 'clientId': setClientId(''); break
        case 'skuCode': setSkuCode(''); break
        case 'barcode': setBarcode(''); break
        case 'isCombined': setIsCombined(''); break
        case 'interceptionStatus': setInterceptionStatus(''); break
        case 'interceptionSource': setInterceptionSource(''); break
        case 'totalSkuCountMin': setTotalSkuCountMin(''); break
        case 'totalSkuCountMax': setTotalSkuCountMax(''); break
        case 'totalOrderedQtyMin': setTotalOrderedQtyMin(''); break
        case 'totalOrderedQtyMax': setTotalOrderedQtyMax(''); break
        case 'hasNotes': setHasNotes(''); break
        default: break
      }
    })
  }

  const chipItems = [
    normalizedSearch ? { key: 'search', label: t('orderNumber'), value: normalizedSearch, pending: searchPending, onRemove: () => clearLocalFilters(['search']) } : null,
    status ? { key: 'status', label: t('status'), value: t(`statuses.${status}`), pending: statusPending, onRemove: () => clearLocalFilters(['status']) } : null,
    orderStructureType ? { key: 'orderStructureType', label: t('orderType'), value: t(`orderStructureTypes.${orderStructureType}`), pending: orderStructureTypePending, onRemove: () => clearLocalFilters(['orderStructureType']) } : null,
    orderBusinessType ? { key: 'orderType', label: t('businessType'), value: t(`types.${orderBusinessType}`), pending: orderBusinessTypePending, onRemove: () => clearLocalFilters(['orderType']) } : null,
    numberChangeStatus ? { key: 'numberChangeStatus', label: t('filterByNumberChange'), value: t(`numberChangeStatuses.${numberChangeStatus}`), pending: numberChangeStatusPending, onRemove: () => clearLocalFilters(['numberChangeStatus']) } : null,
    datePreset ? { key: 'dateRange', label: t(`dateTypes.${dateType}`), value: datePreset === 'custom' ? `${dateFrom || '-'} ~ ${dateTo || '-'}` : t(`datePresets.${datePreset}`), pending: dateRangePending, onRemove: () => clearLocalFilters(['dateType', 'datePreset', 'dateFrom', 'dateTo']) } : null,
    orderSource ? { key: 'orderSource', label: t('orderSource'), value: t(`sources.${orderSource}`), pending: orderSourcePending, onRemove: () => clearLocalFilters(['orderSource']) } : null,
    platform ? { key: 'platform', label: t('channel'), value: platform, pending: platformPending, onRemove: () => clearLocalFilters(['platform']) } : null,
    clientId ? { key: 'clientId', label: t('client'), value: clientLabel || loadingLabel, pending: clientPending, onRemove: () => clearLocalFilters(['clientId']) } : null,
    skuCode ? { key: 'skuCode', label: t('filterBySkuCode'), value: skuCode, pending: skuCodePending, onRemove: () => clearLocalFilters(['skuCode']) } : null,
    barcode ? { key: 'barcode', label: t('filterByBarcode'), value: barcode, pending: barcodePending, onRemove: () => clearLocalFilters(['barcode']) } : null,
    isCombined ? { key: 'isCombined', label: t('isCombined'), value: isCombined === 'true' ? tCommon('yes') : tCommon('no'), pending: isCombinedPending, onRemove: () => clearLocalFilters(['isCombined']) } : null,
    interceptionStatus ? { key: 'interceptionStatus', label: t('filterByInterception'), value: t(`interceptionStatuses.${interceptionStatus}`), pending: interceptionPending, onRemove: () => clearLocalFilters(['interceptionStatus']) } : null,
    interceptionSource ? { key: 'interceptionSource', label: t('filterByInterception'), value: t(`interceptionSources.${interceptionSource}`), pending: interceptionSourcePending, onRemove: () => clearLocalFilters(['interceptionSource']) } : null,
    hasNotes ? { key: 'hasNotes', label: t('notes'), value: hasNotes === 'true' ? t('hasNotes.yes') : t('hasNotes.no'), pending: hasNotesPending, onRemove: () => clearLocalFilters(['hasNotes']) } : null,
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} className="h-8 pl-7 pr-8 text-sm" />
              {searchCount > 1 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">{searchCount}</span>}
            </div>
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('client')}</span>
            <ClientSelect value={clientId} onValueChange={setClientId} showAll />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('orderType')}</span>
            <EnumFilterSelect value={orderStructureType} onValueChange={setOrderStructureType} allLabel={tCommon('all')} options={orderStructureTypes.map((item) => ({ value: item, label: t(`orderStructureTypes.${item}`) }))} />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('status')}</span>
            <EnumFilterSelect value={status} onValueChange={setStatus} allLabel={tCommon('all')} options={statuses.map((item) => ({ value: item, label: t(`statuses.${item}`) }))} />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('filterByInterception')}</span>
            <EnumFilterSelect value={interceptionStatus} onValueChange={setInterceptionStatus} allLabel={tCommon('all')} options={interceptionStatuses.map((item) => ({ value: item, label: t(`interceptionStatuses.${item}`) }))} />
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
              <span className="text-xs text-muted-foreground">{t('filterBySkuCode')}</span>
              <Input value={skuCode} onChange={(e) => setSkuCode(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filterByBarcode')}</span>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('businessType')}</span>
              <EnumFilterSelect value={orderBusinessType} onValueChange={setOrderBusinessType} allLabel={tCommon('all')} options={orderBusinessTypes.map((item) => ({ value: item, label: t(`types.${item}`) }))} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('orderSource')}</span>
              <EnumFilterSelect value={orderSource} onValueChange={setOrderSource} allLabel={tCommon('all')} options={orderSources.map((item) => ({ value: item, label: t(`sources.${item}`) }))} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('isCombined')}</span>
              <EnumFilterSelect value={isCombined} onValueChange={setIsCombined} allLabel={tCommon('all')} options={[{ value: 'true', label: tCommon('yes') }, { value: 'false', label: tCommon('no') }]} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filterByInterception')}</span>
              <EnumFilterSelect value={interceptionSource} onValueChange={setInterceptionSource} allLabel={tCommon('all')} options={interceptionSources.map((item) => ({ value: item, label: t(`interceptionSources.${item}`) }))} />
            </div>
          </div>
          <div className="hidden xl:block" aria-hidden="true" />
          </div>
        )}

        {filtersExpanded && (
          <div className={filterRowShellClassName}>
          <div className={secondaryFilterGridClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('skuCountRange')}</span>
              <div className="flex items-center gap-2">
                <Input type="number" value={totalSkuCountMin} onChange={(e) => setTotalSkuCountMin(e.target.value)} className="h-8 min-w-0 flex-1 text-sm" placeholder="Min" />
                <span className="shrink-0 text-xs text-muted-foreground">-</span>
                <Input type="number" value={totalSkuCountMax} onChange={(e) => setTotalSkuCountMax(e.target.value)} className="h-8 min-w-0 flex-1 text-sm" placeholder="Max" />
              </div>
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('orderedQtyRange')}</span>
              <div className="flex items-center gap-2">
                <Input type="number" value={totalOrderedQtyMin} onChange={(e) => setTotalOrderedQtyMin(e.target.value)} className="h-8 min-w-0 flex-1 text-sm" placeholder="Min" />
                <span className="shrink-0 text-xs text-muted-foreground">-</span>
                <Input type="number" value={totalOrderedQtyMax} onChange={(e) => setTotalOrderedQtyMax(e.target.value)} className="h-8 min-w-0 flex-1 text-sm" placeholder="Max" />
              </div>
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filterByNumberChange')}</span>
              <EnumFilterSelect value={numberChangeStatus} onValueChange={setNumberChangeStatus} allLabel={tCommon('all')} options={numberChangeStatuses.map((item) => ({ value: item, label: t(`numberChangeStatuses.${item}`) }))} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('notes')}</span>
              <EnumFilterSelect value={hasNotes} onValueChange={setHasNotes} allLabel={tCommon('all')} options={[{ value: 'true', label: t('hasNotes.yes') }, { value: 'false', label: t('hasNotes.no') }]} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('channel')}</span>
              <Input value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="hidden xl:block" aria-hidden="true" />
          </div>
          <div className="hidden xl:block" aria-hidden="true" />
          </div>
        )}

        {filtersExpanded && (
          <div className={filterRowShellClassName}>
          <div className={secondaryFilterGridClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('dateTypes.label')}</span>
              <EnumFilterSelect value={dateType} onValueChange={(value) => setDateType(value as DateType)} showAllOption={false} allLabel={t('dateTypes.created')} options={[{ value: 'created', label: t('dateTypes.created') }, { value: 'audit', label: t('dateTypes.audit') }, { value: 'shipped', label: t('dateTypes.shipped') }, { value: 'expectedShip', label: t('dateTypes.expectedShip') }]} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('dateRange')}</span>
              <EnumFilterSelect value={datePreset} onValueChange={handleDatePresetChange} allLabel={tCommon('all')} options={[{ value: 'today', label: t('datePresets.today') }, { value: 'last7days', label: t('datePresets.last7days') }, { value: 'last30days', label: t('datePresets.last30days') }, { value: 'thisMonth', label: t('datePresets.thisMonth') }, { value: 'lastMonth', label: t('datePresets.lastMonth') }, { value: 'custom', label: t('datePresets.custom') }]} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('startDateTime')}</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-sm" disabled={datePreset !== 'custom'} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('endDateTime')}</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-sm" disabled={datePreset !== 'custom'} />
            </div>
            <div className="hidden xl:block" aria-hidden="true" />
            <div className="hidden xl:block" aria-hidden="true" />
          </div>
          <div className="hidden xl:block" aria-hidden="true" />
          </div>
        )}

        <AppliedFilterChips chips={activeChips} emptyText={noActiveFiltersLabel} collapseLabel={tCommon('collapse')} />
      </form>
    </ListFilterCard>
  )
}
