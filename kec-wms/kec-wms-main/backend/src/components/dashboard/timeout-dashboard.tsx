'use client'

import Link from 'next/link'
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Boxes, Loader2, RefreshCw, Search } from 'lucide-react'
import { formatDateTime, subDays } from '@/lib/utils/date-formatter'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker, MultiDimensionFilter, ReportCard } from '@/components/reports'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

type TimeoutType = 'inbound' | 'outbound'
type Metric = 'OC' | 'PCS' | 'PPO'
const OUTBOUND_TIMEOUT_STATUS_ORDER = [
  'MATCH_FAILED',
  'NUMBER_CHANGE_EXCEPTION',
  'OUTBOUND_EXCEPTION',
  'PENDING',
  'ALLOCATED',
  'PENDING_WAVE',
  'IN_WAVE',
  'WAVED',
  'PICKING',
  'PICKED',
  'SORTING',
  'SORTED',
  'PACKING',
  'PACKED',
  'READY_SHIP',
] as const

interface InboundTimeoutCell {
  ic: number
  pcs: number
  cbm: number
  timeoutIc: number
  isTimeout: boolean
}

interface InboundTimeoutData {
  dates: string[]
  rows: Array<{
    status: string
    statusName: string
    cells: Record<string, InboundTimeoutCell>
    total: { ic: number; pcs: number; cbm: number; timeoutIc: number }
  }>
  summary: { totalIc: number; totalPcs: number; totalCbm: number; timeoutIc: number }
  lastUpdatedAt: string
}

interface OutboundTimeoutCell {
  oc: number
  pcs: number
  ppo: number
  avgTimeoutHours: number
  value: number
}

interface OutboundTimeoutData {
  dates: string[]
  buckets: string[]
  metric: Metric
  rows: Array<{
    status: string
    statusName: string
    cells: Record<string, Record<string, OutboundTimeoutCell>>
    total: { oc: number; pcs: number; ppo: number; value: number }
  }>
  summary: { totalOrders: number; totalPieces: number; ppo: number }
  lastUpdatedAt: string
}

type TimeoutData = InboundTimeoutData | OutboundTimeoutData

interface DetailsState {
  open: boolean
  title: string
  params: URLSearchParams
  page: number
}

interface DetailPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type DetailItem = Record<string, string | number | boolean | null>

