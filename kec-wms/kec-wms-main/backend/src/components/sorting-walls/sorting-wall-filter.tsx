'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EnumFilterSelect, FilterActionBar, ListFilterCard } from '@/components/list-filters'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

const filterKeys = ['search', 'warehouseId', 'sortStatus', 'isActive'] as const

export function SortingWallFilter() {
  const t = useTranslations('sortingWall')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'sorting-walls:list:filters',
    pathname: '/sorting-walls',
    filterKeys,
  })

  return (
    <SortingWallFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialWarehouseId={currentFilters.warehouseId}
      initialSortStatus={currentFilters.sortStatus}
      initialIsActive={currentFilters.isActive}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface SortingWallFilterFormProps {
  initialSearch: string
  initialWarehouseId: string
  initialSortStatus: string
  initialIsActive: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function SortingWallFilterForm({
  initialSearch,
  initialWarehouseId,
  initialSortStatus,
  initialIsActive,
  clearStoredFilters,
  t,
  tCommon,
}: SortingWallFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId)
  const [sortStatus, setSortStatus] = useState(initialSortStatus)
  const [isActive, setIsActive] = useState(initialIsActive)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (warehouseId) params.set('warehouseId', warehouseId)
    if (sortStatus) params.set('sortStatus', sortStatus)
    if (isActive) params.set('isActive', isActive)
    params.set('page', '1')
    router.push(`/sorting-walls?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setWarehouseId('')
    setSortStatus('')
    setIsActive('')
    clearStoredFilters()
    router.push('/sorting-walls')
  }

  return (
    <ListFilterCard mode="compact">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
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
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByWarehouse')}</Label>
          <WarehouseSelect
            value={warehouseId}
            onValueChange={setWarehouseId}
            showAll
            className="h-8 w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('sortStatus')}</Label>
          <EnumFilterSelect
            value={sortStatus}
            onValueChange={setSortStatus}
            allLabel={tCommon('all')}
            options={[
              { value: 'IDLE', label: t('sortStatuses.IDLE') },
              { value: 'SORTING', label: t('sortStatuses.SORTING') },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('isActive')}</Label>
          <EnumFilterSelect
            value={isActive}
            onValueChange={setIsActive}
            allLabel={tCommon('all')}
            options={[
              { value: 'true', label: t('activeStatuses.true') },
              { value: 'false', label: t('activeStatuses.false') },
            ]}
          />
        </div>

        <FilterActionBar className="xl:w-full xl:justify-start">
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
