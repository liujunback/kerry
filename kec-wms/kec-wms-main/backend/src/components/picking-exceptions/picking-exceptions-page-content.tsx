'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { Eye, Loader2, PackagePlus, Printer, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  CompactFilterActions,
  EnumFilterSelect,
  ListFilterCard,
} from '@/components/list-filters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/contexts/permission-context'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'
import { formatInShanghaiTZ } from '@/lib/utils/date-formatter'

type PickingExceptionCase = {
  id: string
  warehouseId: string
  orderId: string
  orderNumber: string
  pickOrderId: string
  pickOrderNumber: string
  exceptionType: string
  status: string
  shortageQty: number
  supplementedQty: number
  remainingShortageQty: number
  supplementStatus: string
  printStatus: string
  detectedAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  } | null
  skuCodes: string[]
  firstLocationCode: string | null
  lineCount: number
  supplementPickOrder: SupplementPickOrder | null
}

type PickingExceptionLine = {
  id: string
  skuCode: string
  skuName: string | null
  locationCode: string
  expectedQty: number
  actualPickedQty: number
  shortageQty: number
  supplementedQty: number
  remainingShortageQty: number
  batchNumber: string | null
}

type SupplementPickOrder = {
  id: string
  supplementPickNo: string
  status: string
  allocationMethod: string
  totalSupplementQty: number
  printStatus: string
  printCount: number
  printedAt: string | null
  manualCompleteRemark?: string | null
  lines?: SupplementPickOrderLine[]
}

type SupplementPickOrderLine = {
  id: string
  skuCode: string
  sourceLocationCode: string
  supplementQty: number
  pickedQty: number
  batchNumber: string | null
  status: string
}

type PickingExceptionDetail = PickingExceptionCase & {
  lines: PickingExceptionLine[]
  supplementOrders: SupplementPickOrder[]
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
}

const supplementStatusColors: Record<string, string> = {
  NOT_GENERATED: 'bg-gray-100 text-gray-800',
  GENERATED: 'bg-blue-100 text-blue-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
}

const printStatusColors: Record<string, string> = {
  NOT_PRINTED: 'bg-gray-100 text-gray-800',
  PRINTED: 'bg-green-100 text-green-800',
}

function fallbackFormatDate(value: string | null | undefined) {
  if (!value) return '-'
  return formatInShanghaiTZ(value, 'yyyy-MM-dd HH:mm:ss')
}

