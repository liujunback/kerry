'use client'

import { useCallback, useEffect, useMemo, Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { SerialNumberFilter } from '@/components/inventory/serial-number-filter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'

interface SerialNumberRecord {
  id: string
  serialNumber: string
  status: string
  sku: {
    id: string
    skuCode: string
    skuName: string | null
  } | null
  client: {
    id: string
    clientCode: string
    clientName: string
  } | null
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  } | null
  receivedAsn: {
    id: string
    asnNumber: string
  } | null
  shippedOrder: {
    id: string
    orderNumber: string
  } | null
  putawayOrderId: string | null
  receivedAt: string | null
  putawayAt: string | null
  shippedAt: string | null
  createdAt: string
  updatedAt: string
}

const sortableColumns = new Set([
  'serialNumber',
  'status',
  'receivedAt',
  'putawayAt',
  'shippedAt',
  'createdAt',
  'updatedAt',
])

function SerialNumbersContent() {
  const t = useTranslations('inventory.serialNumbers')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: t('title'), href: '/inventory/serial-numbers' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [records, setRecords] = useState<SerialNumberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortableColumns.has(sortBy)
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : [{ id: 'createdAt', desc: true }]

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const response = await fetch(`/api/v1/serial-numbers?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setRecords(result.data)
        setTotal(result.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch serial numbers:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/inventory/serial-numbers?${params.toString()}`)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextSort = newSorting[0]

    if (nextSort && sortableColumns.has(nextSort.id)) {
      params.set('sortBy', nextSort.id)
      params.set('sortOrder', nextSort.desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }

    params.set('page', '1')
    router.push(`/inventory/serial-numbers?${params.toString()}`)
  }

  const formatDate = (dateStr: string | null) => {
    return dateStr ? formatDateTime(dateStr) || '-' : '-'
  }

  const getStatusBadge = useCallback((status: string) => {
    const colorMap: Record<string, string> = {
      IN_STOCK: 'bg-green-100 text-green-800',
      PACKED: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-orange-100 text-orange-800',
      RETURNED: 'bg-purple-100 text-purple-800',
    }

    const label = ['IN_STOCK', 'PACKED', 'SHIPPED', 'RETURNED'].includes(status)
      ? t(`statuses.${status}`)
      : status

    return <Badge className={colorMap[status] || 'bg-gray-100 text-gray-800'}>{label}</Badge>
  }, [t])

  const columns: ColumnDef<SerialNumberRecord>[] = useMemo(
    () => [
      {
        accessorKey: 'serialNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('serialNumber')} />,
        size: 180,
        cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.serialNumber}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 110,
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'sku',
        header: t('sku'),
        size: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-xs">{row.original.sku?.skuCode || '-'}</div>
            {row.original.sku?.skuName && (
              <div className="text-xs text-muted-foreground truncate max-w-[220px]">{row.original.sku.skuName}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'client',
        header: t('client'),
        size: 160,
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-xs">{row.original.client?.clientCode || '-'}</div>
            {row.original.client?.clientName && (
              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{row.original.client.clientName}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'warehouse',
        header: t('warehouse'),
        size: 150,
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-xs">{row.original.warehouse?.warehouseCode || '-'}</div>
            {row.original.warehouse?.warehouseName && (
              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{row.original.warehouse.warehouseName}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'receivedAsn',
        header: t('receivedAsn'),
        size: 150,
        enableSorting: false,
        cell: ({ row }) => row.original.receivedAsn ? (
          <Link href={`/asn/${row.original.receivedAsn.id}`} className="font-mono text-xs text-blue-600 hover:underline">
            {row.original.receivedAsn.asnNumber}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
      },
      {
        accessorKey: 'shippedOrder',
        header: t('shippedOrder'),
        size: 150,
        enableSorting: false,
        cell: ({ row }) => row.original.shippedOrder ? (
          <Link href={`/orders/${row.original.shippedOrder.id}`} className="font-mono text-xs text-blue-600 hover:underline">
            {row.original.shippedOrder.orderNumber}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
      },
      {
        accessorKey: 'receivedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('receivedAt')} />,
        size: 155,
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.receivedAt)}</span>,
      },
      {
        accessorKey: 'putawayAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('putawayAt')} />,
        size: 155,
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.putawayAt)}</span>,
      },
      {
        accessorKey: 'shippedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('shippedAt')} />,
        size: 155,
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.shippedAt)}</span>,
      },
    ],
    [getStatusBadge, t]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <Button variant="outline" size="icon" onClick={fetchRecords}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <SerialNumberFilter />

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="serial-numbers-list"
          columns={columns}
          data={records}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          loading={loading}
          enableSorting
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>
    </div>
  )
}

export default function SerialNumbersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SerialNumbersContent />
    </Suspense>
  )
}
