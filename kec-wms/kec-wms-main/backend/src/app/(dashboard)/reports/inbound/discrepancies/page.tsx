'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, TrendingDown, Percent } from 'lucide-react'
import { subDays } from '@/lib/utils/date-formatter'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ReportCard,
  PieChart,
  BarChart,
  DateRangePicker,
  ExportButton,
  MultiDimensionFilter,
} from '@/components/reports'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface DiscrepancyData {
  summary: {
    totalDiscrepancies: number
    discrepanciesTrend: number
    totalVariance: number
    discrepancyRate: number
  }
  byType: Array<{
    type: string
    count: number
    variance: number
  }>
  byWarehouse: Array<{
    warehouse: string
    warehouseId: string
    count: number
    variance: number
  }>
  items: Array<{
    asnNumber: string
    skuCode: string
    skuName: string
    type: string
    expectedQty: number
    actualQty: number
    varianceQty: number
    status: string
  }>
}

const TYPE_COLORS: Record<string, string> = {
  SHORTAGE: '#ef4444',
  OVERAGE: '#22c55e',
  DAMAGE: '#f59e0b',
  WRONG_SKU: '#8b5cf6',
  QUALITY_ISSUE: '#ec4899',
  OTHER: '#6b7280',
}

export default function DiscrepanciesPage() {
  const t = useTranslations('reports')
  const tDiscrepancy = useTranslations('discrepancy')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }, { label: t('inbound.title'), href: '/reports/inbound' }],
    module: { label: t('inbound.discrepancies.title'), href: '/reports/inbound/discrepancies' },
  })

  const [data, setData] = useState<DiscrepancyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoneId, setZoneId] = useState<string>('')
  const [clientId, setClientId] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (zoneId) params.set('zoneId', zoneId)
    if (clientId) params.set('clientId', clientId)
    if (startDate) params.set('startDate', startDate.toISOString())
    if (endDate) params.set('endDate', endDate.toISOString())

    const res = await fetch(`/api/v1/reports/inbound/discrepancies?${params}`)
    const result = await res.json()
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }, [zoneId, clientId, startDate, endDate])

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

  const pieData = data?.byType.map((item) => ({
    name: tDiscrepancy(`types.${item.type}`) || item.type,
    value: item.count,
    color: TYPE_COLORS[item.type] || '#6b7280',
  })) || []

  const exportItemColumns = [
    { key: 'asnNumber', header: 'ASN' },
    { key: 'skuCode', header: 'SKU' },
    { key: 'type', header: 'Type' },
    { key: 'expectedQty', header: 'Expected' },
    { key: 'actualQty', header: 'Actual' },
    { key: 'varianceQty', header: 'Variance' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('inbound.discrepancies.description')}</p>
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
          <ExportButton
            data={data?.items || []}
            filename="discrepancies"
            columns={exportItemColumns}
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
              title={t('inbound.discrepancies.totalDiscrepancies')}
              value={data.summary.totalDiscrepancies}
              trend={data.summary.discrepanciesTrend ? {
                value: Math.abs(data.summary.discrepanciesTrend),
                isPositive: data.summary.discrepanciesTrend >= 0
              } : undefined}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inbound.discrepancies.discrepancyRate')}
              value={`${data.summary.discrepancyRate}%`}
              icon={<Percent className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inbound.discrepancies.totalVariance')}
              value={data.summary.totalVariance}
              icon={<TrendingDown className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PieChart
              title={t('inbound.discrepancies.byType')}
              data={pieData}
              height={350}
            />

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">{t('inbound.discrepancies.discrepancyList')}</TabsTrigger>
                <TabsTrigger value="byWarehouse">{t('inventory.stockLevels.byWarehouse')}</TabsTrigger>
              </TabsList>
              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('inbound.discrepancies.discrepancyList')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[350px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>{tDiscrepancy('type')}</TableHead>
                            <TableHead className="text-right">{tDiscrepancy('varianceQty')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                {t('noData')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            data.items.slice(0, 10).map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <div className="font-medium">{item.skuCode}</div>
                                  <div className="text-sm text-muted-foreground">{item.asnNumber}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    style={{ backgroundColor: TYPE_COLORS[item.type] || '#6b7280' }}
                                    className="text-white"
                                  >
                                    {tDiscrepancy(`types.${item.type}`) || item.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {item.varianceQty > 0 ? '+' : ''}{item.varianceQty}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="byWarehouse">
                <BarChart
                  title={t('inventory.stockLevels.byWarehouse')}
                  data={data.byWarehouse}
                  xKey="warehouse"
                  bars={[
                    { key: 'count', name: t('inbound.discrepancies.totalDiscrepancies'), color: '#ef4444' },
                    { key: 'variance', name: t('inbound.discrepancies.totalVariance'), color: '#f59e0b' },
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
