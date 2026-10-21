'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { format } from '@/lib/utils/date-formatter'
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  Printer,
  Download,
  RefreshCw,
  Loader2,
  Plus,
  Link2,
} from 'lucide-react'

import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ManifestOrderFilter } from '@/components/manifest-order/manifest-order-filter'
import { ManifestOrderStatusBadge } from '@/components/manifest-order/manifest-order-status-badge'
import { CreateManifestOrderDialog } from '@/components/manifest-order/create-manifest-order-dialog'
import { toast } from 'sonner'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

interface ManifestOrder {
  id: string
  manifestNumber: string
  status: string
  channelCode: string | null
  channelName: string | null
  orderCount: number
  parcelCount: number
  containerCount: number
  totalWeightKg: string | null
  createdAt: string
  completedAt: string | null
  warehouse: {
    warehouseCode: string
    warehouseName: string
  } | null
  client: {
    clientCode: string
    clientName: string
  } | null
}

function ManifestOrderListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('manifestOrder')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/manifest-orders' },
  })

  const [data, setData] = useState<ManifestOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ManifestOrder | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/manifest-orders?${searchParams.toString()}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotal(result.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch manifest orders:', error)
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/manifest-orders?${params.toString()}`)
  }

  const handleComplete = async () => {
    if (!selectedOrder) return
    try {
      const res = await fetch(`/api/v1/manifest-orders/${selectedOrder.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(t('completeSuccess'))
        fetchData()
      } else {
        toast.error(result.error || result.message)
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setCompleteDialogOpen(false)
      setSelectedOrder(null)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/v1/manifest-orders/export?${searchParams.toString()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `manifest-orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('导出失败')
    }
  }

  const handlePrint = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/manifest-orders/${id}/print`)
      const result = await res.json()
      if (result.success && result.data?.url) {
        const printResult = await printPdfWithAgentFallback({
          pdfUrl: result.data.url,
          jobIdPrefix: 'manifest-order',
          scenarioType: 'MANIFEST_ORDER',
          relatedIds: [id],
          relatedType: 'MANIFEST_ORDER',
          pageCount: 1,
        })
        if (printResult.mode === 'browser') {
          toast.warning('打印插件不可用，已回退浏览器打印')
        }
      } else {
        toast.error('打印失败')
      }
    } catch {
      toast.error('打印失败')
    }
  }

  const columns: ColumnDef<ManifestOrder>[] = useMemo(
    () => [
      {
        accessorKey: 'manifestNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('manifestNumber')} />,
        size: 180,
        cell: ({ row }) => (
          <Link href={`/manifest-orders/${row.original.id}`} className="text-primary hover:underline">
            {row.original.manifestNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 100,
        cell: ({ row }) => <ManifestOrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'warehouse',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('warehouse')} />,
        size: 120,
        cell: ({ row }) => row.original.warehouse?.warehouseName || '-',
      },
      {
        accessorKey: 'channelName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('channelName')} />,
        size: 120,
        cell: ({ row }) => row.original.channelName || '-',
      },
      {
        accessorKey: 'containerCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('containerCount')} />,
        size: 110,
      },
      {
        accessorKey: 'orderCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderCount')} />,
        size: 100,
      },
      {
        accessorKey: 'parcelCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('parcelCount')} />,
        size: 100,
      },
      {
        accessorKey: 'totalWeightKg',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('totalWeightKg')} />,
        size: 100,
        cell: ({ row }) => (row.original.totalWeightKg ? `${row.original.totalWeightKg} kg` : '-'),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('createdAt')} />,
        size: 150,
        cell: ({ row }) => format(new Date(row.original.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      },
      {
        accessorKey: 'completedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('completedAt')} />,
        size: 150,
        cell: ({ row }) =>
          row.original.completedAt
            ? format(new Date(row.original.completedAt), 'yyyy-MM-dd HH:mm:ss')
            : '-',
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 80,
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/manifest-orders/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('actions.view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(order.status === 'CREATED' || order.status === 'IN_PROGRESS') && (
                    <DropdownMenuItem asChild>
                      <Link href={`/manifest-mount?manifestNumber=${encodeURIComponent(order.manifestNumber)}`}>
                        <Link2 className="mr-2 h-4 w-4" />
                        {t('actions.mount')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedOrder(order)
                        setCompleteDialogOpen(true)
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('actions.complete')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handlePrint(order.id)}>
                    <Printer className="mr-2 h-4 w-4" />
                    {t('actions.print')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, tCommon]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {t('actions.export')}
          </Button>
        </div>
      </div>

      <ManifestOrderFilter />

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="manifest-orders-table"
          columns={columns}
          data={data}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmComplete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmCompleteDesc', { number: selectedOrder?.manifestNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateManifestOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  )
}

export default function ManifestOrderListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ManifestOrderListContent />
    </Suspense>
  )
}
