'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { EntitySelect, EnumFilterSelect, FilterActionBar, ListFilterCard } from '@/components/list-filters'
import { ClientSelect } from '@/components/clients/client-select'
import { formatCodeNameLabel } from '@/lib/filters/readable-filter-value'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

interface Category {
  id: string
  categoryCode: string
  categoryName: string
}

interface SkuFilterProps {
  categories: Category[]
}

const statuses = ['ACTIVE', 'INACTIVE'] as const
const abcClasses = ['A', 'B', 'C'] as const
const storageConditions = ['NORMAL', 'COLD', 'FROZEN', 'HAZMAT', 'CONTROLLED'] as const
const filterKeys = ['search', 'clientId', 'categoryId', 'status', 'abcClass', 'storageCondition'] as const

export function SkuFilter({ categories }: SkuFilterProps) {
  const t = useTranslations('sku')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'sku:list:filters',
    pathname: '/sku',
    filterKeys,
  })

  return (
    <SkuFilterForm
      key={formKey}
      categories={categories}
      initialSearch={currentFilters.search}
      initialClientId={currentFilters.clientId}
      initialCategoryId={currentFilters.categoryId}
      initialStatus={currentFilters.status}
      initialAbcClass={currentFilters.abcClass}
      initialStorageCondition={currentFilters.storageCondition}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface SkuFilterFormProps {
  categories: Category[]
  initialSearch: string
  initialClientId: string
  initialCategoryId: string
  initialStatus: string
  initialAbcClass: string
  initialStorageCondition: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function SkuFilterForm({
  categories,
  initialSearch,
  initialClientId,
  initialCategoryId,
  initialStatus,
  initialAbcClass,
  initialStorageCondition,
  clearStoredFilters,
  t,
  tCommon,
}: SkuFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [clientId, setClientId] = useState(initialClientId)
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [status, setStatus] = useState(initialStatus)
  const [abcClass, setAbcClass] = useState(initialAbcClass)
  const [storageCondition, setStorageCondition] = useState(initialStorageCondition)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (clientId) params.set('clientId', clientId)
    if (categoryId) params.set('categoryId', categoryId)
    if (status) params.set('status', status)
    if (abcClass) params.set('abcClass', abcClass)
    if (storageCondition) params.set('storageCondition', storageCondition)
    params.set('page', '1')
    router.push(`/sku?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setClientId('')
    setCategoryId('')
    setStatus('')
    setAbcClass('')
    setStorageCondition('')
    clearStoredFilters()
    router.push('/sku')
  }

  return (
    <ListFilterCard mode="compact">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
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
            <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('client')}</Label>
            <ClientSelect
              value={clientId}
              onValueChange={setClientId}
              showAll
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('category')}</Label>
            <EntitySelect
              value={categoryId}
              onValueChange={setCategoryId}
              showAll
              placeholder={t('allCategories')}
              allLabel={t('allCategories')}
              searchPlaceholder={tCommon('search')}
              emptyText={tCommon('noResults')}
              options={categories.map((category) => ({
                value: category.id,
                label: formatCodeNameLabel(category.categoryCode, category.categoryName),
                keywords: [category.categoryCode, category.categoryName],
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('statusLabel')}</Label>
            <EnumFilterSelect
              value={status}
              onValueChange={setStatus}
              allLabel={t('allStatus')}
              options={statuses.map((item) => ({ value: item, label: t(`statuses.${item}`) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('abcClass')}</Label>
            <EnumFilterSelect
              value={abcClass}
              onValueChange={setAbcClass}
              allLabel={t('allAbcClasses')}
              options={abcClasses.map((item) => ({ value: item, label: t(`abcClasses.${item}`) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('storageConditionLabel')}</Label>
            <EnumFilterSelect
              value={storageCondition}
              onValueChange={setStorageCondition}
              allLabel={t('allStorageConditions')}
              options={storageConditions.map((item) => ({ value: item, label: t(`storageConditions.${item}`) }))}
            />
          </div>
        </div>

        <FilterActionBar className="mt-2 xl:mt-0 xl:w-[180px] xl:shrink-0">
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
