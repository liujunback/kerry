'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EnumFilterSelect, FilterActionBar, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

const containerTypes = ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'] as const
const usages = ['INBOUND', 'RETURN_INBOUND', 'OUTBOUND'] as const
const enabledStatuses = ['ENABLED', 'DISABLED'] as const
const workStatuses = ['IDLE', 'OCCUPIED', 'CLOSED'] as const
const filterKeys = ['search', 'containerType', 'usage', 'enabledStatus', 'workStatus'] as const

export function ContainerFilter() {
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'containers:list:filters',
    pathname: '/containers',
    filterKeys,
  })

  return (
    <ContainerFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialContainerType={currentFilters.containerType}
      initialUsage={currentFilters.usage}
      initialEnabledStatus={currentFilters.enabledStatus}
      initialWorkStatus={currentFilters.workStatus}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface ContainerFilterFormProps {
  initialSearch: string
  initialContainerType: string
  initialUsage: string
  initialEnabledStatus: string
  initialWorkStatus: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function ContainerFilterForm({
  initialSearch,
  initialContainerType,
  initialUsage,
  initialEnabledStatus,
  initialWorkStatus,
  clearStoredFilters,
  t,
  tCommon,
}: ContainerFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [containerType, setContainerType] = useState(initialContainerType)
  const [usage, setUsage] = useState(initialUsage)
  const [enabledStatus, setEnabledStatus] = useState(initialEnabledStatus)
  const [workStatus, setWorkStatus] = useState(initialWorkStatus)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (containerType) params.set('containerType', containerType)
    if (usage) params.set('usage', usage)
    if (enabledStatus) params.set('enabledStatus', enabledStatus)
    if (workStatus) params.set('workStatus', workStatus)
    params.set('page', '1')
    router.push(`/containers?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setContainerType('')
    setUsage('')
    setEnabledStatus('')
    setWorkStatus('')
    clearStoredFilters()
    router.push('/containers')
  }

  return (
    <ListFilterCard mode="compact">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_180px_180px_auto] xl:items-end">
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
            value={containerType}
            onValueChange={setContainerType}
            allLabel={t('allTypes')}
            options={containerTypes.map((item) => ({ value: item, label: t(`containerTypes.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByUsage')}</Label>
          <EnumFilterSelect
            value={usage}
            onValueChange={setUsage}
            allLabel={t('allUsages')}
            options={usages.map((item) => ({ value: item, label: t(`usages.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByEnabledStatus')}</Label>
          <EnumFilterSelect
            value={enabledStatus}
            onValueChange={setEnabledStatus}
            allLabel={t('allEnabledStatus')}
            options={enabledStatuses.map((item) => ({ value: item, label: t(`enabledStatuses.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByWorkStatus')}</Label>
          <EnumFilterSelect
            value={workStatus}
            onValueChange={setWorkStatus}
            allLabel={t('allWorkStatus')}
            options={workStatuses.map((item) => ({ value: item, label: t(`workStatuses.${item}`) }))}
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
