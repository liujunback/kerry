'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterActionBar, ListFilterCard } from '@/components/list-filters'

interface PendingLinesFilterProps {
  filters: {
    search: string
    asnNumber: string
  }
  onFilterChange: (key: string, value: string) => void
  onReset: () => void
}

const BATCH_SPLIT_REGEX = /[\n,\uFF0C;\uFF1B\s]+/
const filterFieldClassName = 'flex h-full flex-col justify-end gap-1'

function parseBatchValues(value: string) {
  return value
    .split(BATCH_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeBatchInput(value: string) {
  return parseBatchValues(value).join(',')
}

export function PendingLinesFilter({
  filters,
  onFilterChange,
  onReset,
}: PendingLinesFilterProps) {
  const t = useTranslations('putaway')
  const tCommon = useTranslations('common')

  const [draftSearch, setDraftSearch] = useState(filters.search)
  const [draftAsnNumber, setDraftAsnNumber] = useState(filters.asnNumber)

  const skuSearchCount = parseBatchValues(draftSearch).length
  const asnSearchCount = parseBatchValues(draftAsnNumber).length

  const handleSearch = () => {
    onFilterChange('search', normalizeBatchInput(draftSearch))
    onFilterChange('asnNumber', normalizeBatchInput(draftAsnNumber))
  }

  const handleReset = () => {
    setDraftSearch('')
    setDraftAsnNumber('')
    onReset()
  }

  return (
    <ListFilterCard mode="selection-aware">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
        <div className={filterFieldClassName}>
          <span className="text-xs text-muted-foreground">{t('table.skuCode')}</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder={`${tCommon('search')}${t('table.skuCode')}`}
              className="h-8 pl-7 pr-8 text-sm"
            />
            {skuSearchCount > 1 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
                {skuSearchCount}
              </span>
            )}
          </div>
        </div>

        <div className={filterFieldClassName}>
          <span className="text-xs text-muted-foreground">{t('table.asn')}</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draftAsnNumber}
              onChange={(e) => setDraftAsnNumber(e.target.value)}
              placeholder={`${tCommon('search')}${t('table.asn')}`}
              className="h-8 pl-7 pr-8 text-sm"
            />
            {asnSearchCount > 1 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
                {asnSearchCount}
              </span>
            )}
          </div>
        </div>

        <FilterActionBar className="h-full items-end xl:justify-start">
          <Button size="sm" className="h-8 min-w-[76px]" onClick={handleSearch}>
            <Search className="mr-1 h-3.5 w-3.5" />
            {tCommon('search')}
          </Button>
          <Button variant="outline" size="sm" className="h-8 min-w-[76px]" onClick={handleReset}>
            <X className="mr-1 h-3.5 w-3.5" />
            {tCommon('reset')}
          </Button>
        </FilterActionBar>
      </div>
    </ListFilterCard>
  )
}
