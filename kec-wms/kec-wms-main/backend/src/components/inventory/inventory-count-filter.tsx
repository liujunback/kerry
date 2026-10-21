'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AppliedFilterChips } from '@/components/list-filters/applied-filter-chips'
import {
  CompactFilterActions,
  EnumFilterSelect,
  ListFilterCard,
} from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

type InventoryCountFilterKey =
  | 'search'
  | 'orderType'
  | 'status'
  | 'plannedStart'
  | 'plannedEnd'

const filterKeys = [
  'search',
  'orderType',
  'status',
  'plannedStart',
  'plannedEnd',
] as const satisfies readonly InventoryCountFilterKey[]

const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'

function toLocalDateTimeInput(iso?: string | null) {
  if (!iso) {
    return ''
  }

  const date = new Date(iso)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : ''
}

export function InventoryCountFilter() {
  const router = useRouter()
  const t = useTranslations('common')
  const tCount = useTranslations('inventory.count')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters<InventoryCountFilterKey>({
    storageKey: 'inventory-count:list:filters',
    pathname: '/inventory/counts',
    filterKeys,
  })

  return (
    <InventoryCountFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialOrderType={currentFilters.orderType}
      initialStatus={currentFilters.status}
      initialPlannedStart={currentFilters.plannedStart}
      initialPlannedEnd={currentFilters.plannedEnd}
      clearStoredFilters={clearStoredFilters}
      routerPush={router.push}
      t={t}
      tCount={tCount}
    />
  )
}

interface InventoryCountFilterFormProps {
  initialSearch: string
  initialOrderType: string
  initialStatus: string
  initialPlannedStart: string
  initialPlannedEnd: string
  clearStoredFilters: () => void
  routerPush: (href: string) => void
  t: ReturnType<typeof useTranslations>
  tCount: ReturnType<typeof useTranslations>
}

function InventoryCountFilterForm({
  initialSearch,
  initialOrderType,
  initialStatus,
  initialPlannedStart,
  initialPlannedEnd,
  clearStoredFilters,
  routerPush,
  t,
  tCount,
}: InventoryCountFilterFormProps) {
  const [search, setSearch] = useState(initialSearch)
  const [orderType, setOrderType] = useState(initialOrderType)
  const [status, setStatus] = useState(initialStatus)
  const [plannedStart, setPlannedStart] = useState(toLocalDateTimeInput(initialPlannedStart))
  const [plannedEnd, setPlannedEnd] = useState(toLocalDateTimeInput(initialPlannedEnd))

  const plannedStartIso = plannedStart ? toIsoDateTime(plannedStart) : ''
  const plannedEndIso = plannedEnd ? toIsoDateTime(plannedEnd) : ''

  const pendingChangeCount = [
    search !== initialSearch,
    orderType !== initialOrderType,
    status !== initialStatus,
    plannedStartIso !== initialPlannedStart,
    plannedEndIso !== initialPlannedEnd,
  ].filter(Boolean).length

  const hasActiveFilters = Boolean(search || orderType || status || plannedStartIso || plannedEndIso)

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasActiveFilters) {
      clearStoredFilters()
    }

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (orderType) params.set('orderType', orderType)
    if (status) params.set('status', status)
    if (plannedStartIso) params.set('plannedStart', plannedStartIso)
    if (plannedEndIso) params.set('plannedEnd', plannedEndIso)
    params.set('page', '1')

    routerPush(`/inventory/counts?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setOrderType('')
    setStatus('')
    setPlannedStart('')
    setPlannedEnd('')
    clearStoredFilters()
    routerPush('/inventory/counts')
  }

  const activeChips = [
    search
      ? {
          key: 'search',
          label: t('search'),
          value: search,
          onRemove: () => setSearch(''),
          pending: search !== initialSearch,
        }
      : null,
    orderType
      ? {
          key: 'orderType',
          label: tCount('orderType'),
          value: tCount(`types.${orderType}`),
          onRemove: () => setOrderType(''),
          pending: orderType !== initialOrderType,
        }
      : null,
    status
      ? {
          key: 'status',
          label: t('status'),
          value: tCount(`statuses.${status}`),
          onRemove: () => setStatus(''),
          pending: status !== initialStatus,
        }
      : null,
    plannedStartIso
      ? {
          key: 'plannedStart',
          label: t('startDateTime'),
          value: plannedStart,
          onRemove: () => setPlannedStart(''),
          pending: plannedStartIso !== initialPlannedStart,
        }
      : null,
    plannedEndIso
      ? {
          key: 'plannedEnd',
          label: t('endDateTime'),
          value: plannedEnd,
          onRemove: () => setPlannedEnd(''),
          pending: plannedEndIso !== initialPlannedEnd,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    label: string
    value: string
    onRemove: () => void
    pending: boolean
  }>

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className={filterRowShellClassName}>
          <div className={primaryFilterGridClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('search')}</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tCount('searchPlaceholder')}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCount('orderType')}</span>
              <EnumFilterSelect
                value={orderType}
                onValueChange={setOrderType}
                allLabel={tCount('allTypes')}
                options={[
                  { value: 'FULL', label: tCount('types.FULL') },
                  { value: 'LOCATION', label: tCount('types.LOCATION') },
                  { value: 'SKU', label: tCount('types.SKU') },
                  { value: 'CYCLE', label: tCount('types.CYCLE') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('status')}</span>
              <EnumFilterSelect
                value={status}
                onValueChange={setStatus}
                allLabel={tCount('allStatuses')}
                options={[
                  { value: 'DRAFT', label: tCount('statuses.DRAFT') },
                  { value: 'PENDING_SCOPE', label: tCount('statuses.PENDING_SCOPE') },
                  { value: 'GENERATING_SCOPE', label: tCount('statuses.GENERATING_SCOPE') },
                  { value: 'SCOPE_FAILED', label: tCount('statuses.SCOPE_FAILED') },
                  { value: 'READY', label: tCount('statuses.READY') },
                  { value: 'IN_PROGRESS', label: tCount('statuses.IN_PROGRESS') },
                  { value: 'PENDING_ADJUST', label: tCount('statuses.PENDING_ADJUST') },
                  { value: 'COMPLETED', label: tCount('statuses.COMPLETED') },
                  { value: 'CANCELLED', label: tCount('statuses.CANCELLED') },
                ]}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('startDateTime')}</span>
              <Input
                type="datetime-local"
                value={plannedStart}
                onChange={(event) => setPlannedStart(event.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('endDateTime')}</span>
              <Input
                type="datetime-local"
                value={plannedEnd}
                onChange={(event) => setPlannedEnd(event.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <CompactFilterActions
            pendingChangeCount={pendingChangeCount}
            searchLabel={t('search')}
            resetLabel={t('reset')}
            moreLabel=""
            collapseLabel=""
            expanded={false}
            onReset={resetFilters}
            onToggleExpanded={() => {}}
            showToggle={false}
            className="mt-4 xl:mt-0 xl:w-[180px] xl:shrink-0"
          />
        </div>

        <AppliedFilterChips
          chips={activeChips}
          emptyText={tCount('noActiveFilters')}
          collapseLabel={t('collapse')}
        />
      </form>
    </ListFilterCard>
  )
}
