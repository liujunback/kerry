'use client'

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RefreshCw, Eye, History, MoreHorizontal, Loader2, Copy } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { InventorySummaryFilter } from '@/components/inventory/inventory-summary-filter'

interface InventorySummary {
  id: string
  skuCode: string
  warehouseId: string
  clientId?: string
  quantityAvailable: number
  quantityAllocated: number
  quantityPicking: number
  quantityFrozen: number
  quantityDefective: number
  quantityException: number
  quantityQcHold: number
  quantityCountHold: number
  quantityCountSurplus: number
  quantityCountShortage: number
  pendingReceiveQty: number
  pendingPutawayQty: number
  totalOnHand: number
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  client?: {
    clientCode: string
    clientName: string
  }
}

const inventorySortParamByColumnId: Record<string, 'skuCode' | 'available' | 'total'> = {
  skuCode: 'skuCode',
  quantityAvailable: 'available',
  totalOnHand: 'total',
}

const inventorySortColumnIdByParam: Record<'skuCode' | 'available' | 'total', string> = {
  skuCode: 'skuCode',
  available: 'quantityAvailable',
  total: 'totalOnHand',
}

function InventoryContent() {
  const t = useTranslations('common')
  const tInv = useTranslations('inventory.summary')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tInv('title'), href: '/inventory' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [summaries, setSummaries] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') as 'skuCode' | 'available' | 'total' | null
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: inventorySortColumnIdByParam[sortBy], desc: sortOrder === 'desc' }]
    : []

  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const response = await fetch(`/api/v1/inventory/summary?${params}`)
      const result = await response.json()

      if (result.success) {
        setSummaries(result.data)
        setTotal(result.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch inventory summary:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/inventory?${params.toString()}`)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (newSorting.length > 0) {
      const sortByParam = inventorySortParamByColumnId[newSorting[0].id]
      if (sortByParam) {
        params.set('sortBy', sortByParam)
        params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
      }
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }

    router.push(`/inventory?${params.toString()}`)
  }

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(t('copySuccess'))
  }, [t])

  const columns: ColumnDef<InventorySummary>[] = useMemo(
    () => [
      {
        accessorKey: 'skuCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tInv('skuCode')} />,
        size: 150,
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/inventory/wm?skuCode=${encodeURIComponent(item.skuCode)}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {item.skuCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(item.skuCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'warehouse',
        header: tInv('warehouse'),
        size: 95,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.warehouse?.warehouseCode || row.original.warehouse?.warehouseName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'customer',
        header: tInv('customer'),
        size: 105,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.client?.clientName || '-'}</span>,
      },
      {
        accessorKey: 'pendingReceiveQty',
        header: tInv('pendingReceiveShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-sky-600 tabular-nums">{row.original.pendingReceiveQty}</div>,
      },
      {
        accessorKey: 'pendingPutawayQty',
        header: tInv('pendingPutawayShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-teal-600 tabular-nums">{row.original.pendingPutawayQty}</div>,
      },
      {
        accessorKey: 'quantityAvailable',
        header: tInv('availableShort'),
        size: 52,
        cell: ({ row }) => <div className="text-xs font-medium text-green-600 tabular-nums">{row.original.quantityAvailable}</div>,
      },
      {
        accessorKey: 'quantityAllocated',
        header: tInv('allocatedShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-blue-600 tabular-nums">{row.original.quantityAllocated}</div>,
      },
      {
        accessorKey: 'quantityPicking',
        header: tInv('pickedShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-purple-600 tabular-nums">{row.original.quantityPicking}</div>,
      },
      {
        accessorKey: 'quantityException',
        header: tInv('exceptionShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs font-medium text-zinc-700 tabular-nums">{row.original.quantityException}</div>,
      },
      {
        accessorKey: 'quantityDefective',
        header: tInv('defectiveShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-red-600 tabular-nums">{row.original.quantityDefective}</div>,
      },
      {
        accessorKey: 'quantityFrozen',
        header: tInv('frozenShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-orange-600 tabular-nums">{row.original.quantityFrozen}</div>,
      },
      {
        accessorKey: 'quantityCountSurplus',
        header: tInv('surplusShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-emerald-600 tabular-nums">{row.original.quantityCountSurplus}</div>,
      },
      {
        accessorKey: 'quantityCountShortage',
        header: tInv('shortageShort'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => <div className="text-xs text-rose-600 tabular-nums">{row.original.quantityCountShortage}</div>,
      },
      {
        accessorKey: 'totalOnHand',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tInv('onHandShort')} />,
        size: 56,
        cell: ({ row }) => (
          <div className="text-xs font-bold tabular-nums">
            {row.original.totalOnHand}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{t('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const item = row.original
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
                    <Link href={`/inventory/wm?skuCode=${item.skuCode}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tInv('viewDetail')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/inventory/transactions?skuCode=${item.skuCode}`} className="flex items-center">
                      <History className="mr-2 h-4 w-4" />
                      {tInv('viewTransactions')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [handleCopy, t, tInv]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <Button variant="outline" size="icon" onClick={fetchSummaries}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <InventorySummaryFilter />

      {/* Inventory List */}
      <div className="flex-1 min-h-0">
        <DataTable
          tableId="inventory-summary"
          columns={columns}
          data={summaries}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <InventoryContent />
    </Suspense>
  )
}
