'use client'

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RefreshCw, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { InventoryTransactionsFilter } from '@/components/inventory/inventory-transactions-filter'

interface InventoryEvent {
  id: string
  eventNumber: string
  eventType: string
  bucketType: string
  skuCode: string
  batchNumber: string
  lpn: string
  asnNumber: string
  quantityDelta: number
  quantityBefore: number
  quantityAfter: number
  referenceType: string | null
  referenceId: string | null
  referenceNumber: string | null
  reasonCode: string | null
  reasonDesc: string | null
  createdAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  } | null
  location: {
    locationCode: string
  } | null
  sku: {
    skuCode: string
    skuName: string
  } | null
  client: {
    clientCode: string
    clientName: string
  } | null
}

function InventoryTransactionsContent() {
  const tInv = useTranslations('inventory.transactions')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tInv('title'), href: '/inventory/transactions' },
  })
  const searchParams = useSearchParams()
  const router = useRouter()

  const [events, setEvents] = useState<InventoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const response = await fetch(`/api/v1/inventory/transactions?${params}`)
      const result = await response.json()

      if (result.success) {
        setEvents(result.data)
        setTotal(result.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch inventory events:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/inventory/transactions?${params.toString()}`)
  }

  const formatDate = (dateStr: string) => {
    return formatDateTime(dateStr) || '-'
  }

  const getEventTypeBadge = useCallback((type: string) => {
    const colorMap: Record<string, string> = {
      PUTAWAY: 'bg-green-100 text-green-800',
      ALLOCATE: 'bg-blue-100 text-blue-800',
      DEALLOCATE: 'bg-blue-50 text-blue-600',
      PICK: 'bg-purple-100 text-purple-800',
      UNPICK: 'bg-purple-50 text-purple-600',
      SHIP: 'bg-orange-100 text-orange-800',
      FREEZE: 'bg-cyan-100 text-cyan-800',
      UNFREEZE: 'bg-cyan-50 text-cyan-600',
      ADJUST: 'bg-yellow-100 text-yellow-800',
      PICK_SHORTAGE: 'bg-red-100 text-red-800',
      SUPPLEMENT_ALLOCATE: 'bg-blue-100 text-blue-800',
      SUPPLEMENT_PICK: 'bg-purple-100 text-purple-800',
      TRANSFER_OUT: 'bg-red-100 text-red-800',
      TRANSFER_IN: 'bg-green-100 text-green-800',
    }
    return (
      <Badge className={colorMap[type] || 'bg-gray-100 text-gray-800'}>
        {tInv(`eventTypes.${type}`)}
      </Badge>
    )
  }, [tInv])

  const getBucketTypeBadge = useCallback((type: string) => {
    const colorMap: Record<string, string> = {
      AVAILABLE: 'bg-green-100 text-green-800',
      ALLOCATED: 'bg-blue-100 text-blue-800',
      PICKING: 'bg-purple-100 text-purple-800',
      FROZEN: 'bg-orange-100 text-orange-800',
      DEFECTIVE: 'bg-red-100 text-red-800',
      EXCEPTION: 'bg-zinc-100 text-zinc-800',
      QC_HOLD: 'bg-yellow-100 text-yellow-800',
      COUNT_HOLD: 'bg-gray-100 text-gray-800',
      COUNT_SURPLUS: 'bg-emerald-100 text-emerald-800',
      COUNT_SHORTAGE: 'bg-rose-100 text-rose-800',
    }
    return (
      <Badge className={colorMap[type] || 'bg-gray-100 text-gray-800'}>
        {tInv(`bucketTypes.${type}`)}
      </Badge>
    )
  }, [tInv])

  const getReferenceLink = (referenceType: string | null, referenceId: string | null) => {
    if (!referenceType || !referenceId) return null

    const routeMap: Record<string, string> = {
      'ASN': '/asn',
      'SKU_SHELVING': '/asn',
      'CONTAINER_SHELVING': '/asn',
      'OUTBOUND_ORDER': '/orders',
      'SALES_ORDER': '/orders',
      'ADJUSTMENT': '/inventory/adjustments',
      'TRANSFER': '/inventory/transfers',
      'FREEZE': '/inventory/freezes',
      'UNFREEZE': '/inventory/freezes',
      'PICK_ORDER': '/pick-orders',
      'MANIFEST_ORDER': '/manifest-orders',
    }

    const basePath = routeMap[referenceType]
    return basePath ? `${basePath}/${referenceId}` : null
  }

  const columns: ColumnDef<InventoryEvent>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tInv('createdAt')} />,
        size: 150,
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt) || '-'}</span>,
      },
      {
        accessorKey: 'eventType',
        header: tInv('eventType'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => getEventTypeBadge(row.original.eventType),
      },
      {
        accessorKey: 'bucketType',
        header: tInv('bucketType'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => getBucketTypeBadge(row.original.bucketType),
      },
      {
        accessorKey: 'skuCode',
        header: tInv('skuCode'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-xs">{row.original.skuCode}</div>
            {row.original.sku?.skuName && (
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.sku.skuName}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'asnNumber',
        header: tInv('asnNumber'),
        size: 140,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.asnNumber || '-'}</span>
        ),
      },
      {
        accessorKey: 'customer',
        header: tInv('customer'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.client?.clientName || '-'}</span>,
      },
      {
        accessorKey: 'location',
        header: tInv('location'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {row.original.location?.locationCode || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'quantityDelta',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tInv('quantityChange')} />,
        size: 80,
        cell: ({ row }) => (
          <div>
            <span className={`inline-flex items-center gap-1 font-semibold text-xs ${row.original.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {row.original.quantityDelta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {row.original.quantityDelta > 0 ? '+' : ''}{row.original.quantityDelta}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'quantityAfter',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tInv('quantityAfter')} />,
        size: 60,
        cell: ({ row }) => <div className="text-xs font-medium">{row.original.quantityAfter}</div>,
      },
      {
        accessorKey: 'referenceNumber',
        header: tInv('referenceNumber'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const { referenceNumber, referenceType, referenceId } = row.original
          const link = getReferenceLink(referenceType, referenceId)

          return referenceNumber ? (
            link ? (
              <Link
                href={link}
                className="text-xs text-blue-600 hover:underline"
              >
                {referenceNumber}
              </Link>
            ) : (
              <span className="text-xs">{referenceNumber}</span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )
        },
      },
    ],
    [getBucketTypeBadge, getEventTypeBadge, tInv]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <Button variant="outline" size="icon" onClick={fetchEvents}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <InventoryTransactionsFilter />

      {/* Events List */}
      <div className="flex-1 min-h-0">
        <DataTable
          tableId="inventory-transactions"
          columns={columns}
          data={events}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>
    </div>
  )
}

export default function InventoryTransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <InventoryTransactionsContent />
    </Suspense>
  )
}
