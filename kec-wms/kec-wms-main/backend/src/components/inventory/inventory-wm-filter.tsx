'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { ClientSelect } from '@/components/clients/client-select'
import { Input } from '@/components/ui/input'
import { CompactFilterActions, EntitySelect, EnumFilterSelect, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

interface ZoneOption {
  id: string
  zoneCode: string
  zoneName: string | null
  warehouseId: string
}

type InventoryWmFilterKey =
  | 'skuCode'
  | 'clientId'
  | 'zoneId'
  | 'locationCodes'
  | 'lockStatus'
  | 'asnNumber'

const filterKeys = [
  'skuCode',
  'clientId',
  'zoneId',
  'locationCodes',
  'lockStatus',
  'asnNumber',
] as const satisfies readonly InventoryWmFilterKey[]

const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const lockStatuses = ['UNLOCKED', 'LOCKED'] as const

export function InventoryWmFilter() {
  const tCommon = useTranslations('common')
  const tInv = useTranslations('inventory.detail')
  const tLock = useTranslations('inventory.lockStatuses')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters<InventoryWmFilterKey>({
    storageKey: 'inventory-wm:list:filters',
    pathname: '/inventory/wm',
    filterKeys,
  })

  const [zones, setZones] = useState<ZoneOption[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/v1/zones?pageSize=1000&status=ACTIVE')
        const result = await response.json()

        if (!isMounted) return

        if (result.success) {
          setZones(result.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch inventory filter options:', error)
      }
    }

    fetchOptions()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <InventoryWmFilterForm
      key={formKey}
      initialSkuCode={currentFilters.skuCode || ''}
      initialClientId={currentFilters.clientId || ''}
      initialZoneId={currentFilters.zoneId || ''}
      initialLocationCodes={currentFilters.locationCodes || ''}
      initialLockStatus={currentFilters.lockStatus || ''}
      initialAsnNumber={currentFilters.asnNumber || ''}
      zones={zones}
      clearStoredFilters={clearStoredFilters}
      tCommon={tCommon}
      tInv={tInv}
      tLock={tLock}
    />
  )
}

interface InventoryWmFilterFormProps {
  initialSkuCode: string
  initialClientId: string
  initialZoneId: string
  initialLocationCodes: string
  initialLockStatus: string
  initialAsnNumber: string
  zones: ZoneOption[]
  clearStoredFilters: () => void
  tCommon: ReturnType<typeof useTranslations>
  tInv: ReturnType<typeof useTranslations>
  tLock: ReturnType<typeof useTranslations>
}

function InventoryWmFilterForm({
  initialSkuCode,
  initialClientId,
  initialZoneId,
  initialLocationCodes,
  initialLockStatus,
  initialAsnNumber,
  zones,
  clearStoredFilters,
  tCommon,
  tInv,
  tLock,
}: InventoryWmFilterFormProps) {
  const router = useRouter()
  const [skuCode, setSkuCode] = useState(initialSkuCode)
  const [clientId, setClientId] = useState(initialClientId)
  const [zoneId, setZoneId] = useState(initialZoneId)
  const [locationCodes, setLocationCodes] = useState(initialLocationCodes)
  const [lockStatus, setLockStatus] = useState(initialLockStatus)
  const [asnNumber, setAsnNumber] = useState(initialAsnNumber)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const moreFiltersLabel =
    ('has' in tInv && typeof tInv.has === 'function' && tInv.has('moreFilters'))
      ? tInv('moreFilters')
      : '更多筛选'
  const collapseFiltersLabel =
    ('has' in tInv && typeof tInv.has === 'function' && tInv.has('collapseFilters'))
      ? tInv('collapseFilters')
      : '收起筛选'

  const filteredZones = useMemo(() => zones, [zones])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams()

    if (skuCode.trim()) params.set('skuCode', skuCode.trim())
    if (clientId) params.set('clientId', clientId)
    if (zoneId) params.set('zoneId', zoneId)
    if (locationCodes.trim()) params.set('locationCodes', locationCodes.trim())
    if (lockStatus) params.set('lockStatus', lockStatus)
    if (asnNumber.trim()) params.set('asnNumber', asnNumber.trim())

    params.set('page', '1')
    router.push(`/inventory/wm?${params.toString()}`)
  }

  const handleReset = () => {
    setSkuCode('')
    setClientId('')
    setZoneId('')
    setLocationCodes('')
    setLockStatus('')
    setAsnNumber('')
    clearStoredFilters()
    router.push('/inventory/wm')
  }

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('search')}</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={skuCode}
                  onChange={(event) => setSkuCode(event.target.value)}
                  placeholder={tInv('searchPlaceholder')}
                  className="h-8 pl-9"
                />
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tInv('asnNumber')}</span>
              <Input
                value={asnNumber}
                onChange={(event) => setAsnNumber(event.target.value)}
                placeholder={tInv('asnNumberPlaceholder')}
                className="h-8"
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('client')}</span>
              <ClientSelect
                value={clientId}
                onValueChange={setClientId}
                showAll
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tInv('zone')}</span>
              <EntitySelect
                value={zoneId}
                onValueChange={setZoneId}
                showAll
                placeholder={tInv('allZones')}
                allLabel={tInv('allZones')}
                searchPlaceholder={tCommon('search')}
                emptyText={tCommon('noResults')}
                options={filteredZones.map((zone) => ({
                  value: zone.id,
                  label: zone.zoneName || zone.zoneCode,
                  keywords: [zone.zoneCode, zone.zoneName || ''],
                }))}
              />
            </div>

            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tInv('location')}</span>
              <Input
                value={locationCodes}
                onChange={(event) => setLocationCodes(event.target.value)}
                placeholder={tInv('locationCodesPlaceholder')}
                className="h-8"
              />
            </div>
          </div>

          <CompactFilterActions
            pendingChangeCount={0}
            searchLabel={tCommon('search')}
            resetLabel={tCommon('reset')}
            moreLabel={moreFiltersLabel}
            collapseLabel={collapseFiltersLabel}
            expanded={filtersExpanded}
            onReset={handleReset}
            onToggleExpanded={() => setFiltersExpanded((prev) => !prev)}
            showToggle
            className="mt-2 xl:mt-0 xl:w-[180px] xl:shrink-0 xl:justify-start"
          />
        </div>

        {filtersExpanded && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t pt-3 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{tInv('lockStatus')}</span>
                <EnumFilterSelect
                  value={lockStatus}
                  onValueChange={setLockStatus}
                  allLabel={tInv('allLockStatus')}
                  options={lockStatuses.map((item) => ({
                    value: item,
                    label: tLock(item),
                  }))}
                />
              </div>
            </div>
            <div className="hidden xl:block" />
          </div>
        )}
      </form>
    </ListFilterCard>
  )
}