export function PickingExceptionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pickingException')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const { hasAnyPermission } = usePermissions()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('exception') }],
    module: { label: t('title'), href: '/picking-exceptions' },
  })

  const [records, setRecords] = useState<PickingExceptionCase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<PickingExceptionDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [manualRemark, setManualRemark] = useState('')

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const pagination: PaginationState = { pageIndex: page - 1, pageSize }

  const [filters, setFilters] = useState({
    orderNumber: searchParams.get('orderNumber') || '',
    pickOrderNumber: searchParams.get('pickOrderNumber') || '',
    skuCode: searchParams.get('skuCode') || '',
    supplementStatus: searchParams.get('supplementStatus') || 'ALL',
    printStatus: searchParams.get('printStatus') || 'ALL',
    status: searchParams.get('status') || 'OPEN',
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      const response = await fetch(`/api/v1/picking-exceptions?${params.toString()}`)
      const result = await response.json()
      if (!result.success) {
        toast.error(result.message || t('fetchFailed'))
        return
      }
      setRecords(result.data)
      setTotal(result.pagination.total)
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchParams, t])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const pushFilters = () => {
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('pageSize', pageSize.toString())
    if (filters.orderNumber.trim()) params.set('orderNumber', filters.orderNumber.trim())
    if (filters.pickOrderNumber.trim()) params.set('pickOrderNumber', filters.pickOrderNumber.trim())
    if (filters.skuCode.trim()) params.set('skuCode', filters.skuCode.trim())
    if (filters.supplementStatus !== 'ALL') params.set('supplementStatus', filters.supplementStatus)
    if (filters.printStatus !== 'ALL') params.set('printStatus', filters.printStatus)
    if (filters.status !== 'ALL') params.set('status', filters.status)
    router.push(`/picking-exceptions?${params.toString()}`)
  }

  const resetFilters = () => {
    setFilters({
      orderNumber: '',
      pickOrderNumber: '',
      skuCode: '',
      supplementStatus: 'ALL',
      printStatus: 'ALL',
      status: 'OPEN',
    })
    router.push(`/picking-exceptions?page=1&pageSize=${pageSize}&status=OPEN`)
  }

  const pendingChangeCount = [
    filters.orderNumber !== (searchParams.get('orderNumber') || ''),
    filters.pickOrderNumber !== (searchParams.get('pickOrderNumber') || ''),
    filters.skuCode !== (searchParams.get('skuCode') || ''),
    filters.supplementStatus !== (searchParams.get('supplementStatus') || 'ALL'),
    filters.printStatus !== (searchParams.get('printStatus') || 'ALL'),
    filters.status !== (searchParams.get('status') || 'OPEN'),
  ].filter(Boolean).length

  const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
  const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
  const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pushFilters()
  }

  const handlePaginationChange = (next: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (next.pageIndex + 1).toString())
    params.set('pageSize', next.pageSize.toString())
    router.push(`/picking-exceptions?${params.toString()}`)
  }

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/v1/picking-exceptions/${id}`)
      const result = await response.json()
      if (!result.success) {
        toast.error(result.message || t('detailFetchFailed'))
        return
      }
      setDetail(result.data)
      setDetailOpen(true)
    } catch {
      toast.error(t('detailFetchFailed'))
    } finally {
      setDetailLoading(false)
    }
  }, [t])

  const refreshDetail = useCallback(async () => {
    if (!detail) return
    await loadDetail(detail.id)
    await fetchRecords()
  }, [detail, fetchRecords, loadDetail])

  const handleGenerateSupplement = async () => {
    if (!detail) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/v1/picking-exceptions/${detail.id}/supplement`, { method: 'POST' })
      const result = await response.json()
      if (!result.success) {
        toast.error(result.message || t('generateFailed'))
        return
      }
      toast.success(t('generateSuccess'))
      await refreshDetail()
    } catch {
      toast.error(t('generateFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrint = async (supplementOrder: SupplementPickOrder) => {
    setActionLoading(true)
    try {
      const result = await printPdfWithAgentFallback({
        pdfUrl: `/api/v1/files/supplement-pick-order/${supplementOrder.id}`,
        jobIdPrefix: 'supplement-pick-order',
        scenarioType: 'PICK_ORDER',
        relatedIds: [supplementOrder.id],
        relatedType: 'SUPPLEMENT_PICK_ORDER',
        pageCount: 1,
      })
      if (result.mode === 'browser') {
        toast.warning(t('browserPrintFallback'))
      }
      const response = await fetch(`/api/v1/supplement-pick-orders/${supplementOrder.id}/print`, { method: 'POST' })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.message || t('printStatusFailed'))
        return
      }
      toast.success(t('printSuccess'))
      await refreshDetail()
    } catch {
      toast.error(t('printFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleManualComplete = async () => {
    const supplementOrder = detail?.supplementOrders?.[0]
    if (!supplementOrder) return
    if (!manualRemark.trim()) {
      toast.error(t('manualRemarkRequired'))
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(`/api/v1/supplement-pick-orders/${supplementOrder.id}/manual-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: manualRemark.trim() }),
      })
      const result = await response.json()
      if (!result.success) {
        toast.error(result.message || t('manualCompleteFailed'))
        return
      }
      toast.success(t('manualCompleteSuccess'))
      setManualDialogOpen(false)
      setManualRemark('')
      await refreshDetail()
    } catch {
      toast.error(t('manualCompleteFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnDef<PickingExceptionCase>[] = useMemo(() => [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderNumber')} />,
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-xs">{row.original.orderNumber}</div>
          <div className="text-xs text-muted-foreground">{row.original.pickOrderNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: 'skuCodes',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('skuCode')} />,
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate text-xs">{row.original.skuCodes.join(', ')}</div>
      ),
    },
    {
      accessorKey: 'firstLocationCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('locationCode')} />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.firstLocationCode || '-'}</span>,
    },
    {
      accessorKey: 'shortageQty',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('shortageQty')} />,
      cell: ({ row }) => <div className="text-right font-medium">{row.original.remainingShortageQty}</div>,
    },
    {
      accessorKey: 'supplementStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('supplementStatus')} />,
      cell: ({ row }) => (
        <Badge className={supplementStatusColors[row.original.supplementStatus] || 'bg-gray-100 text-gray-800'}>
          {t(`supplementStatuses.${row.original.supplementStatus}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'printStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('printStatus')} />,
      cell: ({ row }) => (
        <Badge className={printStatusColors[row.original.printStatus] || 'bg-gray-100 text-gray-800'}>
          {t(`printStatuses.${row.original.printStatus}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] || 'bg-gray-100 text-gray-800'}>
          {t(`statuses.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'detectedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('detectedAt')} />,
      cell: ({ row }) => <span className="text-xs">{fallbackFormatDate(row.original.detectedAt)}</span>,
    },
    {
      id: 'actions',
      header: t('actions'),
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => loadDetail(row.original.id)} disabled={detailLoading}>
          <Eye className="mr-1 h-4 w-4" />
          {tCommon('view')}
        </Button>
      ),
    },
  ], [detailLoading, loadDetail, t, tCommon])

  const latestSupplementOrder = detail?.supplementOrders?.[0] || null
  const canManage = hasAnyPermission(['picking-exception:manage', 'picking:update'])
  const canPrint = hasAnyPermission(['picking-exception:print', 'picking:read'])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-shrink-0 items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
      </div>

      <ListFilterCard mode="advanced">
        <form onSubmit={handleFilterSubmit} className="space-y-3">
          <div className={filterRowShellClassName}>
            <div className={primaryFilterGridClassName}>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('orderNumber')}</span>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.orderNumber}
                    onChange={(event) => setFilters((current) => ({ ...current, orderNumber: event.target.value }))}
                    placeholder={t('orderNumberPlaceholder')}
                    className="h-8 pl-7 text-sm"
                  />
                </div>
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('pickOrderNumber')}</span>
                <Input
                  value={filters.pickOrderNumber}
                  onChange={(event) => setFilters((current) => ({ ...current, pickOrderNumber: event.target.value }))}
                  placeholder={t('pickOrderNumberPlaceholder')}
                  className="h-8 text-sm"
                />
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('skuCode')}</span>
                <Input
                  value={filters.skuCode}
                  onChange={(event) => setFilters((current) => ({ ...current, skuCode: event.target.value }))}
                  placeholder={t('skuCodePlaceholder')}
                  className="h-8 text-sm"
                />
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('supplementStatus')}</span>
                <EnumFilterSelect
                  value={filters.supplementStatus === 'ALL' ? '' : filters.supplementStatus}
                  onValueChange={(value) => setFilters((current) => ({ ...current, supplementStatus: value || 'ALL' }))}
                  allLabel={tCommon('all')}
                  options={['NOT_GENERATED', 'GENERATED', 'PARTIAL', 'COMPLETED'].map((item) => ({
                    value: item,
                    label: t(`supplementStatuses.${item}`),
                  }))}
                />
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('printStatus')}</span>
                <EnumFilterSelect
                  value={filters.printStatus === 'ALL' ? '' : filters.printStatus}
                  onValueChange={(value) => setFilters((current) => ({ ...current, printStatus: value || 'ALL' }))}
                  allLabel={tCommon('all')}
                  options={['NOT_PRINTED', 'PRINTED'].map((item) => ({
                    value: item,
                    label: t(`printStatuses.${item}`),
                  }))}
                />
              </div>

              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('status')}</span>
                <EnumFilterSelect
                  value={filters.status === 'ALL' ? '' : filters.status}
                  onValueChange={(value) => setFilters((current) => ({ ...current, status: value || 'ALL' }))}
                  allLabel={tCommon('all')}
                  options={['OPEN', 'RESOLVED'].map((item) => ({
                    value: item,
                    label: t(`statuses.${item}`),
                  }))}
                />
              </div>
            </div>

            <CompactFilterActions
              pendingChangeCount={pendingChangeCount}
              searchLabel={tCommon('search')}
              resetLabel={tCommon('reset')}
              moreLabel={t('moreFilters')}
              collapseLabel={t('collapseFilters')}
              expanded={false}
              onReset={resetFilters}
              onToggleExpanded={() => undefined}
              className="mt-4 xl:mt-0 xl:w-[180px] xl:shrink-0"
            />
          </div>
        </form>
      </ListFilterCard>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={records}
          tableId="picking-exceptions"
          total={total}
          pagination={pagination}
          manualPagination
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableGlobalFilter={false}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detailTitle')}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.orderNumber} / ${detail.pickOrderNumber}` : ''}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm md:grid-cols-4">
                <div><span className="text-muted-foreground">{t('warehouse')}</span><div>{detail.warehouse?.warehouseName || '-'}</div></div>
                <div><span className="text-muted-foreground">{t('shortageQty')}</span><div>{detail.shortageQty}</div></div>
                <div><span className="text-muted-foreground">{t('remainingShortageQty')}</span><div>{detail.remainingShortageQty}</div></div>
                <div><span className="text-muted-foreground">{t('detectedAt')}</span><div>{fallbackFormatDate(detail.detectedAt)}</div></div>
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">{t('shortageLines')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2">{t('skuCode')}</th>
                          <th>{t('locationCode')}</th>
                          <th className="text-right">{t('expectedQty')}</th>
                          <th className="text-right">{t('actualPickedQty')}</th>
                          <th className="text-right">{t('shortageQty')}</th>
                          <th className="text-right">{t('supplementedQty')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.lines.map((line) => (
                          <tr key={line.id} className="border-b">
                            <td className="py-2 font-mono text-xs">{line.skuCode}</td>
                            <td className="font-mono text-xs">{line.locationCode}</td>
                            <td className="text-right">{line.expectedQty}</td>
                            <td className="text-right">{line.actualPickedQty}</td>
                            <td className="text-right">{line.shortageQty}</td>
                            <td className="text-right">{line.supplementedQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {latestSupplementOrder && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{t('supplementPickOrder')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div><span className="text-muted-foreground">{t('supplementPickNo')}</span><div>{latestSupplementOrder.supplementPickNo}</div></div>
                      <div><span className="text-muted-foreground">{t('status')}</span><div>{t(`supplementOrderStatuses.${latestSupplementOrder.status}`)}</div></div>
                      <div><span className="text-muted-foreground">{t('printCount')}</span><div>{latestSupplementOrder.printCount}</div></div>
                      <div><span className="text-muted-foreground">{t('printedAt')}</span><div>{fallbackFormatDate(latestSupplementOrder.printedAt)}</div></div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2">{t('skuCode')}</th>
                            <th>{t('sourceLocationCode')}</th>
                            <th className="text-right">{t('supplementQty')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(latestSupplementOrder.lines || []).map((line) => (
                            <tr key={line.id} className="border-b">
                              <td className="py-2 font-mono text-xs">{line.skuCode}</td>
                              <td className="font-mono text-xs">{line.sourceLocationCode}</td>
                              <td className="text-right">{line.supplementQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {detail && !latestSupplementOrder && canManage && (
                <Button onClick={handleGenerateSupplement} disabled={actionLoading || detail.remainingShortageQty <= 0}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                  {t('generateSupplement')}
                </Button>
              )}
              {latestSupplementOrder && canPrint && (
                <Button variant="outline" onClick={() => handlePrint(latestSupplementOrder)} disabled={actionLoading}>
                  <Printer className="mr-2 h-4 w-4" />
                  {latestSupplementOrder.printCount > 0 ? t('reprint') : t('print')}
                </Button>
              )}
              {latestSupplementOrder && latestSupplementOrder.status !== 'COMPLETED' && canManage && (
                <Button variant="secondary" onClick={() => setManualDialogOpen(true)} disabled={actionLoading}>
                  {t('manualComplete')}
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>{tCommon('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('manualComplete')}</DialogTitle>
            <DialogDescription>{t('manualCompleteDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('manualRemark')}</Label>
            <Textarea value={manualRemark} onChange={(event) => setManualRemark(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>{tCommon('cancel')}</Button>
            <Button onClick={handleManualComplete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
