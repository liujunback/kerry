'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EntitySelect, EnumFilterSelect, FilterActionBar, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

interface Zone {
  id: string
  zoneCode: string
  zoneName: string | null
  warehouseId: string
}

interface BinLocationFilterProps {
  zones: Zone[]
}

const locationTypes = ['RACK', 'SHELF', 'FLOOR', 'STAGING', 'DOCK'] as const
const statuses = ['ACTIVE', 'INACTIVE'] as const
const lockStatuses = ['UNLOCKED', 'LOCKED'] as const
const filterKeys = ['search', 'zoneId', 'locationType', 'status', 'lockStatus'] as const

export function BinLocationFilter({ zones }: BinLocationFilterProps) {
  const t = useTranslations('binLocation')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'bin-locations:list:filters',
    pathname: '/bin-locations',
    filterKeys,
  })

  return (
    <BinLocationFilterForm
      key={formKey}
      zones={zones}
      initialSearch={currentFilters.search}
      initialZoneId={currentFilters.zoneId}
      initialLocationType={currentFilters.locationType}
      initialStatus={currentFilters.status}
      initialLockStatus={currentFilters.lockStatus}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface BinLocationFilterFormProps {
  zones: Zone[]
  initialSearch: string
  initialZoneId: string
  initialLocationType: string
  initialStatus: string
  initialLockStatus: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function BinLocationFilterForm({
  zones,
  initialSearch,
  initialZoneId,
  initialLocationType,
  initialStatus,
  initialLockStatus,
  clearStoredFilters,
  t,
  tCommon,
}: BinLocationFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [zoneId, setZoneId] = useState(initialZoneId)
  const [locationType, setLocationType] = useState(initialLocationType)
  const [status, setStatus] = useState(initialStatus)
  const [lockStatus, setLockStatus] = useState(initialLockStatus)

  const filteredZones = zones

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (zoneId) params.set('zoneId', zoneId)
    if (locationType) params.set('locationType', locationType)
    if (status) params.set('status', status)
    if (lockStatus) params.set('lockStatus', lockStatus)
    params.set('page', '1')
    router.push(`/bin-locations?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setZoneId('')
    setLocationType('')
    setStatus('')
    setLockStatus('')
    clearStoredFilters()
    router.push('/bin-locations')
  }

  return (
    <ListFilterCard mode="compact">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_220px_180px_180px_180px_auto] xl:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('search')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByZone')}</Label>
          <EntitySelect
            value={zoneId}
            onValueChange={setZoneId}
            showAll
            placeholder={t('allZones')}
            allLabel={t('allZones')}
            searchPlaceholder={tCommon('search')}
            emptyText={tCommon('noResults')}
            options={filteredZones.map((zone) => ({
              value: zone.id,
              label: zone.zoneName || zone.zoneCode,
              keywords: [zone.zoneCode, zone.zoneName || ''],
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByType')}</Label>
          <EnumFilterSelect
            value={locationType}
            onValueChange={setLocationType}
            allLabel={t('allTypes')}
            options={locationTypes.map((item) => ({ value: item, label: t(`locationTypes.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByStatus')}</Label>
          <EnumFilterSelect
            value={status}
            onValueChange={setStatus}
            allLabel={t('allStatus')}
            options={statuses.map((item) => ({ value: item, label: t(`statuses.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByLockStatus')}</Label>
          <EnumFilterSelect
            value={lockStatus}
            onValueChange={setLockStatus}
            allLabel={t('allLockStatus')}
            options={lockStatuses.map((item) => ({ value: item, label: t(`lockStatuses.${item}`) }))}
          />
        </div>

        <FilterActionBar>
          <Button className="flex-1 xl:flex-none" size="sm" onClick={handleSearch}>
            <Search className="mr-1 h-4 w-4" />
            {tCommon('search')}
          </Button>
          <Button className="flex-1 xl:flex-none" variant="outline" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-4 w-4" />
            {tCommon('reset')}
          </Button>
        </FilterActionBar>
      </div>
    </ListFilterCard>
  )
}
