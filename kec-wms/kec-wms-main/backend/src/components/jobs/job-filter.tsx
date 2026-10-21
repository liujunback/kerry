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

const jobTypes = ['DATA_UPLOAD', 'REPORT_EXPORT', 'INVENTORY_ALLOCATION', 'INVENTORY_COUNT_SCOPE', 'WAVE_STRATEGY_EXECUTE', 'WAVE_RELEASE', 'SHIPMENT_STATUS_PUSH'] as const
const jobStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const
const filterKeys = ['search', 'jobType', 'status'] as const

export function JobFilter() {
  const t = useTranslations('jobs')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'jobs:list:filters',
    pathname: '/jobs',
    filterKeys,
  })

  return (
    <JobFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialJobType={currentFilters.jobType}
      initialStatus={currentFilters.status}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface JobFilterFormProps {
  initialSearch: string
  initialJobType: string
  initialStatus: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function JobFilterForm({
  initialSearch,
  initialJobType,
  initialStatus,
  clearStoredFilters,
  t,
  tCommon,
}: JobFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [jobType, setJobType] = useState(initialJobType)
  const [status, setStatus] = useState(initialStatus)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (jobType) params.set('jobType', jobType)
    if (status) params.set('status', status)
    params.set('page', '1')
    router.push(`/jobs?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setJobType('')
    setStatus('')
    clearStoredFilters()
    router.push('/jobs')
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
            value={jobType}
            onValueChange={setJobType}
            allLabel={t('allTypes')}
            options={jobTypes.map((item) => ({ value: item, label: t(`types.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByStatus')}</Label>
          <EnumFilterSelect
            value={status}
            onValueChange={setStatus}
            allLabel={t('allStatuses')}
            options={jobStatuses.map((item) => ({ value: item, label: t(`statuses.${item}`) }))}
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
