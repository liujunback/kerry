'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Activity, TrendingUp, Package } from 'lucide-react'
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

interface EfficiencyData {
  avgInboundEfficiency: number
  inboundEfficiencyTrend: number
  avgOutboundEfficiency: number
  outboundEfficiencyTrend: number
  totalInboundOrders: number
  totalOutboundOrders: number
  byWarehouse: Array<{
    warehouseId: string
    inboundEfficiency: number
    outboundEfficiency: number
  }>
  byTime: Array<{
    time: string
    inboundEfficiency: number
    outboundEfficiency: number
  }>
}

export default function OperationsEfficiencyPage() {
  const t = useTranslations()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('reports.title') }, { label: t('reports.operations.title'), href: '/reports/operations' }],
    module: { label: t('reports.operations.efficiency'), href: '/reports/operations/efficiency' },
  })
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  const [granularity, setGranularity] = useState<TimeGranularity>('day')
  const [zoneId, setZoneId] = useState<string>('all')
  const [clientId, setClientId] = useState<string>('all')
  const [data, setData] = useState<EfficiencyData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity,
      })

      const response = await fetch(`/api/v1/reports/operations/efficiency?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch efficiency data:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, granularity])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumb.list()} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('reports.operations.efficiency')}</h1>
        <ExportButton
          data={data?.byWarehouse || []}
          filename={`operations-efficiency-${new Date().toISOString().split('T')[0]}`}
          columns={[
            { key: 'warehouseId', header: t('common.warehouse') },
            { key: 'inboundEfficiency', header: t('reports.operations.inboundEfficiency') },
            { key: 'outboundEfficiency', header: t('reports.operations.outboundEfficiency') },
          ]}
          disabled={!data || loading}
        />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start)
            setEndDate(end)
          }}
        />
        <TimeGranularitySelector value={granularity} onChange={setGranularity} />
        <MultiDimensionFilter
          zoneId={zoneId}
          clientId={clientId}
          onZoneChange={setZoneId}
          onClientChange={setClientId}
          showClient={false}
          showZone={false}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ReportCard
              title={t('reports.operations.inboundEfficiency')}
              value={`${data.avgInboundEfficiency}`}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              trend={data.inboundEfficiencyTrend ? {
                value: Math.abs(data.inboundEfficiencyTrend),
                isPositive: data.inboundEfficiencyTrend >= 0
              } : undefined}
              description={t('reports.operations.inboundEfficiencyDesc')}
            />
            <ReportCard
              title={t('reports.operations.outboundEfficiency')}
              value={`${data.avgOutboundEfficiency}`}
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              trend={data.outboundEfficiencyTrend ? {
                value: Math.abs(data.outboundEfficiencyTrend),
                isPositive: data.outboundEfficiencyTrend >= 0
              } : undefined}
              description={t('reports.operations.outboundEfficiencyDesc')}
            />
            <ReportCard
              title={t('reports.operations.totalInboundOrders')}
              value={data.totalInboundOrders}
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              description={t('reports.operations.totalInboundOrdersDesc')}
            />
            <ReportCard
              title={t('reports.operations.totalOutboundOrders')}
              value={data.totalOutboundOrders}
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              description={t('reports.operations.totalOutboundOrdersDesc')}
            />
          </div>

          <Tabs defaultValue="time" className="space-y-4">
            <TabsList>
              <TabsTrigger value="time">{t('reports.common.byTime')}</TabsTrigger>
              <TabsTrigger value="warehouse">{t('reports.common.byWarehouse')}</TabsTrigger>
            </TabsList>

            <TabsContent value="time" className="space-y-4">
              <LineChart
                data={data.byTime}
                xKey="time"
                lines={[
                  { key: 'inboundEfficiency', name: t('reports.operations.inboundEfficiency'), color: '#8b5cf6' },
                  { key: 'outboundEfficiency', name: t('reports.operations.outboundEfficiency'), color: '#06b6d4' },
                ]}
                title={t('reports.operations.efficiencyTrend')}
              />
            </TabsContent>

            <TabsContent value="warehouse" className="space-y-4">
              <BarChart
                data={data.byWarehouse}
                xKey="warehouseId"
                bars={[
                  { key: 'inboundEfficiency', name: t('reports.operations.inboundEfficiency'), color: '#8b5cf6' },
                  { key: 'outboundEfficiency', name: t('reports.operations.outboundEfficiency'), color: '#06b6d4' },
                ]}
                title={t('reports.common.byWarehouse')}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">{t('common.noData')}</div>
        </div>
      )}
    </div>
  )
}
