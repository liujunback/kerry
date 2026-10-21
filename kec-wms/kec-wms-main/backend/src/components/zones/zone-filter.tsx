'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EnumFilterSelect, FilterActionBar, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

const zoneTypes = ['RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING'] as const
const statuses = ['ACTIVE', 'INACTIVE'] as const
const filterKeys = ['search', 'zoneType', 'status'] as const

export function ZoneFilter() {
  const t = useTranslations('zone')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'zones:list:filters',
    pathname: '/zones',
    filterKeys,
  })

  return (
    <ZoneFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialZoneType={currentFilters.zoneType}
      initialStatus={currentFilters.status}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface ZoneFilterFormProps {
  initialSearch: string
  initialZoneType: string
  initialStatus: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function ZoneFilterForm({
  initialSearch,
  initialZoneType,
  initialStatus,
  clearStoredFilters,
  t,
  tCommon,
}: ZoneFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [zoneType, setZoneType] = useState(initialZoneType)
  const [status, setStatus] = useState(initialStatus)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (zoneType) params.set('zoneType', zoneType)
    if (status) params.set('status', status)
    params.set('page', '1')
    router.push(`/zones?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setZoneType('')
    setStatus('')
    clearStoredFilters()
    router.push('/zones')
  }

  return (
    <ListFilterCard mode="compact">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_auto] xl:items-end">
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
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByType')}</Label>
          <EnumFilterSelect
            value={zoneType}
            onValueChange={setZoneType}
            allLabel={t('allTypes')}
            options={zoneTypes.map((item) => ({ value: item, label: t(`zoneTypes.${item}`) }))}
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

        <FilterActionBar>
          <Button className="flex-1 xl:flex-none" size="sm" onClick={handleSearch}>
            <Search className="mr-1 h-4 w-4" />
            {tCommon('search')}
          </Button>
          <Button className="flex-1 xl:flex-none" variant="outline" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-4 w-4" />
            {t('resetFilters')}
          </Button>
        </FilterActionBar>
      </div>
    </ListFilterCard>
  )
}
