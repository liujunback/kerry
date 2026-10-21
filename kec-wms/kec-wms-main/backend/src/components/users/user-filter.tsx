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

const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED'] as const
const userTypes = ['INTERNAL', 'EXTERNAL', 'SYSTEM', 'API'] as const
const filterKeys = ['search', 'status', 'userType'] as const

export function UserFilter() {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'users:list:filters',
    pathname: '/users',
    filterKeys,
  })

  return (
    <UserFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialStatus={currentFilters.status}
      initialUserType={currentFilters.userType}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface UserFilterFormProps {
  initialSearch: string
  initialStatus: string
  initialUserType: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function UserFilterForm({
  initialSearch,
  initialStatus,
  initialUserType,
  clearStoredFilters,
  t,
  tCommon,
}: UserFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [userType, setUserType] = useState(initialUserType)

  const handleSearch = () => {
    const hasActiveFilters = Boolean(search || status || userType)
    if (!hasActiveFilters) clearStoredFilters()

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (userType) params.set('userType', userType)
    params.set('page', '1')
    router.push(`/users?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setUserType('')
    clearStoredFilters()
    router.push('/users')
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
              aria-label={t('search')}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('status')}</Label>
          <EnumFilterSelect
            value={status}
            onValueChange={setStatus}
            allLabel={tCommon('all')}
            options={statuses.map((item) => ({ value: item, label: t(`statuses.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('userType')}</Label>
          <EnumFilterSelect
            value={userType}
            onValueChange={setUserType}
            allLabel={tCommon('all')}
            options={userTypes.map((item) => ({ value: item, label: t(`userTypes.${item}`) }))}
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