function isInboundData(data: TimeoutData | null): data is InboundTimeoutData {
  return !!data && 'totalIc' in data.summary
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function metricLabel(metric: Metric, t: ReturnType<typeof useTranslations>) {
  if (metric === 'PCS') return t('timeout.metricPcs')
  if (metric === 'PPO') return t('timeout.metricPpo')
  return t('timeout.metricOc')
}

export function TimeoutDashboard({ type }: { type: TimeoutType }) {
  const t = useTranslations('dashboard.operations')
  const tAsn = useTranslations('asn')
  const tOrder = useTranslations('outbound.order')
  const [data, setData] = useState<TimeoutData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [asnType, setAsnType] = useState('')
  const [clientCode, setClientCode] = useState('')
  const [channel, setChannel] = useState('')
  const [metric, setMetric] = useState<Metric>('OC')
  const [startDate, setStartDate] = useState<Date | null>(() => subDays(new Date(), 6))
  const [endDate, setEndDate] = useState<Date | null>(() => new Date())
  const [details, setDetails] = useState<DetailsState>({ open: false, title: '', params: new URLSearchParams(), page: 1 })
  const [detailItems, setDetailItems] = useState<DetailItem[]>([])
  const [detailPagination, setDetailPagination] = useState<DetailPagination | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const breadcrumb = createBreadcrumbFactory({
    parents: [
      { label: t('breadcrumbs.dashboards'), href: '/dashboard' },
      { label: t(`${type}.title`), href: `/dashboard/${type}` },
    ],
    module: { label: t(`${type}.timeoutTitle`) },
  })

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate.toISOString())
    if (endDate) params.set('endDate', endDate.toISOString())
    if (type === 'inbound') {
      if (clientId) params.set('clientId', clientId)
      if (asnType) params.set('asnTypes', asnType)
    } else {
      params.set('metric', metric)
      if (clientCode.trim()) params.set('clientCode', clientCode.trim())
      if (channel.trim()) params.set('channel', channel.trim())
    }
    return params
  }, [asnType, channel, clientCode, clientId, endDate, metric, startDate, type])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/reports/dashboard/${type}/timeout?${buildParams().toString()}`)
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
  }, [buildParams, t, type])

  const fetchDetails = useCallback(async (state: DetailsState) => {
    setDetailsLoading(true)

    try {
      const params = new URLSearchParams(state.params)
      params.set('page', String(state.page))
      params.set('pageSize', '20')
      const response = await fetch(`/api/v1/reports/dashboard/${type}/timeout/details?${params.toString()}`)
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('loadFailed'))
      }

      setDetailItems(result.data.items)
      setDetailPagination(result.data.pagination)
    } catch {
      setDetailItems([])
      setDetailPagination(null)
    } finally {
      setDetailsLoading(false)
    }
  }, [t, type])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchData()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [fetchData])

  useEffect(() => {
    if (!details.open) return
    void fetchDetails(details)
  }, [details, fetchDetails])

  const summaryCards = useMemo(() => {
    if (!data) return []
    if (isInboundData(data)) {
      return [
        { title: t('timeout.totalIc'), value: data.summary.totalIc, icon: <Boxes className="h-4 w-4" /> },
        { title: t('timeout.timeoutIc'), value: data.summary.timeoutIc, icon: <AlertTriangle className="h-4 w-4" /> },
        { title: t('timeout.totalPcs'), value: data.summary.totalPcs, icon: <Boxes className="h-4 w-4" /> },
        { title: 'CBM', value: formatNumber(data.summary.totalCbm, 3), icon: <Boxes className="h-4 w-4" /> },
      ]
    }

    return [
      { title: t('timeout.totalOrders'), value: data.summary.totalOrders, icon: <Boxes className="h-4 w-4" /> },
      { title: t('timeout.totalPieces'), value: data.summary.totalPieces, icon: <Boxes className="h-4 w-4" /> },
      { title: t('timeout.ppo'), value: formatNumber(data.summary.ppo, 2), icon: <Boxes className="h-4 w-4" /> },
      { title: t('timeout.currentMetric'), value: metricLabel(data.metric, t), icon: <Search className="h-4 w-4" /> },
    ]
  }, [data, t])

  const getOutboundTimeoutStatusLabel = useCallback((status: string) => {
    if (status === 'MATCH_FAILED' || status === 'NUMBER_CHANGE_EXCEPTION' || status === 'OUTBOUND_EXCEPTION') {
      return t(`timeout.statuses.${status}`)
    }
    try {
      return tOrder(`statuses.${status}`)
    } catch {
      return status
    }
  }, [t, tOrder])

  const getInboundTimeoutStatusLabel = useCallback((status: string) => {
    try {
      return t(`timeout.inboundStatuses.${status}`)
    } catch {
      return status
    }
  }, [t])

  const getInboundDetailStatusLabel = useCallback((status: string, statusGroup?: string) => {
    try {
      return tAsn(`statuses.${status}`)
    } catch {
      return statusGroup ? getInboundTimeoutStatusLabel(statusGroup) : status
    }
  }, [getInboundTimeoutStatusLabel, tAsn])

  const openInboundDetails = (date: string, rowStatus: string) => {
    const params = new URLSearchParams()
    params.set('date', date)
    params.set('status', rowStatus)
    if (clientId) params.set('clientId', clientId)
    if (asnType) params.set('asnType', asnType)
    setDetails({ open: true, title: `${getInboundTimeoutStatusLabel(rowStatus)} / ${date}`, params, page: 1 })
  }

  const openOutboundDetails = (date: string, status: string, bucket: string) => {
    const params = new URLSearchParams()
    params.set('date', date)
    params.set('status', status)
    params.set('bucket', bucket)
    if (clientCode.trim()) params.set('clientCode', clientCode.trim())
    if (channel.trim()) params.set('channel', channel.trim())
    setDetails({ open: true, title: `${getOutboundTimeoutStatusLabel(status)} / ${date} / ${bucket}`, params, page: 1 })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{t(`${type}.timeoutTitle`)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(`${type}.timeoutDescription`)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href={`/dashboard/${type}`}>{t('timeout.backToNormal')}</Link>
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
        <Card>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            <MultiDimensionFilter showClient clientId={clientId} onClientChange={setClientId} />
            <div className="space-y-1.5">
              <Label>{t('filters.asnType')}</Label>
              <Select value={asnType || '__all__'} onValueChange={(value) => setAsnType(value === '__all__' ? '' : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('filters.allAsnTypes')}</SelectItem>
                  <SelectItem value="NORMAL">NORMAL</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                  <SelectItem value="RETURN">RETURN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>{t('filters.clientCode')}</Label>
              <Input value={clientCode} onChange={(event) => setClientCode(event.target.value)} placeholder={t('filters.clientCodePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('timeout.metric')}</Label>
              <Select value={metric} onValueChange={(value) => setMetric(value as Metric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OC">{t('timeout.metricOc')}</SelectItem>
                  <SelectItem value="PCS">{t('timeout.metricPcs')}</SelectItem>
                  <SelectItem value="PPO">{t('timeout.metricPpo')}</SelectItem>
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <ReportCard key={item.title} title={item.title} value={item.value} icon={item.icon} />
            ))}
          </div>
          {isInboundData(data) ? (
            <InboundTimeoutMatrix
              data={data}
              onOpenDetails={openInboundDetails}
              getStatusLabel={getInboundTimeoutStatusLabel}
            />
          ) : (
            <OutboundTimeoutMatrix data={data} onOpenDetails={openOutboundDetails} />
          )}
        </>
      )}

      <Dialog open={details.open} onOpenChange={(open) => setDetails((current) => ({ ...current, open }))}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{details.title}</DialogTitle>
            <DialogDescription>{t('timeout.detailsDesc')}</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('loading')}
            </div>
          ) : (
            <DetailsTable items={detailItems} />
          )}
          {detailPagination && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('timeout.pagination', { page: detailPagination.page, totalPages: Math.max(detailPagination.totalPages, 1), total: detailPagination.total })}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={detailPagination.page <= 1}
                  onClick={() => setDetails((current) => ({ ...current, page: current.page - 1 }))}
                >
                  {t('timeout.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={detailPagination.page >= detailPagination.totalPages}
                  onClick={() => setDetails((current) => ({ ...current, page: current.page + 1 }))}
                >
                  {t('timeout.next')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  function InboundTimeoutMatrix({
    data,
    onOpenDetails,
    getStatusLabel,
  }: {
    data: InboundTimeoutData
    onOpenDetails: (date: string, status: string) => void
    getStatusLabel: (status: string) => string
  }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('timeout.matrix')}</CardTitle>
          <CardDescription>{t('inbound.timeoutMatrixDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">{t('columns.status')}</TableHead>
                {data.dates.map((date) => <TableHead key={date} className="text-center">{date}</TableHead>)}
                <TableHead className="text-center">{t('timeout.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.status}>
                  <TableCell className="sticky left-0 bg-card font-medium">{getStatusLabel(row.status)}</TableCell>
                  {data.dates.map((date) => {
                    const cell = row.cells[date] || { ic: 0, pcs: 0, cbm: 0, timeoutIc: 0, isTimeout: false }
                    return (
                      <TableCell key={date} className="min-w-[140px] text-center">
                        {cell.ic > 0 ? (
                          <button
                            type="button"
                            className={cell.isTimeout ? 'font-semibold text-destructive hover:underline' : 'font-medium hover:underline'}
                            onClick={() => onOpenDetails(date, row.status)}
                          >
                            <div>IC {cell.ic.toLocaleString()}</div>
                            <div>PCS {cell.pcs.toLocaleString()}</div>
                            <div>CBM {formatNumber(cell.cbm, 3)}</div>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="min-w-[120px] text-center font-semibold">
                    <div>IC {row.total.ic.toLocaleString()}</div>
                    <div>PCS {row.total.pcs.toLocaleString()}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  function OutboundTimeoutMatrix({
    data,
    onOpenDetails,
  }: {
    data: OutboundTimeoutData
    onOpenDetails: (date: string, status: string, bucket: string) => void
  }) {
    const rowsToRender = useMemo(() => {
      const rowMap = new Map(data.rows.map((row) => [row.status, row]))
      const statuses = [...OUTBOUND_TIMEOUT_STATUS_ORDER]

      return statuses.map((status) => {
        const existing = rowMap.get(status)
        if (existing) return existing

        const cells = Object.fromEntries(
          data.dates.map((date) => [
            date,
            Object.fromEntries(
              data.buckets.map((bucket) => [
                bucket,
                { value: 0, oc: 0, pcs: 0, ppo: 0, avgTimeoutHours: 0 },
              ])
            ),
          ])
        )

        return {
          status,
          statusName: status,
          cells,
          total: { oc: 0, pcs: 0, ppo: 0, value: 0 },
        }
      })
    }, [data.buckets, data.dates, data.rows])

    const metricDigits = data.metric === 'PPO' ? 2 : 0
    const formatTabTotal = (row: OutboundTimeoutData['rows'][number]) => formatNumber(row.total.oc, 0)
    const formatMetricTotal = (row: OutboundTimeoutData['rows'][number]) => formatNumber(row.total.value, metricDigits)
    const formatCellValue = (value: number) => formatNumber(value, metricDigits)

    const [activeStatus, setActiveStatus] = useState(rowsToRender[0]?.status ?? '')

    useEffect(() => {
      if (rowsToRender.length === 0) {
        if (activeStatus) setActiveStatus('')
        return
      }

      if (!rowsToRender.some((row) => row.status === activeStatus)) {
        setActiveStatus(rowsToRender[0].status)
      }
    }, [activeStatus, rowsToRender])

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('timeout.matrix')}</CardTitle>
          <CardDescription>{t('outbound.timeoutMatrixDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Tabs value={activeStatus} onValueChange={setActiveStatus} className="space-y-2">
              <div className="overflow-x-auto">
                <TabsList className="h-8 w-max min-w-full justify-start gap-1 rounded-md bg-muted/30 p-1">
                  {rowsToRender.map((row) => (
                    <TabsTrigger key={`trigger-${row.status}`} value={row.status} className="h-6 px-2 text-xs">
                      <span>{getOutboundTimeoutStatusLabel(row.status)}</span>
                      <span className="ml-1 text-[11px] text-muted-foreground">{formatTabTotal(row)}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {rowsToRender.map((row) => {
                const bucketsToRender = data.buckets

                return (
                  <TabsContent key={`content-${row.status}`} value={row.status} className="mt-0">
                    <div className="rounded-md border">
                      <div className="flex items-center justify-end border-b bg-muted/20 px-2.5 py-1.5">
                        <div className="text-xs text-muted-foreground">
                          {t('timeout.total')}: {formatMetricTotal(row)}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky left-0 bg-card min-w-[64px] h-8 px-2">{t('timeout.bucket')}</TableHead>
                              {data.dates.map((date) => (
                                <TableHead key={`${row.status}-${date}`} className="min-w-[84px] h-8 px-2 text-center">
                                  {date}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bucketsToRender.map((bucket) => (
                              <TableRow key={`${row.status}-${bucket}`} className="h-8">
                                <TableCell className="sticky left-0 bg-card px-2 py-1 font-medium">{bucket}</TableCell>
                                {data.dates.map((date) => {
                                  const cell = row.cells[date]?.[bucket] || { value: 0, oc: 0, pcs: 0, ppo: 0, avgTimeoutHours: 0 }
                                  return (
                                    <TableCell key={`${row.status}-${bucket}-${date}`} className="px-2 py-1 text-center">
                                      {cell.value > 0 ? (
                                        <button
                                          type="button"
                                          className="font-semibold text-destructive hover:underline"
                                          onClick={() => onOpenDetails(date, row.status, bucket)}
                                        >
                                          {formatCellValue(cell.value)}
                                        </button>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
        </CardContent>
      </Card>
    )
  }

  function DetailsTable({ items }: { items: DetailItem[] }) {
    if (items.length === 0) {
      return <div className="py-12 text-center text-sm text-muted-foreground">{t('noData')}</div>
    }

    if (type === 'inbound') {
      return (
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.number')}</TableHead>
                <TableHead>{t('columns.client')}</TableHead>
                <TableHead className="text-right">{t('columns.expectedQty')}</TableHead>
                <TableHead className="text-right">{t('columns.receivedQty')}</TableHead>
                <TableHead className="text-right">{t('columns.putawayQty')}</TableHead>
                <TableHead>{t('columns.expectedPutawayDate')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead>{t('timeout.timeoutDuration')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={String(item.id)}>
                  <TableCell><Link href={`/asn/${item.id}`} className="font-medium text-primary hover:underline">{item.asnNumber}</Link></TableCell>
                  <TableCell>{item.clientCode} / {item.clientName}</TableCell>
                  <TableCell className="text-right">{Number(item.expectedQty).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(item.receivedQty).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(item.putawayQty).toLocaleString()}</TableCell>
                  <TableCell>{formatDateTime(item.expectedPutawayDate as string | null)}</TableCell>
                  <TableCell>
                    {getInboundDetailStatusLabel(String(item.status), String(item.statusGroup || ''))}
                  </TableCell>
                  <TableCell className={item.isTimeout ? 'text-destructive' : ''}>{item.timeoutText}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.number')}</TableHead>
              <TableHead>{t('columns.client')}</TableHead>
              <TableHead className="text-right">{t('columns.skuCount')}</TableHead>
              <TableHead className="text-right">{t('columns.pieces')}</TableHead>
              <TableHead>{t('columns.expectedOutboundTime')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('timeout.timeoutDuration')}</TableHead>
              <TableHead>{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={String(item.id)}>
                <TableCell className="font-medium">{item.orderNumber}</TableCell>
                <TableCell>{item.clientCode} / {item.clientName}</TableCell>
                <TableCell className="text-right">{Number(item.skuCount).toLocaleString()}</TableCell>
                <TableCell className="text-right">{Number(item.pieces).toLocaleString()}</TableCell>
                <TableCell>{formatDateTime(item.expectedOutboundTime as string | null)}</TableCell>
                <TableCell>{getOutboundTimeoutStatusLabel(String(item.status))}</TableCell>
                <TableCell className="text-destructive">{item.timeoutText}</TableCell>
                <TableCell><Link href={String(item.detailHref)} className="text-primary hover:underline">{t('timeout.view')}</Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }
}
