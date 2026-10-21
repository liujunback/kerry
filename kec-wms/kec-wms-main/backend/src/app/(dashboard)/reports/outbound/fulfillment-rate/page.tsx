'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ClipboardList, CheckCircle, TrendingUp } from 'lucide-react'
import { subDays } from '@/lib/utils/date-formatter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ReportCard,
  LineChart,
  PieChart,
  BarChart,
  DateRangePicker,
  ExportButton,
  MultiDimensionFilter,
  TimeGranularitySelector,
  type TimeGranularity
} from '@/components/reports'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface FulfillmentData {
  summary: {
    totalOrders: number
    totalOrdersTrend: number
    completedOrders: number
    completedOrdersTrend: number
    fulfillmentRate: number
  }
  byStatus: Array<{
    status: string
    count: number
  }>
  byWarehouse: Array<{
    warehouse: string
    warehouseId: string
    total: number
    completed: number
    rate: number
  }>
  byClient: Array<{
    client: string
    clientId: string
    total: number
    completed: number
    rate: number
  }>
  trend: Array<{
    date: string
    total: number
    completed: number
    rate: number
  }>
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#6b7280',
  PENDING: '#f59e0b',
  ALLOCATED: '#3b82f6',
  PICKING: '#8b5cf6',
  PICKED: '#06b6d4',
  PACKING: '#ec4899',
  PACKED: '#14b8a6',
  SHIPPED: '#22c55e',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
  ON_HOLD: '#f97316',
}

export default function FulfillmentRatePage() {
  const t = useTranslations('reports')
  const tOrder = useTranslations('outbound.order')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }, { label: t('outbound.title'), href: '/reports/outbound' }],
    module: { label: t('outbound.fulfillmentRate.title'), href: '/reports/outbound/fulfillment-rate' },
  })

  const [data, setData] = useState<FulfillmentData | null>(null)
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

    const res = await fetch(`/api/v1/reports/outbound/fulfillment-rate?${params}`)
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

  const pieData = data?.byStatus.map((item) => ({
    name: tOrder(`statuses.${item.status}`) || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
  })) || []

  const exportTrendColumns = [
    { key: 'date', header: 'Date' },
    { key: 'total', header: t('outbound.fulfillmentRate.totalOrders') },
    { key: 'completed', header: t('outbound.fulfillmentRate.completedOrders') },
    { key: 'rate', header: t('outbound.fulfillmentRate.fulfillmentRate') },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('outbound.fulfillmentRate.description')}</p>
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
            data={data?.trend || []}
            filename="fulfillment-rate"
            columns={exportTrendColumns}
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
          <div className="grid gap-4 md:grid-cols-3">
            <ReportCard
              title={t('outbound.fulfillmentRate.totalOrders')}
              value={data.summary.totalOrders}
              trend={data.summary.totalOrdersTrend ? {
                value: Math.abs(data.summary.totalOrdersTrend),
                isPositive: data.summary.totalOrdersTrend >= 0
              } : undefined}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <ReportCard
              title={t('outbound.fulfillmentRate.completedOrders')}
              value={data.summary.completedOrders}
              trend={data.summary.completedOrdersTrend ? {
                value: Math.abs(data.summary.completedOrdersTrend),
                isPositive: data.summary.completedOrdersTrend >= 0
              } : undefined}
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <ReportCard
              title={t('outbound.fulfillmentRate.fulfillmentRate')}
              value={`${data.summary.fulfillmentRate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <LineChart
              title={t('outbound.fulfillmentRate.fulfillmentTrend')}
              data={data.trend}
              xKey="date"
              lines={[
                { key: 'total', name: t('outbound.fulfillmentRate.totalOrders'), color: '#3b82f6' },
                { key: 'completed', name: t('outbound.fulfillmentRate.completedOrders'), color: '#22c55e' },
              ]}
            />
            <PieChart
              title={t('outbound.fulfillmentRate.byStatus')}
              data={pieData}
              height={350}
            />
          </div>

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
                  { key: 'total', name: t('outbound.fulfillmentRate.totalOrders'), color: '#3b82f6' },
                  { key: 'completed', name: t('outbound.fulfillmentRate.completedOrders'), color: '#22c55e' },
                ]}
              />
            </TabsContent>
            <TabsContent value="byClient">
              <BarChart
                title={t('inventory.stockLevels.byClient')}
                data={data.byClient}
                xKey="client"
                bars={[
                  { key: 'total', name: t('outbound.fulfillmentRate.totalOrders'), color: '#3b82f6' },
                  { key: 'completed', name: t('outbound.fulfillmentRate.completedOrders'), color: '#22c55e' },
                ]}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
      )}
    </div>
  )
}
