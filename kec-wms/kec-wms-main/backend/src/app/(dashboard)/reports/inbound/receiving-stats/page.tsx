'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { PackageCheck, Package, Clock, TrendingUp } from 'lucide-react'
import { subDays } from '@/lib/utils/date-formatter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ReportCard,
  LineChart,
  BarChart,
  DateRangePicker,
  ExportButton,
  MultiDimensionFilter,
  TimeGranularitySelector,
  type TimeGranularity
} from '@/components/reports'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface ReceivingData {
  summary: {
    totalAsn: number
    totalAsnTrend: number
    totalReceived: number
    totalReceivedTrend: number
    totalExpected: number
    onTimeRate: number
  }
  trend: Array<{
    date: string
    asnCount: number
    quantity: number
  }>
  byWarehouse: Array<{
    warehouse: string
    warehouseId: string
    asnCount: number
    receivedQty: number
    expectedQty: number
  }>
  byClient: Array<{
    client: string
    clientId: string
    asnCount: number
    receivedQty: number
    expectedQty: number
  }>
}

export default function ReceivingStatsPage() {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }, { label: t('inbound.title'), href: '/reports/inbound' }],
    module: { label: t('inbound.receivingStats.title'), href: '/reports/inbound/receiving-stats' },
  })

  const [data, setData] = useState<ReceivingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoneId, setZoneId] = useState<string>('')
  const [clientId, setClientId] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [granularity, setGranularity] = useState<TimeGranularity>('day')
  const [isInitialized, setIsInitialized] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (zoneId) params.set('zoneId', zoneId)
    if (clientId) params.set('clientId', clientId)
    if (startDate) params.set('startDate', startDate.toISOString())
    if (endDate) params.set('endDate', endDate.toISOString())
    params.set('granularity', granularity)

    const res = await fetch(`/api/v1/reports/inbound/receiving-stats?${params}`)
    const result = await res.json()
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }, [zoneId, clientId, startDate, endDate, granularity])

  // 在客户端初始化日期，避免 hydration 错误
  useEffect(() => {
    if (!isInitialized) {
      startTransition(() => {
        setStartDate(subDays(new Date(), 29))
        setEndDate(new Date())
        setIsInitialized(true)
      })
    }
  }, [isInitialized])

  useEffect(() => {
    if (isInitialized) {
      startTransition(() => {
        fetchData()
      })
    }
  }, [isInitialized, fetchData])

  const exportWarehouseColumns = [
    { key: 'warehouse', header: tCommon('warehouse') },
    { key: 'asnCount', header: t('inbound.receivingStats.totalAsn') },
    { key: 'receivedQty', header: t('inbound.receivingStats.totalReceived') },
    { key: 'expectedQty', header: t('inbound.receivingStats.totalExpected') },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('inbound.receivingStats.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
          <TimeGranularitySelector
            value={granularity}
            onChange={setGranularity}
          />
          <ExportButton
            data={data?.byWarehouse || []}
            filename="receiving-stats"
            columns={exportWarehouseColumns}
            disabled={loading}
          />
        </div>
      </div>

      <MultiDimensionFilter
        zoneId={zoneId}
        clientId={clientId}
        onZoneChange={setZoneId}
        onClientChange={setClientId}
      />

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReportCard
              title={t('inbound.receivingStats.totalAsn')}
              value={data.summary.totalAsn}
              trend={data.summary.totalAsnTrend ? {
                value: Math.abs(data.summary.totalAsnTrend),
                isPositive: data.summary.totalAsnTrend >= 0
              } : undefined}
              icon={<PackageCheck className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inbound.receivingStats.totalReceived')}
              value={data.summary.totalReceived}
              trend={data.summary.totalReceivedTrend ? {
                value: Math.abs(data.summary.totalReceivedTrend),
                isPositive: data.summary.totalReceivedTrend >= 0
              } : undefined}
              icon={<Package className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inbound.receivingStats.onTimeRate')}
              value={`${data.summary.onTimeRate}%`}
              icon={<Clock className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inbound.receivingStats.totalExpected')}
              value={data.summary.totalExpected}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <LineChart
              title={t('inbound.receivingStats.receivingTrend')}
              data={data.trend}
              xKey="date"
              lines={[
                { key: 'quantity', name: t('inbound.receivingStats.totalReceived'), color: '#22c55e' },
                { key: 'asnCount', name: t('inbound.receivingStats.totalAsn'), color: '#3b82f6' },
              ]}
            />
            <Tabs defaultValue="byWarehouse" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="byWarehouse">{t('inventory.stockLevels.byWarehouse')}</TabsTrigger>
                <TabsTrigger value="byClient">{t('inventory.stockLevels.byClient')}</TabsTrigger>
              </TabsList>
              <TabsContent value="byWarehouse">
                <BarChart
                  title={t('inventory.stockLevels.byWarehouse')}
                  data={data.byWarehouse}
                  xKey="warehouse"
                  bars={[
                    { key: 'receivedQty', name: t('inbound.receivingStats.totalReceived'), color: '#22c55e' },
                    { key: 'expectedQty', name: t('inbound.receivingStats.totalExpected'), color: '#3b82f6' },
                  ]}
                />
              </TabsContent>
              <TabsContent value="byClient">
                <BarChart
                  title={t('inventory.stockLevels.byClient')}
                  data={data.byClient}
                  xKey="client"
                  bars={[
                    { key: 'receivedQty', name: t('inbound.receivingStats.totalReceived'), color: '#22c55e' },
                    { key: 'expectedQty', name: t('inbound.receivingStats.totalExpected'), color: '#3b82f6' },
                  ]}
                />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
      )}
    </div>
  )
}
