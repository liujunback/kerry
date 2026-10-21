'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { ClientSelect } from '@/components/clients/client-select'
import { CompactFilterActions, EnumFilterSelect, ListFilterCard } from '@/components/list-filters'
import { Input } from '@/components/ui/input'
import { usePersistedListFilters } from '@/lib/filters/use-persisted-list-filters'

type SerialNumberFilterKey =
  | 'serialNumber'
  | 'skuCode'
  | 'clientId'
  | 'status'
  | 'receivedAsnNumber'
  | 'shippedOrderNumber'
  | 'startDate'
  | 'endDate'

const filterKeys = [
  'serialNumber',
  'skuCode',
  'clientId',
  'status',
  'receivedAsnNumber',
  'shippedOrderNumber',
  'startDate',
  'endDate',
] as const satisfies readonly SerialNumberFilterKey[]

const statuses = ['IN_STOCK', 'PACKED', 'SHIPPED', 'RETURNED'] as const
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterGridClassName =
  'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 2xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(190px,1.15fr)_minmax(150px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(185px,1.15fr)_minmax(185px,1.15fr)_auto] 2xl:items-end'

export function SerialNumberFilter() {
  const tCommon = useTranslations('common')
  const t = useTranslations('inventory.serialNumbers')
  const { currentFilters, formKey, clearStoredFilters } = usePersistedListFilters<SerialNumberFilterKey>({
    storageKey: 'serial-numbers:list:filters',
    pathname: '/inventory/serial-numbers',
    filterKeys,
  })

  return (
    <SerialNumberFilterForm
      key={formKey}
      initialSerialNumber={currentFilters.serialNumber || ''}
      initialSkuCode={currentFilters.skuCode || ''}
      initialClientId={currentFilters.clientId || ''}
      initialStatus={currentFilters.status || ''}
      initialReceivedAsnNumber={currentFilters.receivedAsnNumber || ''}
      initialShippedOrderNumber={currentFilters.shippedOrderNumber || ''}
      initialStartDate={currentFilters.startDate || ''}
      initialEndDate={currentFilters.endDate || ''}
      clearStoredFilters={clearStoredFilters}
      t={t}
      tCommon={tCommon}
    />
  )
}

interface SerialNumberFilterFormProps {
  initialSerialNumber: string
  initialSkuCode: string
  initialClientId: string
  initialStatus: string
  initialReceivedAsnNumber: string
  initialShippedOrderNumber: string
  initialStartDate: string
  initialEndDate: string
  clearStoredFilters: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function SerialNumberFilterForm({
  initialSerialNumber,
  initialSkuCode,
  initialClientId,
  initialStatus,
  initialReceivedAsnNumber,
  initialShippedOrderNumber,
  initialStartDate,
  initialEndDate,
  clearStoredFilters,
  t,
  tCommon,
}: SerialNumberFilterFormProps) {
  const router = useRouter()
  const locale = useLocale()
  const dateInputLang = locale.startsWith('zh') ? 'zh-CN' : 'en-US'
  const dateTimePlaceholder = locale.startsWith('zh') ? '年/月/日 --:--' : 'YYYY-MM-DD HH:mm'
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber)
  const [skuCode, setSkuCode] = useState(initialSkuCode)
  const [clientId, setClientId] = useState(initialClientId)
  const [status, setStatus] = useState(initialStatus)
  const [receivedAsnNumber, setReceivedAsnNumber] = useState(initialReceivedAsnNumber)
  const [shippedOrderNumber, setShippedOrderNumber] = useState(initialShippedOrderNumber)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams()
    if (serialNumber.trim()) params.set('serialNumber', serialNumber.trim())
    if (skuCode.trim()) params.set('skuCode', skuCode.trim())
    if (clientId) params.set('clientId', clientId)
    if (status) params.set('status', status)
    if (receivedAsnNumber.trim()) params.set('receivedAsnNumber', receivedAsnNumber.trim())
    if (shippedOrderNumber.trim()) params.set('shippedOrderNumber', shippedOrderNumber.trim())
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    params.set('page', '1')
    router.push(`/inventory/serial-numbers?${params.toString()}`)
  }

  const handleReset = () => {
    setSerialNumber('')
    setSkuCode('')
    setClientId('')
    setStatus('')
    setReceivedAsnNumber('')
    setShippedOrderNumber('')
    setStartDate('')
    setEndDate('')
    clearStoredFilters()
    router.push('/inventory/serial-numbers')
  }

  return (
    <ListFilterCard mode="advanced">
      <form onSubmit={handleSearch}>
        <div className={filterGridClassName}>
          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('serialNumber')}</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                placeholder={t('serialNumberPlaceholder')}
                className="h-8 pl-9"
              />
            </div>
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('skuCode')}</span>
            <Input
              value={skuCode}
              onChange={(event) => setSkuCode(event.target.value)}
              placeholder={t('skuCodePlaceholder')}
              className="h-8"
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('client')}</span>
            <ClientSelect value={clientId} onValueChange={setClientId} showAll />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('status')}</span>
            <EnumFilterSelect
              value={status}
              onValueChange={setStatus}
              allLabel={t('allStatuses')}
              options={statuses.map((item) => ({
                value: item,
                label: t(`statuses.${item}`),
              }))}
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('receivedAsn')}</span>
            <Input
              value={receivedAsnNumber}
              onChange={(event) => setReceivedAsnNumber(event.target.value)}
              placeholder={t('receivedAsnPlaceholder')}
              className="h-8"
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{t('shippedOrder')}</span>
            <Input
              value={shippedOrderNumber}
              onChange={(event) => setShippedOrderNumber(event.target.value)}
              placeholder={t('shippedOrderPlaceholder')}
              className="h-8"
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('startDateTime')}</span>
            <Input
              type="datetime-local"
              lang={dateInputLang}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              placeholder={dateTimePlaceholder}
              title={dateTimePlaceholder}
              className="h-8 min-w-0"
            />
          </div>

          <div className={filterFieldClassName}>
            <span className="text-xs text-muted-foreground">{tCommon('endDateTime')}</span>
            <Input
              type="datetime-local"
              lang={dateInputLang}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              placeholder={dateTimePlaceholder}
              title={dateTimePlaceholder}
              className="h-8 min-w-0"
            />
          </div>

          <div className="flex h-full min-w-fit items-end">
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
              className="h-8"
            />
          </div>
        </div>
      </form>
    </ListFilterCard>
  )
}
