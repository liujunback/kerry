'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { Copy, Eye, Printer, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import { formatInShanghaiTZ } from '@/lib/utils/date-formatter'
import { PutawayOrderDetailDialog } from './putaway-order-detail-dialog'
import { PutawayOrdersFilter } from './putaway-orders-filter'
import { PutawayOrderStatusBadge } from './putaway-order-status-badge'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

export interface PutawayOrder {
  id: string
  putawayOrderNumber: string
  status: string
  putawayMode: string
  totalQty: number
  putawayQty: number
  pendingQty: number
  skuCount: number
  containerCount: number
  createdAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  client: {
    clientCode: string
    clientName: string
  }
  asn: {
    asnNumber: string
  }
  _count: {
    lines: number
  }
}

export function PutawayManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('putaway')
  const tCommon = useTranslations('common')

  const [orders, setOrders] = useState<PutawayOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      const response = await fetch(`/api/v1/putaway/orders/list?${params}`)
      const result = await response.json()

      if (result.success) {
        setOrders(result.data)
        setTotal(result.pagination.total)
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(t('fetchOrdersFailed'))
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams, t, tCommon])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/putaway?${params.toString()}`)
  }, [router, searchParams])

  const handleViewOrderDetail = useCallback((order: PutawayOrder) => {
    setSelectedOrderId(order.id)
    setDetailDialogOpen(true)
  }, [])

  const handlePrint = useCallback(async (e: React.MouseEvent, order: PutawayOrder) => {
    e.stopPropagation()
    setPrintingId(order.id)

    try {
      const result = await printPdfWithAgentFallback({
        pdfUrl: `/api/v1/files/putaway-order/batch?ids=${order.id}`,
        jobIdPrefix: 'putaway-order',
        scenarioType: 'PUTAWAY_ORDER',
        relatedIds: [order.id],
        relatedType: 'PUTAWAY_ORDER',
        pageCount: 1,
      })
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error(t('printFailed'))
    } finally {
      setPrintingId(null)
    }
  }, [t])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }, [tCommon])

  const handleBatchPrint = useCallback(async () => {
    if (selectedOrderIds.size === 0) {
      toast.error(t('selectAtLeastOneOrder'))
      return
    }

    setIsPrinting(true)
    try {
      const ids = Array.from(selectedOrderIds)
      const result = await printPdfWithAgentFallback({
        pdfUrl: `/api/v1/files/putaway-order/batch?ids=${ids.join(',')}`,
        jobIdPrefix: 'putaway-order',
        scenarioType: 'PUTAWAY_ORDER',
        relatedIds: ids,
        relatedType: 'PUTAWAY_ORDER',
        pageCount: ids.length,
      })
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
      setSelectedOrderIds(new Set())
    } catch {
      toast.error(t('batchPrintFailed'))
    } finally {
      setIsPrinting(false)
    }
  }, [selectedOrderIds, t])

  const getModeLabel = useCallback((mode: string) => {
    switch (mode) {
      case 'TASK_MODE':
        return t('orderDetail.modes.TASK_MODE')
      case 'CONTAINER_MODE':
        return t('orderDetail.modes.CONTAINER_MODE')
      case 'MIXED_MODE':
        return t('orderDetail.modes.MIXED_MODE')
      default:
        return mode
    }
  }, [t])

  const rowSelection = useMemo(
    () => Object.fromEntries(Array.from(selectedOrderIds).map((id) => [id, true])),
    [selectedOrderIds]
  )

  const columns: ColumnDef<PutawayOrder>[] = useMemo(
    () => [
      getSelectColumn<PutawayOrder>(),
      {
        accessorKey: 'putawayOrderNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.orderNumber')} />,
        size: 200,
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center gap-0.5">
              <span
                className="cursor-pointer font-mono text-xs text-primary hover:underline"
                onClick={() => handleViewOrderDetail(order)}
              >
                {order.putawayOrderNumber}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => handleCopy(order.putawayOrderNumber)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'asn.asnNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.asnNumber')} />,
        size: 180,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.asn.asnNumber}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.status')} />,
        size: 90,
        cell: ({ row }) => <PutawayOrderStatusBadge status={row.original.status} />,
      },
      {
        id: 'quantities',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.quantities')} />,
        size: 130,
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="text-xs tabular-nums">
              <span className="font-medium">{order.totalQty}</span>
              <span className="mx-0.5 text-muted-foreground">/</span>
              <span className="font-medium text-green-600">{order.putawayQty}</span>
              <span className="mx-0.5 text-muted-foreground">/</span>
              <span className="font-medium text-orange-600">{order.pendingQty}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'client.clientName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.client')} />,
        size: 100,
        cell: ({ row }) => (
          <div className="max-w-[100px] truncate text-xs">{row.original.client.clientName}</div>
        ),
      },
      {
        accessorKey: 'warehouse.warehouseName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.warehouse')} />,
        size: 100,
        cell: ({ row }) => (
          <div className="max-w-[100px] truncate text-xs">{row.original.warehouse.warehouseName}</div>
        ),
      },
      {
        accessorKey: 'putawayMode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.putawayMode')} />,
        size: 80,
        cell: ({ row }) => <span className="text-xs">{getModeLabel(row.original.putawayMode)}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderTable.createdAt')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatInShanghaiTZ(row.original.createdAt, 'yy-MM-dd HH:mm')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 80,
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleViewOrderDetail(order)}
                title={tCommon('view')}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => handlePrint(e, order)}
                disabled={printingId === order.id}
                title={t('print')}
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          )
        },
        meta: { sticky: 'right' as const },
      },
    ],
    [getModeLabel, handleCopy, handlePrint, handleViewOrderDetail, printingId, t, tCommon]
  )

  return (
    <div className="flex h-full flex-col gap-2">
      <PutawayOrdersFilter />

      <div className="flex items-center gap-4 rounded-lg bg-muted p-3 flex-shrink-0">
        <span className="text-sm text-muted-foreground">
          {tCommon('selectedCount', { count: selectedOrderIds.size })}
        </span>
        <Button
          size="sm"
          onClick={handleBatchPrint}
          disabled={selectedOrderIds.size === 0 || isPrinting}
        >
          <Printer className="mr-1 h-3.5 w-3.5" />
          {isPrinting ? `${t('batchPrint')}...` : t('batchPrint')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedOrderIds(new Set())}
          disabled={selectedOrderIds.size === 0 || isPrinting}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          {tCommon('cancel')}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          tableId="putaway-orders-list"
          columns={columns}
          data={orders}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          enableRowSelection={true}
          getRowId={(row) => row.id}
          rowSelection={rowSelection}
          onRowSelectionChange={(selection) => {
            setSelectedOrderIds(new Set(Object.keys(selection).filter((key) => selection[key])))
          }}
          maxHeight="100%"
        />
      </div>

      <PutawayOrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
      />
    </div>
  )
}
