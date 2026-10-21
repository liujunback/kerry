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

const clientTypes = ['STANDARD', 'VIP', 'ENTERPRISE', 'TRIAL'] as const
const activeStatuses = ['true', 'false'] as const
const filterKeys = ['search', 'clientType', 'isActive'] as const

export function ClientFilter() {
  const t = useTranslations('client')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'clients:list:filters',
    pathname: '/clients',
    filterKeys,
  })

  return (
    <ClientFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialClientType={currentFilters.clientType}
      initialIsActive={currentFilters.isActive}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface ClientFilterFormProps {
  initialSearch: string
  initialClientType: string
  initialIsActive: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function ClientFilterForm({
  initialSearch,
  initialClientType,
  initialIsActive,
  clearStoredFilters,
  t,
  tCommon,
}: ClientFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [clientType, setClientType] = useState(initialClientType)
  const [isActive, setIsActive] = useState(initialIsActive)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (clientType) params.set('clientType', clientType)
    if (isActive) params.set('isActive', isActive)
    params.set('page', '1')
    router.push(`/clients?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setClientType('')
    setIsActive('')
    clearStoredFilters()
    router.push('/clients')
  }

  return (
    <ListFilterCard mode="compact">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
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
            value={clientType}
            onValueChange={setClientType}
            allLabel={t('allTypes')}
            options={clientTypes.map((type) => ({ value: type, label: t(`types.${type}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByStatus')}</Label>
          <EnumFilterSelect
            value={isActive}
            onValueChange={setIsActive}
            allLabel={t('allStatus')}
            options={activeStatuses.map((status) => ({ value: status, label: t(`activeStatuses.${status}`) }))}
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
