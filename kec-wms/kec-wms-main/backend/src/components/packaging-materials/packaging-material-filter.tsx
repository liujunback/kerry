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

const materialTypes = ['BOX', 'BAG', 'ENVELOPE', 'BUBBLE_WRAP', 'FOAM', 'TAPE', 'LABEL', 'FILLER', 'OTHER'] as const
const sources = ['PURCHASE', 'CUSTOMER_PROVIDED', 'RECYCLED'] as const
const filterKeys = ['search', 'materialType', 'source', 'isActive'] as const

export function PackagingMaterialFilter() {
  const t = useTranslations('packagingMaterial')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'packaging-materials:list:filters',
    pathname: '/packaging-materials',
    filterKeys,
  })

  return (
    <PackagingMaterialFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialMaterialType={currentFilters.materialType}
      initialSource={currentFilters.source}
      initialIsActive={currentFilters.isActive}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface PackagingMaterialFilterFormProps {
  initialSearch: string
  initialMaterialType: string
  initialSource: string
  initialIsActive: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function PackagingMaterialFilterForm({
  initialSearch,
  initialMaterialType,
  initialSource,
  initialIsActive,
  clearStoredFilters,
  t,
  tCommon,
}: PackagingMaterialFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [materialType, setMaterialType] = useState(initialMaterialType)
  const [source, setSource] = useState(initialSource)
  const [isActive, setIsActive] = useState(initialIsActive)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (materialType) params.set('materialType', materialType)
    if (source) params.set('source', source)
    if (isActive) params.set('isActive', isActive)
    params.set('page', '1')
    router.push(`/packaging-materials?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setMaterialType('')
    setSource('')
    setIsActive('')
    clearStoredFilters()
    router.push('/packaging-materials')
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
            value={materialType}
            onValueChange={setMaterialType}
            allLabel={t('allTypes')}
            options={materialTypes.map((item) => ({ value: item, label: t(`types.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterBySource')}</Label>
          <EnumFilterSelect
            value={source}
            onValueChange={setSource}
            allLabel={t('allSources')}
            options={sources.map((item) => ({ value: item, label: t(`sources.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByStatus')}</Label>
          <EnumFilterSelect
            value={isActive}
            onValueChange={setIsActive}
            allLabel={t('allStatus')}
            options={[
              { value: 'true', label: t('status.ENABLED') },
              { value: 'false', label: t('status.DISABLED') },
            ]}
          />
        </div>

        <FilterActionBar className="justify-start xl:justify-start">
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
