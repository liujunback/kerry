'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, Package, BarChart3 } from 'lucide-react'
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

interface TurnoverData {
  turnoverRate: string
  turnoverRateTrend: number
  totalOutbound: number
  avgInventory: number
  byWarehouse: Array<{
    warehouseId: string
    totalOutbound: number
    turnoverRate: number
  }>
  bySku: Array<{
    skuId: string
    skuCode: string
    skuName: string
    totalOutbound: number
    turnoverRate: number
  }>
  byTime: Array<{
    time: string
    totalOutbound: number
  }>
}

export default function InventoryTurnoverRatePage() {
  const t = useTranslations()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('reports.title') }, { label: t('reports.inventory.title'), href: '/reports/inventory' }],
    module: { label: t('reports.inventory.turnoverRate'), href: '/reports/inventory/turnover-rate' },
  })
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  const [granularity, setGranularity] = useState<TimeGranularity>('day')
  const [zoneId, setZoneId] = useState<string>('all')
  const [clientId, setClientId] = useState<string>('all')
  const [data, setData] = useState<TurnoverData | null>(null)
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

      if (zoneId && zoneId !== 'all') params.set('zoneId', zoneId)
      if (clientId && clientId !== 'all') params.set('clientId', clientId)

      const response = await fetch(`/api/v1/reports/inventory/turnover-rate?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch turnover rate data:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, zoneId, clientId, granularity])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumb.list()} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('reports.inventory.turnoverRate')}</h1>
        <ExportButton
          data={data?.bySku || []}
          filename={`inventory-turnover-rate-${new Date().toISOString().split('T')[0]}`}
          columns={[
            { key: 'skuCode', header: t('common.skuCode') },
            { key: 'skuName', header: t('common.skuName') },
            { key: 'totalOutbound', header: t('reports.totalOutbound') },
            { key: 'turnoverRate', header: t('reports.inventory.turnoverRate') },
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
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReportCard
              title={t('reports.inventory.turnoverRate')}
              value={data.turnoverRate}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              trend={data.turnoverRateTrend ? {
                value: Math.abs(data.turnoverRateTrend),
                isPositive: data.turnoverRateTrend >= 0
              } : undefined}
              description={t('reports.inventory.turnoverRateDesc')}
            />
            <ReportCard
              title={t('reports.inventory.totalOutbound')}
              value={data.totalOutbound}
              icon={<Package className="h-4 w-4 text-muted-foreground" />}
              description={t('reports.inventory.totalOutboundDesc')}
            />
            <ReportCard
              title={t('reports.inventory.avgInventory')}
              value={data.avgInventory}
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              description={t('reports.inventory.avgInventoryDesc')}
            />
          </div>

          <Tabs defaultValue="time" className="space-y-4">
            <TabsList>
              <TabsTrigger value="time">{t('reports.common.byTime')}</TabsTrigger>
              <TabsTrigger value="warehouse">{t('reports.common.byWarehouse')}</TabsTrigger>
              <TabsTrigger value="sku">{t('reports.common.bySku')}</TabsTrigger>
            </TabsList>

            <TabsContent value="time" className="space-y-4">
              <LineChart
                data={data.byTime}
                xKey="time"
                lines={[{ key: 'totalOutbound', name: t('reports.inventory.totalOutbound'), color: '#8b5cf6' }]}
                title={t('reports.inventory.outboundTrend')}
              />
            </TabsContent>

            <TabsContent value="warehouse" className="space-y-4">
              <BarChart
                data={data.byWarehouse}
                xKey="warehouseId"
                bars={[
                  { key: 'turnoverRate', name: t('reports.inventory.turnoverRate'), color: '#8b5cf6' },
                ]}
                title={t('reports.common.byWarehouse')}
              />
            </TabsContent>

            <TabsContent value="sku" className="space-y-4">
              <div className="rounded-lg border bg-card">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('reports.common.bySku')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">{t('sku.skuCode')}</th>
                          <th className="text-left py-3 px-4">{t('sku.name')}</th>
                          <th className="text-right py-3 px-4">{t('reports.inventory.totalOutbound')}</th>
                          <th className="text-right py-3 px-4">{t('reports.inventory.turnoverRate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bySku.slice(0, 10).map((sku) => (
                          <tr key={sku.skuId} className="border-b last:border-0">
                            <td className="py-3 px-4">{sku.skuCode}</td>
                            <td className="py-3 px-4">{sku.skuName}</td>
                            <td className="text-right py-3 px-4">{sku.totalOutbound}</td>
                            <td className="text-right py-3 px-4">{sku.turnoverRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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
