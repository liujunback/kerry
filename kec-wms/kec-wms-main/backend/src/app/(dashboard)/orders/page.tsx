'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { ColumnDef, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table'
import { Copy, Eye, Loader2, MoreHorizontal, Package, RefreshCw, RotateCcw, ShieldAlert, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ManualOrderInterceptionDialog } from '@/components/orders/manual-order-interception-dialog'
import { OutboundOrderFilter } from '@/components/orders/outbound-order-filter'
import { usePermissions } from '@/contexts/permission-context'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface Client {
  id: string
  clientCode: string
  clientName: string
}

interface OutboundOrder {
  id: string
  orderNumber: string
  referenceNumber: string | null
  orderType: string
  orderBusinessType: string
  status: string
  trackingNumber: string | null
  totalOrderedQty: number
  totalWeightKg: number | null
  totalSkuCount: number
  hasSerialItems: boolean
  isCombined: boolean
  interceptionStatus: string
  createdAt: string
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  warehouse?: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  extension?: {
    channel: string | null
    checkOutWeightKg: number | null
  }
  timeline?: {
    allocatedAt: string | null
    shippedAt: string | null
    expectedShipDate: string | null
  }
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-gray-100 text-gray-800',
  ALLOCATED: 'bg-blue-100 text-blue-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-800',
  PENDING_WAVE: 'bg-blue-100 text-blue-800',
  IN_WAVE: 'bg-blue-100 text-blue-800',
  WAVED: 'bg-blue-100 text-blue-800',
  PICKING: 'bg-blue-100 text-blue-800',
  PICKED: 'bg-blue-100 text-blue-800',
  SORTING: 'bg-blue-100 text-blue-800',
  SORTED: 'bg-blue-100 text-blue-800',
  PACKING: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-blue-100 text-blue-800',
  READY_SHIP: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  EXCEPTION: 'bg-red-100 text-red-800',
}

const interceptionColors: Record<string, string> = {
  NOT_INTERCEPTED: 'bg-gray-100 text-gray-800',
  PENDING_INTERCEPTION: 'bg-yellow-100 text-yellow-800',
  INTERCEPTED: 'bg-red-100 text-red-800',
}

