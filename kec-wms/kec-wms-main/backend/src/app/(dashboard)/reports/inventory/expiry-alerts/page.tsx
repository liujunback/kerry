'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReportCard, BarChart, ExportButton } from '@/components/reports'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface ExpiryData {
  summary: {
    expired: number
    expiring7Days: number
    expiring30Days: number
    expiring90Days: number
  }
  distribution: Array<{
    range: string
    quantity: number
  }>
  items: Array<{
    skuCode: string
    skuName: string
    batchNumber: string | null
    expiryDate: string
    daysToExpiry: number
    quantity: number
    location: string
    warehouse: string
  }>
}

export default function ExpiryAlertsPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }, { label: t('inventory.title'), href: '/reports/inventory' }],
    module: { label: t('inventory.expiryAlerts.title'), href: '/reports/inventory/expiry-alerts' },
  })

  const [data, setData] = useState<ExpiryData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    const res = await fetch(`/api/v1/reports/inventory/expiry-alerts?${params}`)
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

  const getExpiryBadge = (daysToExpiry: number) => {
    if (daysToExpiry < 0) {
      return <Badge variant="destructive">{t('inventory.expiryAlerts.expired')}</Badge>
    } else if (daysToExpiry <= 7) {
      return <Badge className="bg-red-500">{daysToExpiry} {t('inventory.agingAnalysis.days')}</Badge>
    } else if (daysToExpiry <= 30) {
      return <Badge className="bg-orange-500">{daysToExpiry} {t('inventory.agingAnalysis.days')}</Badge>
    } else {
      return <Badge className="bg-yellow-500">{daysToExpiry} {t('inventory.agingAnalysis.days')}</Badge>
    }
  }

  const chartData = data ? [
    { name: t('inventory.expiryAlerts.expired'), quantity: data.summary.expired },
    { name: t('inventory.expiryAlerts.expiring7days'), quantity: data.summary.expiring7Days },
    { name: t('inventory.expiryAlerts.expiring30days'), quantity: data.summary.expiring30Days },
    { name: t('inventory.expiryAlerts.expiring90days'), quantity: data.summary.expiring90Days },
  ] : []

  const exportColumns = [
    { key: 'skuCode', header: 'SKU' },
    { key: 'skuName', header: 'Name' },
    { key: 'batchNumber', header: 'Batch' },
    { key: 'expiryDate', header: 'Expiry Date' },
    { key: 'daysToExpiry', header: 'Days to Expiry' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'location', header: 'Location' },
    { key: 'warehouse', header: 'Warehouse' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('inventory.expiryAlerts.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <ExportButton
            data={data?.items || []}
            filename="expiry-alerts"
            columns={exportColumns}
            disabled={loading}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReportCard
              title={t('inventory.expiryAlerts.expired')}
              value={data.summary.expired}
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            />
            <ReportCard
              title={t('inventory.expiryAlerts.expiring7days')}
              value={data.summary.expiring7Days}
              icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
            />
            <ReportCard
              title={t('inventory.expiryAlerts.expiring30days')}
              value={data.summary.expiring30Days}
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
            />
            <ReportCard
              title={t('inventory.expiryAlerts.expiring90days')}
              value={data.summary.expiring90Days}
              icon={<Clock className="h-4 w-4 text-blue-500" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BarChart
              title={t('inventory.expiryAlerts.expiryDistribution')}
              data={chartData}
              xKey="name"
              bars={[
                { key: 'quantity', name: t('inventory.stockLevels.totalQuantity'), color: '#ef4444' },
              ]}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('inventory.expiryAlerts.expiryList')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[350px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>{t('inventory.expiryAlerts.expiryDistribution')}</TableHead>
                        <TableHead className="text-right">{t('inventory.stockLevels.totalQuantity')}</TableHead>
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
                              <div className="text-sm text-muted-foreground">{item.batchNumber}</div>
                            </TableCell>
                            <TableCell>
                              <div>{item.expiryDate}</div>
                              {getExpiryBadge(item.daysToExpiry)}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
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
