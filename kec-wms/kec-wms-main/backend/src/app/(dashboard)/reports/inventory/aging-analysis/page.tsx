'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Package, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReportCard, PieChart, ExportButton } from '@/components/reports'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface AgingData {
  summary: {
    totalItems: number
    averageAge: number
    maxAgingDays: number
  }
  buckets: Array<{
    range: string
    quantity: number
    percentage: number
  }>
  topAgingItems: Array<{
    skuCode: string
    skuName: string
    agingDays: number
    quantity: number
    location: string
  }>
}

const COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444']

export default function AgingAnalysisPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }, { label: t('inventory.title'), href: '/reports/inventory' }],
    module: { label: t('inventory.agingAnalysis.title'), href: '/reports/inventory/aging-analysis' },
  })

  const [data, setData] = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    const res = await fetch(`/api/v1/reports/inventory/aging-analysis?${params}`)
    const result = await res.json()
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    startTransition(() => {
      fetchData()
    })
  }, [fetchData])

  const getRangeLabel = (range: string) => {
    const labels: Record<string, string> = {
      '0-30': t('inventory.agingAnalysis.range0to30'),
      '31-60': t('inventory.agingAnalysis.range31to60'),
      '61-90': t('inventory.agingAnalysis.range61to90'),
      '90+': t('inventory.agingAnalysis.range90plus'),
    }
    return labels[range] || range
  }

  const pieData = data?.buckets.map((bucket, index) => ({
    name: getRangeLabel(bucket.range),
    value: bucket.quantity,
    color: COLORS[index],
  })) || []

  const exportColumns = [
    { key: 'skuCode', header: 'SKU' },
    { key: 'skuName', header: t('inventory.agingAnalysis.title') },
    { key: 'agingDays', header: t('inventory.agingAnalysis.days') },
    { key: 'quantity', header: t('inventory.stockLevels.totalQuantity') },
    { key: 'location', header: 'Location' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('inventory.agingAnalysis.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <ExportButton
            data={data?.topAgingItems || []}
            filename="aging-analysis"
            columns={exportColumns}
            disabled={loading}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <ReportCard
              title={t('inventory.agingAnalysis.averageAge')}
              value={`${data.summary.averageAge} ${t('inventory.agingAnalysis.days')}`}
              icon={<Clock className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inventory.stockLevels.totalSku')}
              value={data.summary.totalItems}
              icon={<Package className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inventory.agingAnalysis.range90plus')}
              value={data.buckets.find(b => b.range === '90+')?.quantity || 0}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PieChart
              title={t('inventory.agingAnalysis.agingDistribution')}
              data={pieData}
              height={350}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('inventory.agingAnalysis.topAgingItems')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">{t('inventory.agingAnalysis.days')}</TableHead>
                      <TableHead className="text-right">{t('inventory.stockLevels.totalQuantity')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topAgingItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {t('noData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.topAgingItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{item.skuCode}</div>
                            <div className="text-sm text-muted-foreground">{item.skuName}</div>
                          </TableCell>
                          <TableCell className="text-right">{item.agingDays}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
      )}
    </div>
  )
}
