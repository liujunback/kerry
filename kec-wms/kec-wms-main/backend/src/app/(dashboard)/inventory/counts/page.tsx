'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Plus, RefreshCw } from 'lucide-react'
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
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InventoryCountFilter } from '@/components/inventory/inventory-count-filter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface InventoryCountOrderListItem {
  id: string
  orderNumber: string
  orderType: string
  countMode: string
  status: string
  warehouseName: string
  ownerScopeSummary: string
  plannedAt: string
  totalBatchCount: number
  completedBatchCount: number
  totalDetailCount: number
  diffDetailCount: number
  pendingRecountCount: number
  pendingAdjustCount: number
  createdAt: string
  progressPercent: number
}

type PendingAction =
  | {
      type: 'cancel'
      row: InventoryCountOrderListItem
    }
  | {
      type: 'generate'
      row: InventoryCountOrderListItem
    }
  | null

const sortParamByColumnId: Record<string, 'createdAt' | 'plannedAt' | 'orderNumber'> = {
  createdAt: 'createdAt',
  plannedAt: 'plannedAt',
  orderNumber: 'orderNumber',
}

const sortColumnIdByParam: Record<'createdAt' | 'plannedAt' | 'orderNumber', string> = {
  createdAt: 'createdAt',
  plannedAt: 'plannedAt',
  orderNumber: 'orderNumber',
}

const statusColorMap: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_SCOPE: 'bg-amber-100 text-amber-700',
  GENERATING_SCOPE: 'bg-cyan-100 text-cyan-700',
  SCOPE_FAILED: 'bg-red-100 text-red-700',
  READY: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
  PENDING_ADJUST: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
}

