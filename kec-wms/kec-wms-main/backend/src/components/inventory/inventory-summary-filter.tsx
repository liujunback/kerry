'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { ClientSelect } from '@/components/clients/client-select'
import { Input } from '@/components/ui/input'
import { CompactFilterActions, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

type InventorySummaryFilterKey = 'search' | 'clientId'

const filterKeys = ['search', 'clientId'] as const satisfies readonly InventorySummaryFilterKey[]
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'

export function InventorySummaryFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tCommon = useTranslations('common')
  const tInv = useTranslations('inventory.summary')
  const { currentFilters, formKey, resetToDefaults } = usePersistedListFilters<InventorySummaryFilterKey>({
    storageKey: 'inventory-summary:list:filters',
    pathname: '/inventory',
    filterKeys,
  })

  const currentSearch = currentFilters.search || ''
  const currentClientId = currentFilters.clientId || ''

  const updateFilter = (key: InventorySummaryFilterKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    params.set('page', '1')
    router.push(`/inventory?${params.toString()}`)
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    updateFilter('search', String(formData.get('search') || ''))
  }

  return (
    <ListFilterCard mode="advanced">
      <form key={formKey} onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('search')}</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={currentSearch}
                placeholder={tInv('searchPlaceholder')}
                className="h-8 pl-9"
              />
            </div>
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('client')}</span>
            <ClientSelect
              value={currentClientId}
              onValueChange={(value) => updateFilter('clientId', value)}
              showAll
              className="h-8 w-full"
            />
          </div>

          <CompactFilterActions
            pendingChangeCount={0}
            searchLabel={tCommon('search')}
            resetLabel={tCommon('reset')}
            moreLabel=""
            collapseLabel=""
            expanded={false}
            onReset={resetToDefaults}
            onToggleExpanded={() => {}}
            showToggle={false}
            className="mt-2 xl:mt-0 xl:w-full xl:shrink-0 xl:justify-start"
          />
        </div>
      </form>
    </ListFilterCard>
  )
}