function OrdersContent() {
  const t = useTranslations('outbound.order')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/orders' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasPermission } = usePermissions()

  const [orders, setOrders] = useState<OutboundOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [allocating, setAllocating] = useState(false)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [rollbackReason, setRollbackReason] = useState('')
  const [rollbacking, setRollbacking] = useState(false)
  const [interceptionDialogOrder, setInterceptionDialogOrder] = useState<OutboundOrder | null>(null)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/clients?pageSize=100')
      const data = await res.json()
      if (data.success) {
        setClients(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const res = await fetch(`/api/v1/outbound-orders?${params}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/orders?${params.toString()}`)
  }, [router, searchParams])

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }
    router.push(`/orders?${params.toString()}`)
  }, [router, searchParams])

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection]
  )

  const allocatableOrders = useMemo(
    () => orders.filter((order) => ['CREATED', 'PENDING'].includes(order.status)),
    [orders]
  )
  const rollbackableOrders = useMemo(
    () => orders.filter((order) => ['ALLOCATED', 'OUT_OF_STOCK'].includes(order.status)),
    [orders]
  )

  const selectedAllocatable = useMemo(
    () => selectedIds.filter((id) => allocatableOrders.some((order) => order.id === id)),
    [allocatableOrders, selectedIds]
  )
  const selectedRollbackable = useMemo(
    () => selectedIds.filter((id) => rollbackableOrders.some((order) => order.id === id)),
    [rollbackableOrders, selectedIds]
  )

  const handleBatchAllocate = useCallback(async () => {
    if (selectedAllocatable.length === 0) {
      toast.error('请选择可分配库存的订单（已创建或待处理状态）')
      return
    }

    setAllocating(true)
    try {
      const res = await fetch('/api/v1/outbound-orders/batch-allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedAllocatable }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setRowSelection({})
        fetchOrders()
      } else {
        toast.error(data.message || '分配失败')
      }
    } catch (error) {
      console.error('Batch allocate failed:', error)
      toast.error('批量分配失败')
    } finally {
      setAllocating(false)
    }
  }, [fetchOrders, selectedAllocatable])

  const handleBatchRollback = useCallback(async () => {
    if (selectedRollbackable.length === 0) {
      toast.error('请选择可回退的订单（已分配状态）')
      return
    }

    if (!rollbackReason.trim()) {
      toast.error('请输入回退原因')
      return
    }

    setRollbacking(true)
    try {
      const res = await fetch('/api/v1/outbound-orders/batch-rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedRollbackable,
          reason: rollbackReason,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setRowSelection({})
        setRollbackDialogOpen(false)
        setRollbackReason('')
        fetchOrders()
      } else {
        toast.error(data.message || '回退失败')
      }
    } catch (error) {
      console.error('Batch rollback failed:', error)
      toast.error('批量回退失败')
    } finally {
      setRollbacking(false)
    }
  }, [fetchOrders, rollbackReason, selectedRollbackable])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }, [tCommon])

  const columns: ColumnDef<OutboundOrder>[] = useMemo(
    () => [
      getSelectColumn<OutboundOrder>(),
      {
        accessorKey: 'orderNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderNumber')} />,
        size: 180,
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center gap-1">
              <div>
                <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                  {order.orderNumber}
                </Link>
                {order.referenceNumber && (
                  <div className="text-xs text-muted-foreground">{order.referenceNumber}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(order.orderNumber)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 100,
        cell: ({ row }) => (
          <Badge className={statusColors[row.original.status] || 'bg-gray-500 text-white'}>
            {t(`statuses.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'orderType',
        header: `${t('orderType')}/${t('businessType')}`,
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs">
            <div>{t(`orderStructureTypes.${row.original.orderType}`)}</div>
            <div className="text-muted-foreground">{t(`types.${row.original.orderBusinessType}`)}</div>
          </div>
        ),
      },
      {
        accessorKey: 'client',
        header: `${t('client')}/${tCommon('warehouse')}`,
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="max-w-[100px] truncate text-xs">
            <div>{row.original.client?.clientName || '-'}</div>
            <div className="text-muted-foreground">{row.original.warehouse?.warehouseName || '-'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'channel',
        header: t('channel'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.extension?.channel || '-'}</span>,
      },
      {
        accessorKey: 'trackingNumber',
        header: t('trackingNumber'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.trackingNumber || '-'}</span>,
      },
      {
        accessorKey: 'totalWeightKg',
        header: `${t('totalWeightKg')}/${t('checkOutWeightKg')}`,
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const totalWeight = row.original.totalWeightKg
          const checkOutWeight = row.original.extension?.checkOutWeightKg
          return (
            <div className="text-xs tabular-nums">
              <span className="font-medium">{totalWeight ? Number(totalWeight).toFixed(2) : '-'}</span>
              <span className="mx-0.5 text-muted-foreground">/</span>
              <span className="font-medium">{checkOutWeight ? Number(checkOutWeight).toFixed(2) : '-'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'flags',
        header: t('flags'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.isCombined && <Badge variant="secondary" className="text-xs">{t('combined.yes')}</Badge>}
            {row.original.hasSerialItems && <Badge variant="outline" className="text-xs">SN</Badge>}
          </div>
        ),
      },
      {
        accessorKey: 'interceptionStatus',
        header: t('filterByInterception'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <Badge className={interceptionColors[row.original.interceptionStatus] || ''}>
            {t(`interceptionStatuses.${row.original.interceptionStatus}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('dateTypes.created')} />,
        size: 140,
        cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        accessorKey: 'allocatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('auditTime')} />,
        size: 140,
        cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.timeline?.allocatedAt || null) || '-'}</span>,
      },
      {
        accessorKey: 'shippedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('shippedTime')} />,
        size: 140,
        cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.original.timeline?.shippedAt || null) || '-'}</span>,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/orders/${order.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        {tCommon('view')}
                      </Link>
                    </DropdownMenuItem>
                    {hasPermission('order-intercept:write') && (
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          setInterceptionDialogOrder(order)
                        }}
                      >
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        人工拦截
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
          )
        },
      },
    ],
    [t, tCommon, handleCopy]
  )

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <OutboundOrderFilter clients={clients} />

      <div className="flex items-center gap-4 rounded-lg bg-muted p-3 flex-shrink-0">
        <span className="text-sm text-muted-foreground">
          {tCommon('selectedCount', { count: selectedIds.length })}
        </span>
        <Button
          size="sm"
          onClick={handleBatchAllocate}
          disabled={allocating || selectedAllocatable.length === 0}
        >
          <Package className="mr-2 h-4 w-4" />
          {allocating ? '处理中...' : t('actions.allocate')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRollbackDialogOpen(true)}
          disabled={rollbacking || selectedRollbackable.length === 0}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {t('actions.rollback')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRowSelection({})}
          disabled={selectedIds.length === 0}
        >
          <X className="mr-2 h-4 w-4" />
          {tCommon('cancel')}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          tableId="orders-list"
          columns={columns}
          data={orders}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          enableRowSelection={true}
          showSelectionCount={false}
          getRowId={(row) => row.id}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          maxHeight="100%"
        />
      </div>

      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.rollback')}</DialogTitle>
            <DialogDescription>
              {'将释放已分配的库存，订单状态将回退到待处理。'}
              <br />
              {`已选择 ${selectedRollbackable.length} 个订单。`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rollbackReason">回退原因 *</Label>
              <Textarea
                id="rollbackReason"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="请输入回退原因"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleBatchRollback} disabled={rollbacking}>
              {rollbacking ? '回退中...' : tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {interceptionDialogOrder && (
        <ManualOrderInterceptionDialog
          open={Boolean(interceptionDialogOrder)}
          onOpenChange={(open) => {
            if (!open) {
              setInterceptionDialogOrder(null)
            }
          }}
          orderNumber={interceptionDialogOrder.orderNumber}
          orderStatus={interceptionDialogOrder.status}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <OrdersContent />
    </Suspense>
  )
}
