'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Package, Archive, Lock, Snowflake, MapPin } from 'lucide-react'
import { ReportCard, BarChart, ExportButton, MultiDimensionFilter } from '@/components/reports'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface StockData {
  summary: {
    totalSku: number
    totalQuantity: number
    available: number
    reserved: number
    frozen: number
  }
  byWarehouse: Array<{
    warehouseId: string
    warehouseName: string
    warehouseCode: string
    available: number
    reserved: number
    frozen: number
    total: number
    skuCount: number
  }>
  byZone: Array<{
    zoneId: string
    zoneName: string
    zoneCode: string
    available: number
    reserved: number
    frozen: number
    total: number
    skuCount: number
  }>
  byClient: Array<{
    clientId: string
    clientName: string
    clientCode: string
    available: number
    reserved: number
    frozen: number
    total: number
    skuCount: number
  }>
}

export default function StockLevelsPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }, { label: t('inventory.title'), href: '/reports/inventory' }],
    module: { label: t('inventory.stockLevels.title'), href: '/reports/inventory/stock-levels' },
  })

  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoneId, setZoneId] = useState<string>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (zoneId && zoneId !== 'all') {
      params.set('zoneId', zoneId)
    }
    const res = await fetch(`/api/v1/reports/inventory/stock-levels?${params}`)
    const result = await res.json()
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }, [zoneId])

  useEffect(() => {
    startTransition(() => {
      fetchData()
    })
  }, [fetchData])

  const exportColumns = [
    { key: 'warehouseName', header: t('inventory.stockLevels.byWarehouse') },
    { key: 'available', header: t('inventory.stockLevels.available') },
    { key: 'reserved', header: t('inventory.stockLevels.reserved') },
    { key: 'frozen', header: t('inventory.stockLevels.frozen') },
    { key: 'total', header: t('inventory.stockLevels.totalQuantity') },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('inventory.stockLevels.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <MultiDimensionFilter
            zoneId={zoneId}
            onZoneChange={setZoneId}
            showZone={true}
          />
          <ExportButton
            data={data?.byWarehouse || []}
            filename="stock-levels"
            columns={exportColumns}
            disabled={loading}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <ReportCard
              title={t('inventory.stockLevels.totalSku')}
              value={data.summary.totalSku}
              icon={<Package className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inventory.stockLevels.totalQuantity')}
              value={data.summary.totalQuantity}
              icon={<MapPin className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inventory.stockLevels.available')}
              value={data.summary.available}
              icon={<Archive className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inventory.stockLevels.reserved')}
              value={data.summary.reserved}
              icon={<Lock className="h-4 w-4" />}
            />
            <ReportCard
              title={t('inventory.stockLevels.frozen')}
              value={data.summary.frozen}
              icon={<Snowflake className="h-4 w-4" />}
            />
          </div>

          <Tabs defaultValue="warehouse" className="w-full">
            <TabsList>
              <TabsTrigger value="warehouse">{t('inventory.stockLevels.byWarehouse')}</TabsTrigger>
              <TabsTrigger value="zone">{t('inventory.stockLevels.byZone')}</TabsTrigger>
              <TabsTrigger value="client">{t('inventory.stockLevels.byClient')}</TabsTrigger>
            </TabsList>
            <TabsContent value="warehouse" className="space-y-4">
              <BarChart
                title={t('inventory.stockLevels.byWarehouse')}
                data={data.byWarehouse}
                xKey="warehouseName"
                bars={[
                  { key: 'available', name: t('inventory.stockLevels.available'), color: '#22c55e' },
                  { key: 'reserved', name: t('inventory.stockLevels.reserved'), color: '#f59e0b' },
                  { key: 'frozen', name: t('inventory.stockLevels.frozen'), color: '#3b82f6' },
                ]}
                height={400}
              />
            </TabsContent>
            <TabsContent value="zone" className="space-y-4">
              <BarChart
                title={t('inventory.stockLevels.byZone')}
                data={data.byZone}
                xKey="zoneName"
                bars={[
                  { key: 'available', name: t('inventory.stockLevels.available'), color: '#22c55e' },
                  { key: 'reserved', name: t('inventory.stockLevels.reserved'), color: '#f59e0b' },
                  { key: 'frozen', name: t('inventory.stockLevels.frozen'), color: '#3b82f6' },
                ]}
                height={400}
              />
            </TabsContent>
            <TabsContent value="client" className="space-y-4">
              <BarChart
                title={t('inventory.stockLevels.byClient')}
                data={data.byClient}
                xKey="clientName"
                bars={[
                  { key: 'available', name: t('inventory.stockLevels.available'), color: '#22c55e' },
                  { key: 'reserved', name: t('inventory.stockLevels.reserved'), color: '#f59e0b' },
                  { key: 'frozen', name: t('inventory.stockLevels.frozen'), color: '#3b82f6' },
                ]}
                height={400}
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
