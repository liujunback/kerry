'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ColumnDef, PaginationState, RowSelectionState } from '@tanstack/react-table'
import { ArrowLeft, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import { CreatePickOrderDialog } from '@/components/pick-orders/create-pick-order-dialog'
import { PickOrderFilter } from '@/components/pick-orders/pick-order-filter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { format, subDays } from '@/lib/utils/date-formatter'

interface Order {
  id: string
  orderNumber: string
  referenceNumber: string | null
  orderBusinessType: string
  orderType: string
  isCombined: boolean
  totalWeightKg: number | null
  totalSkuCount: number
  totalOrderedQty: number
  hasSerialItems: boolean
  notes: string | null
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  timeline: {
    allocatedAt: string | null
    expectedOutboundTime: string | null
  } | null
}

interface Client {
  id: string
  clientCode: string
  clientName: string
}

interface User {
  id: string
  fullName: string
  username: string
}

function CreatePickOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pickOrder')
  const tOutbound = useTranslations('outbound.order')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/pick-orders' },
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const currentWarehouseId = searchParams.get('warehouseId') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [clientsRes, warehousesRes, usersRes] = await Promise.all([
          fetch('/api/v1/clients?pageSize=100'),
          fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE'),
          fetch('/api/v1/users?pageSize=100'),
        ])

        const [clientsData, warehousesData, usersData] = await Promise.all([
          clientsRes.json(),
          warehousesRes.json(),
          usersRes.json(),
        ])

        if (clientsData.success) setClients(clientsData.data)
        if (usersData.success) setUsers(usersData.data)

        if (!currentWarehouseId && warehousesData.data?.length > 0) {
          const params = new URLSearchParams(searchParams.toString())
          params.set('warehouseId', warehousesData.data[0].id)
          const today = new Date()
          params.set('createdDatePreset', 'last30days')
          params.set('createdDateFrom', format(subDays(today, 29), 'yyyy-MM-dd'))
          params.set('createdDateTo', format(today, 'yyyy-MM-dd'))
          if (!params.has('orderType')) {
            params.set('orderType', 'SINGLE_ITEM_SINGLE')
          }
          router.replace(`/pick-orders/create?${params.toString()}`)
        }
      } catch {
        toast.error(t('fetchBaseFailed'))
      }
    }

    fetchBaseData()
  }, [currentWarehouseId, router, searchParams, t])

  const fetchOrders = useCallback(async () => {
    if (!currentWarehouseId) return
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())

      const res = await fetch(`/api/v1/pick-orders/available-orders?${params}`)
      const data = await res.json()

      if (data.success) {
        setOrders(data.data)
        setTotal(data.pagination.total)
        setRowSelection({})
      } else {
        toast.error(data.message || t('fetchOrdersFailed'))
      }
    } catch {
      toast.error(t('fetchOrdersFailed'))
    } finally {
      setLoading(false)
    }
  }, [currentWarehouseId, pageSize, searchParams, t])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/pick-orders/create?${params.toString()}`)
  }

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection]
  )

  const selectedSummary = useMemo(() => {
    const selectedOrders = orders.filter((order) => selectedIds.includes(order.id))
    return {
      orderCount: selectedOrders.length,
      totalSkuCount: selectedOrders.reduce((sum, order) => sum + order.totalSkuCount, 0),
      totalItemCount: selectedOrders.reduce((sum, order) => sum + order.totalOrderedQty, 0),
    }
  }, [orders, selectedIds])

  const handleSuccess = () => {
    setRowSelection({})
    fetchOrders()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm')
  }

  const columns: ColumnDef<Order>[] = useMemo(
    () => [
      getSelectColumn<Order>(),
      {
        accessorKey: 'warehouse',
        header: t('warehouse'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.warehouse.warehouseCode}</span>,
      },
      {
        accessorKey: 'orderNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderNumber')} />,
        size: 200,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.orderNumber}</span>,
      },
      {
        accessorKey: 'referenceNumber',
        header: t('referenceNumber'),
        size: 160,
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.referenceNumber || '-'}</span>,
      },
      {
        accessorKey: 'client',
        header: t('client'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => row.original.client.clientName,
      },
      {
        accessorKey: 'orderType',
        header: t('orderType'),
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {tOutbound(`orderStructureTypes.${row.original.orderType}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'allocatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('createdDate')} />,
        size: 130,
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.timeline?.allocatedAt ?? null)}</span>,
      },
      {
        accessorKey: 'expectedOutboundTime',
        header: t('expectedOutbound'),
        size: 130,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.timeline?.expectedOutboundTime ?? null)}</span>,
      },
      {
        accessorKey: 'orderBusinessType',
        header: t('businessType'),
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {tOutbound(`types.${row.original.orderBusinessType}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'isCombined',
        header: t('isCombined'),
        size: 70,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isCombined ? (
            <Badge variant="default" className="text-xs">{tCommon('yes')}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{tCommon('no')}</span>
          ),
      },
      {
        accessorKey: 'totalWeightKg',
        header: t('weight'),
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.totalWeightKg ? `${Number(row.original.totalWeightKg).toFixed(2)} kg` : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'totalSkuCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('skuCount')} className="justify-center" />,
        size: 70,
        cell: ({ row }) => <div className="text-center text-xs tabular-nums">{row.original.totalSkuCount}</div>,
      },
      {
        accessorKey: 'totalOrderedQty',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('itemCount')} className="justify-center" />,
        size: 70,
        cell: ({ row }) => <div className="text-center text-xs tabular-nums">{row.original.totalOrderedQty}</div>,
      },
      {
        accessorKey: 'notes',
        header: t('notes'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-[100px] truncate text-xs" title={row.original.notes || ''}>
            {row.original.notes || '-'}
          </span>
        ),
      },
    ],
    [t, tOutbound, tCommon]
  )

  return (
    <div className="flex h-[calc(100vh-112px)] flex-col overflow-hidden -mx-6 -mb-6 -mt-4">
      <div className="flex items-center justify-between px-6 pb-2 pt-3">
        <Breadcrumb items={breadcrumb.current(t('createPickOrder'))} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/pick-orders')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('title')}
          </Button>
          <p className="text-sm text-muted-foreground">{t('createPickOrderDesc')}</p>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mx-6">
        <PickOrderFilter clients={clients} />
      </div>

      <div className="mx-6 mt-2 flex items-center gap-6 rounded-lg bg-muted p-3">
        <div className="flex items-center gap-6 text-sm">
          <span>
            {t('selectedOrders')}: <strong>{selectedSummary.orderCount}</strong>
          </span>
          <span>
            {t('totalItemCount')}: <strong>{selectedSummary.totalItemCount}</strong>
          </span>
        </div>
        <Button
          variant="outline"
          onClick={() => setRowSelection({})}
          disabled={selectedIds.length === 0}
        >
          <X className="mr-2 h-4 w-4" />
          {tCommon('cancel')}
        </Button>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={selectedIds.length === 0 || !currentWarehouseId}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('createPickOrder')} ({selectedIds.length})
        </Button>
      </div>

      <div className="mt-2 min-h-0 flex-1 px-6 pb-2">
        {currentWarehouseId ? (
          <DataTable
            key={`${page}-${pageSize}`}
            tableId="create-pick-order-table"
            columns={columns}
            data={orders}
            total={total}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            loading={loading}
            enableSorting={true}
            enableColumnVisibility={false}
            showSelectionCount={false}
            enableRowSelection={true}
            getRowId={(row) => row.id}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            maxHeight="100%"
          />
        ) : (
          <div className="rounded-lg border py-8 text-center text-muted-foreground">
            {t('selectWarehouseFirst')}
          </div>
        )}
      </div>

      <CreatePickOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        warehouseId={currentWarehouseId}
        selectedOrderIds={selectedIds}
        selectedOrderCount={selectedSummary.orderCount}
        totalSkuCount={selectedSummary.totalSkuCount}
        totalItemCount={selectedSummary.totalItemCount}
        users={users}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

export default function CreatePickOrderPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CreatePickOrderContent />
    </Suspense>
  )
}
