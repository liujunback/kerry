'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { ClientSelect } from '@/components/clients/client-select'
import { Input } from '@/components/ui/input'
import { CompactFilterActions, EnumFilterSelect, ListFilterCard } from '@/components/list-filters'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

type InventoryTransactionsFilterKey = 'skuCode' | 'asnNumber' | 'clientId' | 'eventType' | 'bucketType'

const filterKeys = ['skuCode', 'asnNumber', 'clientId', 'eventType', 'bucketType'] as const satisfies readonly InventoryTransactionsFilterKey[]
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'

const eventTypes = [
  'PUTAWAY',
  'ALLOCATE',
  'DEALLOCATE',
  'PICK',
  'UNPICK',
  'SHIP',
  'FREEZE',
  'UNFREEZE',
  'ADJUST',
  'PICK_SHORTAGE',
  'SUPPLEMENT_ALLOCATE',
  'SUPPLEMENT_PICK',
  'TRANSFER_OUT',
  'TRANSFER_IN',
] as const

const bucketTypes = [
  'AVAILABLE',
  'ALLOCATED',
  'FROZEN',
  'DEFECTIVE',
  'EXCEPTION',
  'PICKING',
  'QC_HOLD',
  'COUNT_HOLD',
  'COUNT_SURPLUS',
  'COUNT_SHORTAGE',
] as const

export function InventoryTransactionsFilter() {
  const tCommon = useTranslations('common')
  const tInv = useTranslations('inventory.transactions')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters<InventoryTransactionsFilterKey>({
    storageKey: 'inventory-transactions:list:filters',
    pathname: '/inventory/transactions',
    filterKeys,
  })

  return (
    <InventoryTransactionsFilterForm
      key={formKey}
      initialSkuCode={currentFilters.skuCode || ''}
      initialAsnNumber={currentFilters.asnNumber || ''}
      initialClientId={currentFilters.clientId || ''}
      initialEventType={currentFilters.eventType || ''}
      initialBucketType={currentFilters.bucketType || ''}
      clearStoredFilters={clearStoredFilters}
      tCommon={tCommon}
      tInv={tInv}
    />
  )
}

interface InventoryTransactionsFilterFormProps {
  initialSkuCode: string
  initialAsnNumber: string
  initialClientId: string
  initialEventType: string
  initialBucketType: string
  clearStoredFilters: () => void
  tCommon: ReturnType<typeof useTranslations>
  tInv: ReturnType<typeof useTranslations>
}

function InventoryTransactionsFilterForm({
  initialSkuCode,
  initialAsnNumber,
  initialClientId,
  initialEventType,
  initialBucketType,
  clearStoredFilters,
  tCommon,
  tInv,
}: InventoryTransactionsFilterFormProps) {
  const router = useRouter()
  const [skuCode, setSkuCode] = useState(initialSkuCode)
  const [asnNumber, setAsnNumber] = useState(initialAsnNumber)
  const [clientId, setClientId] = useState(initialClientId)
  const [eventType, setEventType] = useState(initialEventType)
  const [bucketType, setBucketType] = useState(initialBucketType)

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams()

    if (skuCode.trim()) params.set('skuCode', skuCode.trim())
    if (asnNumber.trim()) params.set('asnNumber', asnNumber.trim())
    if (clientId) params.set('clientId', clientId)
    if (eventType) params.set('eventType', eventType)
    if (bucketType) params.set('bucketType', bucketType)

    params.set('page', '1')
    router.push(`/inventory/transactions?${params.toString()}`)
  }

  const handleReset = () => {
    setSkuCode('')
    setAsnNumber('')
    setClientId('')
    setEventType('')
    setBucketType('')
    clearStoredFilters()
    router.push('/inventory/transactions')
  }

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('search')}</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={skuCode}
                onChange={(event) => setSkuCode(event.target.value)}
                placeholder={tInv('searchPlaceholder')}
                className="h-8 pl-9"
              />
            </div>
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tInv('asnNumber')}</span>
            <Input
              value={asnNumber}
              onChange={(event) => setAsnNumber(event.target.value)}
              placeholder={tInv('asnNumberPlaceholder')}
              className="h-8"
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tInv('customer')}</span>
            <ClientSelect
              value={clientId}
              onValueChange={setClientId}
              showAll
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tInv('eventType')}</span>
            <EnumFilterSelect
              value={eventType}
              onValueChange={setEventType}
              allLabel={tInv('allEventTypes')}
              options={eventTypes.map((item) => ({
                value: item,
                label: tInv(`eventTypes.${item}`),
              }))}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tInv('bucketType')}</span>
            <EnumFilterSelect
              value={bucketType}
              onValueChange={setBucketType}
              allLabel={tInv('allBucketTypes')}
              options={bucketTypes.map((item) => ({
                value: item,
                label: tInv(`bucketTypes.${item}`),
              }))}
            />
          </div>

          <CompactFilterActions
            pendingChangeCount={0}
            searchLabel={tCommon('search')}
            resetLabel={tCommon('reset')}
            moreLabel=""
            collapseLabel=""
            expanded={false}
            onReset={handleReset}
            onToggleExpanded={() => {}}
            showToggle={false}
            className="mt-2 xl:mt-0 xl:w-full xl:shrink-0 xl:justify-start"
          />
        </div>
      </form>
    </ListFilterCard>
  )
}
