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

const transactionTypes = [
  'PURCHASE_INBOUND',
  'RETURN_INBOUND',
  'ORDER_OUTBOUND',
  'COUNT_ADJUSTMENT_IN',
  'COUNT_ADJUSTMENT_OUT',
  'DAMAGE_ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'SCRAP',
] as const
const auditStatuses = ['UNAUDITED', 'AUDITING', 'APPROVED', 'REJECTED'] as const
const filterKeys = ['search', 'transactionType', 'auditStatus', 'startDate', 'endDate'] as const

export function TransactionFilter() {
  const t = useTranslations('packagingMaterialTransaction')
  const tCommon = useTranslations('common')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters({
    storageKey: 'packaging-material-transactions:list:filters',
    pathname: '/packaging-material-transactions',
    filterKeys,
  })

  return (
    <TransactionFilterForm
      key={formKey}
      initialSearch={currentFilters.search}
      initialTransactionType={currentFilters.transactionType}
      initialAuditStatus={currentFilters.auditStatus}
      initialStartDate={currentFilters.startDate}
      initialEndDate={currentFilters.endDate}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface TransactionFilterFormProps {
  initialSearch: string
  initialTransactionType: string
  initialAuditStatus: string
  initialStartDate: string
  initialEndDate: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function TransactionFilterForm({
  initialSearch,
  initialTransactionType,
  initialAuditStatus,
  initialStartDate,
  initialEndDate,
  clearStoredFilters,
  t,
  tCommon,
}: TransactionFilterFormProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [transactionType, setTransactionType] = useState(initialTransactionType)
  const [auditStatus, setAuditStatus] = useState(initialAuditStatus)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (transactionType) params.set('transactionType', transactionType)
    if (auditStatus) params.set('auditStatus', auditStatus)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    params.set('page', '1')
    router.push(`/packaging-material-transactions?${params.toString()}`)
  }

  const resetFilters = () => {
    setSearch('')
    setTransactionType('')
    setAuditStatus('')
    setStartDate('')
    setEndDate('')
    clearStoredFilters()
    router.push('/packaging-material-transactions')
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
            value={transactionType}
            onValueChange={setTransactionType}
            allLabel={t('allTypes')}
            options={transactionTypes.map((item) => ({ value: item, label: t(`types.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('filterByAuditStatus')}</Label>
          <EnumFilterSelect
            value={auditStatus}
            onValueChange={setAuditStatus}
            allLabel={t('allAuditStatus')}
            options={auditStatuses.map((item) => ({ value: item, label: t(`auditStatus.${item}`) }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('startDate')}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground">{t('endDate')}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