function InventoryCountsContent() {
  const t = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const tCount = useTranslations('inventory.count')
  const router = useRouter()
  const searchParams = useSearchParams()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tCount('title'), href: '/inventory/counts' },
  })

  const [rows, setRows] = useState<InventoryCountOrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [submittingAction, setSubmittingAction] = useState(false)

  const page = Number.parseInt(searchParams.get('page') || '1', 10)
  const pageSize = Number.parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'plannedAt' | 'orderNumber' | null)
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortColumnIdByParam[sortBy], desc: sortOrder === 'desc' }]
    : []

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/inventory/counts?${searchParams.toString()}`)
      const result = await response.json()
      if (result.success) {
        setRows(result.data || [])
        setTotal(result.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch inventory count orders:', error)
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (!rows.some((row) => row.status === 'GENERATING_SCOPE')) {
      return
    }

    const timer = window.setInterval(() => {
      void fetchOrders()
    }, 5000)

    return () => window.clearInterval(timer)
  }, [fetchOrders, rows])

  const handlePaginationChange = (next: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', `${next.pageIndex + 1}`)
    params.set('pageSize', `${next.pageSize}`)
    router.push(`/inventory/counts?${params.toString()}`)
  }

  const handleSortingChange = (next: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (next.length > 0) {
      const mapped = sortParamByColumnId[next[0].id]
      if (mapped) {
        params.set('sortBy', mapped)
        params.set('sortOrder', next[0].desc ? 'desc' : 'asc')
      }
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }

    router.push(`/inventory/counts?${params.toString()}`)
  }

  const handleGenerateScope = async (row: InventoryCountOrderListItem) => {
    try {
      setSubmittingAction(true)
      const response = await fetch(`/api/v1/inventory/counts/${row.id}/generate`, {
        method: 'POST',
      })
      const result = await response.json()

      if (!result.success) {
        toast.error(result.message || tCount('generateFailed'))
        return
      }

      toast.success(tCount('generateSubmitted'))
      await fetchOrders()
    } catch (error) {
      console.error('Failed to generate inventory count scope:', error)
      toast.error(tCount('generateFailed'))
    } finally {
      setSubmittingAction(false)
      setPendingAction(null)
    }
  }

  const handleCancelOrder = async (row: InventoryCountOrderListItem) => {
    try {
      setSubmittingAction(true)
      const response = await fetch(`/api/v1/inventory/counts/${row.id}/cancel`, {
        method: 'POST',
      })
      const result = await response.json()

      if (!result.success) {
        toast.error(result.message || tCount('cancelFailed'))
        return
      }

      toast.success(tCount('cancelSuccess'))
      await fetchOrders()
    } catch (error) {
      console.error('Failed to cancel inventory count order:', error)
      toast.error(tCount('cancelFailed'))
    } finally {
      setSubmittingAction(false)
      setPendingAction(null)
    }
  }

  const columns: ColumnDef<InventoryCountOrderListItem>[] = useMemo(() => [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title={tCount('orderNumber')} />,
      size: 150,
      cell: ({ row }) => (
        <Link href={`/inventory/counts/${row.original.id}`} className="font-mono text-xs text-primary hover:underline">
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'orderType',
      header: tCount('orderType'),
      enableSorting: false,
      size: 110,
      cell: ({ row }) => <span className="text-xs">{tCount(`types.${row.original.orderType}`)}</span>,
    },
    {
      accessorKey: 'ownerScopeSummary',
      header: tCount('ownerScope'),
      enableSorting: false,
      size: 160,
      cell: ({ row }) => <span className="text-xs">{row.original.ownerScopeSummary}</span>,
    },
    {
      accessorKey: 'countMode',
      header: tCount('countMode'),
      enableSorting: false,
      size: 90,
      cell: ({ row }) => <span className="text-xs">{tCount(`countModes.${row.original.countMode}`)}</span>,
    },
    {
      accessorKey: 'plannedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={tCount('plannedAt')} />,
      size: 150,
      cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.plannedAt)}</span>,
    },
    {
      accessorKey: 'status',
      header: t('status'),
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (
        <Badge className={statusColorMap[row.original.status] || 'bg-muted text-foreground'}>
          {tCount(`statuses.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'progressPercent',
      header: tCount('progress'),
      enableSorting: false,
      size: 90,
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.progressPercent}%</span>,
    },
    {
      id: 'actions',
      header: () => <div className="text-center">{t('actions')}</div>,
      enableSorting: false,
      size: 60,
      meta: { sticky: 'right' },
      cell: ({ row }) => {
        const item = row.original
        const canGenerate = ['DRAFT', 'PENDING_SCOPE', 'SCOPE_FAILED'].includes(item.status)
        const canCancel = ['DRAFT', 'PENDING_SCOPE', 'SCOPE_FAILED', 'READY'].includes(item.status)

        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={submittingAction}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/inventory/counts/${item.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {t('view')}
                    </Link>
                  </DropdownMenuItem>
                  {['DRAFT', 'PENDING_SCOPE', 'SCOPE_FAILED'].includes(item.status) && (
                    <DropdownMenuItem asChild>
                      <Link href={`/inventory/counts/${item.id}/edit`} className="flex items-center">
                        {t('edit')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canGenerate && (
                    <DropdownMenuItem onClick={() => setPendingAction({ type: 'generate', row: item })}>
                      {tCount('generateScope')}
                    </DropdownMenuItem>
                  )}
                {canCancel && (
                  <DropdownMenuItem onClick={() => setPendingAction({ type: 'cancel', row: item })}>
                    {tCount('cancelOrder')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [submittingAction, t, tCount])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Link href="/inventory/counts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tCount('create')}
            </Button>
          </Link>
        </div>
      </div>

      <InventoryCountFilter />

      <DataTable
        tableId="inventory-count-orders"
        columns={columns}
        data={rows}
        total={total}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        loading={loading}
        enableColumnVisibility={false}
      />

      <AlertDialog open={pendingAction?.type === 'cancel'} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="top-[72px] translate-y-0">
          <AlertDialogHeader>
            <AlertDialogTitle>{tCount('confirmCancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{tCount('confirmCancel')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingAction}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction?.type === 'cancel' && void handleCancelOrder(pendingAction.row)}
              disabled={submittingAction}
            >
              {submittingAction ? t('submitting') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingAction?.type === 'generate'} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="top-[72px] translate-y-0">
          <AlertDialogHeader>
            <AlertDialogTitle>{tCount('confirmGenerateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{tCount('confirmGenerate')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingAction}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction?.type === 'generate' && void handleGenerateScope(pendingAction.row)}
              disabled={submittingAction}
            >
              {submittingAction ? tCount('generating') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function InventoryCountsPage() {
  return (
    <Suspense fallback={null}>
      <InventoryCountsContent />
    </Suspense>
  )
}
