'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, startTransition, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Boxes, ClipboardList, Loader2, PackageCheck, Percent, RefreshCw, Truck, Warehouse } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateTime, subDays } from '@/lib/utils/date-formatter'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangePicker, MultiDimensionFilter, ReportCard } from '@/components/reports'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

type DashboardType = 'inbound' | 'outbound'
type ChartRow = Record<string, string | number>

interface InboundDashboardData {
  summary: {
    todayAsn: number
    todayReceivedQty: number
    pendingSignIn: number
    receivingInProgress: number
    putawayInProgress: number
    discrepancyCount: number
    totalAsn: number
    totalExpectedQty: number
    totalReceivedQty: number
    totalPutawayQty: number
    inTransitPieces: number
    inTransitVolumeCbm: number
    arrivedPieces: number
    arrivedVolumeCbm: number
    pendingPutawayPieces: number
    pendingPutawayVolumeCbm: number
    putawayCompletionRate: number
  }
  trend: Array<{ date: string; asnCount: number; expectedQty: number; receivedQty: number; putawayQty: number }>
  byStatus: Array<{ status: string; count: number }>
  byWarehouse: Array<{ warehouseId: string; warehouse: string; asnCount: number; expectedQty: number; receivedQty: number }>
  byClient: Array<{ clientId: string; client: string; asnCount: number; expectedQty: number; receivedQty: number }>
  stageDistribution: Array<{ stage: string; stageName: string; asnCount: number; pieces: number; volumeCbm: number; color: string }>
  recentAsns: Array<{
    id: string
    asnNumber: string
    status: string
    expectedPutawayDate: string | null
    createdAt: string
    totalExpectedQty: number
    totalReceivedQty: number
    totalPutawayQty: number
    client: { clientName: string }
    warehouse: { warehouseName: string }
  }>
}

interface OutboundDashboardData {
  summary: {
    todayOrders: number
    todayShipped: number
    pendingAllocation: number
    pendingWave: number
    pickingInProgress: number
    packingInProgress: number
    pickingExceptionCount: number
    totalOrders: number
    pendingOutbound: number
    delayedOrders: number
    completionRate: number
    totalOrderedQty: number
    totalPickedQty: number
    totalPackedQty: number
    totalShippedQty: number
    totalVolumeCbm: number
    shipmentCount: number
    packageCount: number
  }
  trend: Array<{ date: string; orderCount: number; shippedCount: number }>
  byStatus: Array<{ status: string; count: number }>
  byCarrier: Array<{ carrier: string; shipments: number; packages: number }>
  byClient: Array<{ clientId: string; client: string; orderCount: number; orderedQty: number; pickedQty: number; packedQty: number }>
  stageDistribution: Array<{ stage: string; stageName: string; count: number; pieces: number; percent: number; color: string }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    createdAt: string
    totalOrderedQty: number
    totalPickedQty: number
    totalPackedQty: number
    client: { clientCode: string; clientName: string }
    warehouse: { warehouseName: string }
    timeline: { expectedOutboundTime: string | null } | null
    extension: { channel: string | null } | null
  }>
}

type DashboardData = InboundDashboardData | OutboundDashboardData

const STATUS_COLORS = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04', '#4b5563']

