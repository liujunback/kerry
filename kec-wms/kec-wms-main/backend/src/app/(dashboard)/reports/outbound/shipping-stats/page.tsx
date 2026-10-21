'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Truck, Package, Scale } from 'lucide-react'
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

interface ShippingData {
  summary: {
    totalShipments: number
    totalShipmentsTrend: number
    totalPackages: number
    totalPackagesTrend: number
    totalWeight: number
  }
  trend: Array<{
    date: string
    shipments: number
    packages: number
  }>
  byCarrier: Array<{
    carrier: string
    shipments: number
    packages: number
  }>
  byWarehouse: Array<{
    warehouse: string
    warehouseId: string
    shipments: number
    packages: number
    weight: number
  }>
  byClient: Array<{
    client: string
    clientId: string
    shipments: number
    packages: number
    weight: number
  }>
}

export default function ShippingStatsPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports'), href: '/reports' }],
    module: { label: t('outbound.title'), href: '/reports/outbound' },
  })

  const [data, setData] = useState<ShippingData | null>(null)
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

    const res = await fetch(`/api/v1/reports/outbound/shipping-stats?${params}`)
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

  const exportCarrierColumns = [
    { key: 'carrier', header: t('outbound.shippingStats.byCarrier') },
    { key: 'shipments', header: t('outbound.shippingStats.totalShipments') },
    { key: 'packages', header: t('outbound.shippingStats.totalPackages') },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.current(t('outbound.shippingStats.title'))} />
          <p className="text-muted-foreground mt-1">{t('outbound.shippingStats.description')}</p>
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
            data={data?.byCarrier || []}
            filename="shipping-stats"
            columns={exportCarrierColumns}
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
              title={t('outbound.shippingStats.totalShipments')}
              value={data.summary.totalShipments}
              trend={data.summary.totalShipmentsTrend ? {
                value: Math.abs(data.summary.totalShipmentsTrend),
                isPositive: data.summary.totalShipmentsTrend >= 0
              } : undefined}
              icon={<Truck className="h-4 w-4" />}
            />
            <ReportCard
              title={t('outbound.shippingStats.totalPackages')}
              value={data.summary.totalPackages}
              trend={data.summary.totalPackagesTrend ? {
                value: Math.abs(data.summary.totalPackagesTrend),
                isPositive: data.summary.totalPackagesTrend >= 0
              } : undefined}
              icon={<Package className="h-4 w-4" />}
            />
            <ReportCard
              title="Total Weight (kg)"
              value={data.summary.totalWeight}
              icon={<Scale className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <LineChart
              title={t('outbound.shippingStats.shippingTrend')}
              data={data.trend}
              xKey="date"
              lines={[
                { key: 'shipments', name: t('outbound.shippingStats.totalShipments'), color: '#3b82f6' },
                { key: 'packages', name: t('outbound.shippingStats.totalPackages'), color: '#22c55e' },
              ]}
            />
            <BarChart
              title={t('outbound.shippingStats.byCarrier')}
              data={data.byCarrier}
              xKey="carrier"
              bars={[
                { key: 'shipments', name: t('outbound.shippingStats.totalShipments'), color: '#3b82f6' },
              ]}
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
                  { key: 'shipments', name: t('outbound.shippingStats.totalShipments'), color: '#3b82f6' },
                  { key: 'packages', name: t('outbound.shippingStats.totalPackages'), color: '#22c55e' },
                ]}
              />
            </TabsContent>
            <TabsContent value="byClient">
              <BarChart
                title={t('inventory.stockLevels.byClient')}
                data={data.byClient}
                xKey="client"
                bars={[
                  { key: 'shipments', name: t('outbound.shippingStats.totalShipments'), color: '#3b82f6' },
                  { key: 'packages', name: t('outbound.shippingStats.totalPackages'), color: '#22c55e' },
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
