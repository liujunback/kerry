'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ClientSelect } from '@/components/clients/client-select'
import { ListFilterCard, CompactFilterActions, EnumFilterSelect } from '@/components/list-filters'
import { ReturnStatusBadge, ReturnTypeBadge, returnStatusCodes, returnTypeCodes, useReturnLabels } from '@/components/returns/return-labels'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface ReturnOrder {
  id: string
  returnNo: string
  returnType: string
  preReturnNo: string | null
  logisticsNo: string
  outboundOrderNo: string | null
  platformOrderNo: string | null
  status: string
  totalExpectedQty: number
  totalCountedQty: number
  totalPutawayQty: number
  createdAt: string
  client?: { clientCode: string; clientName: string } | null
  warehouse?: { warehouseCode: string; warehouseName: string } | null
}

const statuses = [...returnStatusCodes]
const returnTypes = [...returnTypeCodes]
const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'
const filterRowShellClassName = 'grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end'
const primaryFilterGridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end'

function ReturnsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('returns')
  const tCommon = useTranslations('common')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.returns') }],
    module: { label: t('list.title'), href: '/returns' },
  })

  const [items, setItems] = useState<ReturnOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = { pageIndex: page - 1, pageSize }
  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : []

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      const response = await fetch(`/api/v1/returns?${params.toString()}`)
      const result = await response.json()
      if (!result.success) throw new Error(result.message || t('list.fetchFailed'))
      setItems(result.data.items || [])
      setTotal(result.data.pagination?.total || 0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('list.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchParams, t])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const handlePaginationChange = (next: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(next.pageIndex + 1))
    params.set('pageSize', String(next.pageSize))
    router.push(`/returns?${params.toString()}`)
  }

  const handleSortingChange = (next: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) {
      params.set('sortBy', next[0].id)
      params.set('sortOrder', next[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }
    params.set('page', '1')
    router.push(`/returns?${params.toString()}`)
  }

  const columns = useMemo<ColumnDef<ReturnOrder>[]>(() => [
    {
      accessorKey: 'returnNo',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('fields.returnNo')} />,
      cell: ({ row }) => (
        <Link href={`/returns/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.returnNo}
        </Link>
      ),
    },
    {
      accessorKey: 'logisticsNo',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('fields.logisticsNo')} />,
    },
    {
      accessorKey: 'returnType',
      header: t('fields.type'),
      cell: ({ row }) => <ReturnTypeBadge type={row.original.returnType} />,
    },
    {
      accessorKey: 'status',
      header: tCommon('status'),
      cell: ({ row }) => <ReturnStatusBadge status={row.original.status} />,
    },
    {
      id: 'client',
      header: tCommon('client'),
      cell: ({ row }) => row.original.client ? `${row.original.client.clientCode} / ${row.original.client.clientName}` : '-',
    },
    {
      accessorKey: 'totalCountedQty',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('fields.qtyProgress')} />,
      cell: ({ row }) => `${row.original.totalExpectedQty} / ${row.original.totalCountedQty} / ${row.original.totalPutawayQty}`,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={tCommon('createdAt')} />,
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: 'actions',
      size: 96,
      header: tCommon('actions'),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/returns/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                {tCommon('view')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/returns/counting?logisticsNo=${encodeURIComponent(row.original.logisticsNo)}`}>{t('actions.enterCounting')}</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      meta: { sticky: 'right' },
    },
  ], [t, tCommon])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-shrink-0 items-center justify-between gap-3">
        <Breadcrumb items={breadcrumb.list()} />
      </div>
      <ReturnFilter />
      <div className="min-h-0 flex-1">
        <DataTable
          tableId="return-list"
          columns={columns}
          data={items}
          getRowId={(row) => row.id}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          manualPagination
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
          loading={loading}
        />
      </div>
    </div>
  )
}

function ReturnFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('returns')
  const tCommon = useTranslations('common')
  const { returnStatusLabels, returnTypeLabels } = useReturnLabels()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [returnType, setReturnType] = useState(searchParams.get('returnType') || '')
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '')

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    ;[
      ['search', search],
      ['status', status],
      ['returnType', returnType],
      ['clientId', clientId],
    ].forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    router.push(`/returns?${params.toString()}`)
  }

  const reset = () => {
    router.push('/returns')
    setSearch('')
    setStatus('')
    setReturnType('')
    setClientId('')
  }

  return (
    <ListFilterCard mode="advanced">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
      >
        <div className={filterRowShellClassName}>
          <div className={primaryFilterGridClassName}>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('filters.keyword')}</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-sm"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('filters.searchPlaceholder')}
                />
              </div>
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('status')}</span>
              <EnumFilterSelect allLabel={t('filters.allStatuses')} value={status} onValueChange={setStatus} options={statuses.map((value) => ({ value, label: returnStatusLabels[value] }))} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{t('fields.type')}</span>
              <EnumFilterSelect allLabel={t('filters.allTypes')} value={returnType} onValueChange={setReturnType} options={returnTypes.map((value) => ({ value, label: returnTypeLabels[value] }))} />
            </div>
            <div className={filterFieldClassName}>
              <span className="text-xs text-muted-foreground">{tCommon('client')}</span>
              <ClientSelect value={clientId} onValueChange={setClientId} showAll className="h-8" />
            </div>
          </div>
          <CompactFilterActions
            className="mt-4 xl:mt-0 xl:w-[180px] xl:shrink-0"
            pendingChangeCount={0}
            searchLabel={tCommon('search')}
            resetLabel={tCommon('reset')}
            moreLabel={t('filters.more')}
            collapseLabel={t('filters.collapse')}
            expanded={false}
            showToggle={false}
            onReset={reset}
            onToggleExpanded={() => undefined}
          />
        </div>
      </form>
    </ListFilterCard>
  )
}

export default function ReturnsPage() {
  return (
    <Suspense>
      <ReturnsContent />
    </Suspense>
  )
}