function isInboundData(data: DashboardData | null): data is InboundDashboardData {
  return !!data && 'recentAsns' in data
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function DashboardBarChart({
  title,
  data,
  dataKey,
  name,
  color,
}: {
  title: string
  data: ChartRow[]
  dataKey: string
  name: string
  color: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)} />
            <Legend />
            <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function StatusPieChart({ title, data }: { title: string; data: Array<{ name: string; value: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function CompletionCard({ title, value, description }: { title: string; value: number; description: string }) {
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="relative h-36 w-36">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="fill-none stroke-primary"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{formatNumber(value, 2)}%</span>
            <span className="text-xs text-muted-foreground">pcs</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OperationsDashboard({ type }: { type: DashboardType }) {
  const t = useTranslations('dashboard.operations')
  const tAsn = useTranslations('asn')
  const tOrder = useTranslations('outbound.order')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientCode, setClientCode] = useState('')
  const [channel, setChannel] = useState('')
  const [timeType, setTimeType] = useState<'createdAt' | 'expectedOutboundTime'>('createdAt')
  const [startDate, setStartDate] = useState<Date | null>(() => subDays(new Date(), 6))
  const [endDate, setEndDate] = useState<Date | null>(() => new Date())
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.dashboards'), href: '/dashboard' }],
    module: { label: t(`${type}.title`) },
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate.toISOString())
      if (endDate) params.set('endDate', endDate.toISOString())
      if (type === 'inbound' && clientId) params.set('clientId', clientId)
      if (type === 'outbound') {
        params.set('timeType', timeType)
        if (clientCode.trim()) params.set('clientCode', clientCode.trim())
        if (channel.trim()) params.set('channel', channel.trim())
      }

      const response = await fetch(`/api/v1/reports/dashboard/${type}?${params.toString()}`)
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('loadFailed'))
      }

      startTransition(() => setData(result.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [channel, clientCode, clientId, endDate, startDate, t, timeType, type])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchData()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [fetchData])

  const statusData = useMemo(() => data?.byStatus.map((item) => ({
    name: isInboundData(data)
      ? tAsn(`statuses.${item.status}`, { defaultValue: item.status })
      : tOrder(`statuses.${item.status}`, { defaultValue: item.status }),
    value: item.count,
  })) || [], [data, tAsn, tOrder])

  const getInboundStageLabel = useCallback((stage: string, fallback?: string) => {
    try {
      return t(`inbound.stageNames.${stage}`)
    } catch {
      return fallback || stage
    }
  }, [t])

  const getOutboundStageLabel = useCallback((stage: string, fallback?: string) => {
    try {
      return t(`outbound.stageNames.${stage}`)
    } catch {
      return fallback || stage
    }
  }, [t])

  const cardItems = useMemo(() => {
    if (!data) return []
    if (isInboundData(data)) {
      return [
        { title: t('inbound.inTransitPieces'), value: data.summary.inTransitPieces, description: `${formatNumber(data.summary.inTransitVolumeCbm, 3)} CBM`, icon: <Truck className="h-4 w-4" /> },
        { title: t('inbound.arrivedPieces'), value: data.summary.arrivedPieces, description: `${formatNumber(data.summary.arrivedVolumeCbm, 3)} CBM`, icon: <PackageCheck className="h-4 w-4" /> },
        { title: t('inbound.pendingPutawayPieces'), value: data.summary.pendingPutawayPieces, description: `${formatNumber(data.summary.pendingPutawayVolumeCbm, 3)} CBM`, icon: <Warehouse className="h-4 w-4" /> },
        { title: t('inbound.discrepancyCount'), value: data.summary.discrepancyCount, icon: <AlertTriangle className="h-4 w-4" /> },
        { title: t('inbound.todayAsn'), value: data.summary.todayAsn, icon: <ClipboardList className="h-4 w-4" /> },
        { title: t('inbound.todayReceivedQty'), value: data.summary.todayReceivedQty, icon: <Boxes className="h-4 w-4" /> },
      ]
    }

    return [
      { title: t('outbound.totalOrders'), value: data.summary.totalOrders, icon: <ClipboardList className="h-4 w-4" /> },
      { title: t('outbound.pendingOutbound'), value: data.summary.pendingOutbound, icon: <Boxes className="h-4 w-4" /> },
      { title: t('outbound.delayedOrders'), value: data.summary.delayedOrders, icon: <AlertTriangle className="h-4 w-4" /> },
      { title: t('outbound.completionRate'), value: `${formatNumber(data.summary.completionRate, 2)}%`, icon: <Percent className="h-4 w-4" /> },
      { title: t('outbound.totalOrderedQty'), value: data.summary.totalOrderedQty, icon: <PackageCheck className="h-4 w-4" /> },
      { title: t('outbound.shipmentCount'), value: data.summary.shipmentCount, description: t('outbound.packageCount', { count: data.summary.packageCount }), icon: <Truck className="h-4 w-4" /> },
    ]
  }, [data, t])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{t(`${type}.title`)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(`${type}.description`)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href={`/dashboard/${type}/timeout`}>{t(`${type}.timeoutLink`)}</Link>
          </Button>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
          <Button variant="outline" onClick={() => void fetchData()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {type === 'inbound' ? (
        <MultiDimensionFilter showClient clientId={clientId} onClientChange={setClientId} />
      ) : (
        <Card>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>{t('filters.clientCode')}</Label>
              <Input value={clientCode} onChange={(event) => setClientCode(event.target.value)} placeholder={t('filters.clientCodePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('filters.timeType')}</Label>
              <Select value={timeType} onValueChange={(value) => setTimeType(value as typeof timeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">{t('filters.createdAt')}</SelectItem>
                  <SelectItem value="expectedOutboundTime">{t('filters.expectedOutboundTime')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t('filters.channel')}</Label>
              <Input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder={t('filters.channelPlaceholder')} />
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex h-64 items-center justify-center rounded-lg border bg-card text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('loading')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cardItems.map((item: { title: string; value: string | number; description?: string; icon: ReactNode }) => (
              <ReportCard key={item.title} title={item.title} value={item.value} description={item.description} icon={item.icon} />
            ))}
          </div>

          {isInboundData(data) ? (
            <InboundDashboardContent data={data} statusData={statusData} />
          ) : (
            <OutboundDashboardContent data={data} statusData={statusData} />
          )}
        </>
      )}
    </div>
  )

  function InboundDashboardContent({
    data: inboundData,
    statusData,
  }: {
    data: InboundDashboardData
    statusData: Array<{ name: string; value: number }>
  }) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <CompletionCard
            title={t('inbound.putawayCompletionRate')}
            value={inboundData.summary.putawayCompletionRate}
            description={t('inbound.putawayCompletionRateDesc')}
          />
          <DashboardBarChart
            title={t('inbound.putawayTrend')}
            data={inboundData.trend as ChartRow[]}
            dataKey="putawayQty"
            name={t('inbound.putawayQty')}
            color="#10b981"
          />
          {statusData.length > 0 ? <StatusPieChart title={t('statusDistribution')} data={statusData} /> : <EmptyCard title={t('statusDistribution')} />}
        </div>
        <StageDistributionTable data={inboundData.stageDistribution} />
        <RecentInboundTable data={inboundData} />
      </div>
    )
  }

  function OutboundDashboardContent({
    data: outboundData,
    statusData,
  }: {
    data: OutboundDashboardData
    statusData: Array<{ name: string; value: number }>
  }) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardBarChart
            title={t('outbound.shippingTrend')}
            data={outboundData.trend as ChartRow[]}
            dataKey="shippedCount"
            name={t('outbound.shippedCount')}
            color="#2563eb"
          />
          {statusData.length > 0 ? <StatusPieChart title={t('statusDistribution')} data={statusData} /> : <EmptyCard title={t('statusDistribution')} />}
        </div>
        <OutboundStageTable data={outboundData.stageDistribution} />
        <RecentOutboundTable data={outboundData} />
      </div>
    )
  }

  function EmptyCard({ title }: { title: string }) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{t('noData')}</CardContent>
      </Card>
    )
  }

  function StageDistributionTable({ data }: { data: InboundDashboardData['stageDistribution'] }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('inbound.stageDistribution')}</CardTitle>
          <CardDescription>{t('inbound.stageDistributionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.stage')}</TableHead>
                <TableHead className="text-right">{t('columns.asnCount')}</TableHead>
                <TableHead className="text-right">{t('columns.pieces')}</TableHead>
                <TableHead className="text-right">CBM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.stage}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {getInboundStageLabel(item.stage, item.stageName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.asnCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.pieces.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.volumeCbm, 3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  function OutboundStageTable({ data }: { data: OutboundDashboardData['stageDistribution'] }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('outbound.stageDistribution')}</CardTitle>
          <CardDescription>{t('outbound.stageDistributionDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.map((item) => (
            <div key={item.stage} className="grid gap-2 md:grid-cols-[160px_1fr_90px] md:items-center">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{getOutboundStageLabel(item.stage, item.stageName)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full" style={{ width: `${Math.min(item.percent, 100)}%`, backgroundColor: item.color }} />
              </div>
              <div className="text-right text-sm font-medium">{item.count.toLocaleString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  function RecentInboundTable({ data: inboundData }: { data: InboundDashboardData }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('inbound.recentAsns')}</CardTitle>
          <CardDescription>{t('inbound.recentAsnsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {inboundData.recentAsns.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.number')}</TableHead>
                  <TableHead>{t('columns.client')}</TableHead>
                  <TableHead>{t('columns.warehouse')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead className="text-right">{t('columns.expectedQty')}</TableHead>
                  <TableHead className="text-right">{t('columns.receivedQty')}</TableHead>
                  <TableHead className="text-right">{t('columns.putawayQty')}</TableHead>
                  <TableHead>{t('columns.expectedPutawayDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboundData.recentAsns.map((asn) => (
                  <TableRow key={asn.id}>
                    <TableCell><Link href={`/asn/${asn.id}`} className="font-medium text-primary hover:underline">{asn.asnNumber}</Link></TableCell>
                    <TableCell>{asn.client.clientName}</TableCell>
                    <TableCell>{asn.warehouse.warehouseName}</TableCell>
                    <TableCell><Badge variant="outline">{tAsn(`statuses.${asn.status}`, { defaultValue: asn.status })}</Badge></TableCell>
                    <TableCell className="text-right">{asn.totalExpectedQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{asn.totalReceivedQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{asn.totalPutawayQty.toLocaleString()}</TableCell>
                    <TableCell>{formatDateTime(asn.expectedPutawayDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    )
  }

  function RecentOutboundTable({ data: outboundData }: { data: OutboundDashboardData }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('outbound.recentOrders')}</CardTitle>
          <CardDescription>{t('outbound.recentOrdersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {outboundData.recentOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.number')}</TableHead>
                  <TableHead>{t('columns.client')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.channel')}</TableHead>
                  <TableHead className="text-right">{t('columns.orderedQty')}</TableHead>
                  <TableHead className="text-right">{t('columns.pickedQty')}</TableHead>
                  <TableHead className="text-right">{t('columns.packedQty')}</TableHead>
                  <TableHead>{t('columns.expectedOutboundTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outboundData.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell><Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.orderNumber}</Link></TableCell>
                    <TableCell>{order.client.clientCode} / {order.client.clientName}</TableCell>
                    <TableCell><Badge variant="outline">{tOrder(`statuses.${order.status}`, { defaultValue: order.status })}</Badge></TableCell>
                    <TableCell>{order.extension?.channel || '-'}</TableCell>
                    <TableCell className="text-right">{order.totalOrderedQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{order.totalPickedQty.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{order.totalPackedQty.toLocaleString()}</TableCell>
                    <TableCell>{formatDateTime(order.timeline?.expectedOutboundTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    )
  }
}
