'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { Eye, MoreHorizontal } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { CompactFilterActions, EnumFilterSelect, ListFilterCard } from '@/components/list-filters'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CheckoutOrder {
  id: string
  checkoutNumber: string
  checkoutType: string
  status: string
  channelName: string | null
  channelCode: string | null
  orderCount: number
  parcelCount: number
  checkedOutAt: string | null
  createdAt: string
  operatorName: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
}

const typeColors: Record<string, string> = {
  PALLET: 'bg-purple-500 text-white',
  BAG: 'bg-orange-500 text-white',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500 text-white',
  CHECKED_OUT: 'bg-green-500 text-white',
  MOUNTED: 'bg-blue-500 text-white',
  MANIFESTED: 'bg-indigo-500 text-white',
}

const filterFieldClassName = 'flex min-w-0 h-full flex-col justify-end gap-1'

function CheckoutOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('checkout')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const tMenu = useTranslations('menu')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: tMenu('checkoutOrders'), href: '/checkout-orders' },
  })

  const [orders, setOrders] = useState<CheckoutOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const pagination: PaginationState = { pageIndex: page - 1, pageSize }

  const orderNumber = searchParams.get('orderNumber') || ''
  const trackingNumber = searchParams.get('trackingNumber') || ''
  const checkoutNumber = searchParams.get('checkoutNumber') || searchParams.get('palletNumber') || searchParams.get('bagNumber') || ''
  const channelCode = searchParams.get('channelCode') || ''
  const checkoutType = searchParams.get('checkoutType') || ''
  const status = searchParams.get('status') || ''

  // 本地输入状态（未提交）
  const [localOrderNumber, setLocalOrderNumber] = useState(orderNumber)
  const [localTrackingNumber, setLocalTrackingNumber] = useState(trackingNumber)
  const [localCheckoutNumber, setLocalCheckoutNumber] = useState(checkoutNumber)
  const [localChannelCode, setLocalChannelCode] = useState(channelCode)
  const [localCheckoutType, setLocalCheckoutType] = useState(checkoutType)
  const [localStatus, setLocalStatus] = useState(status)

  useEffect(() => {
    setLocalOrderNumber(orderNumber)
    setLocalTrackingNumber(trackingNumber)
    setLocalCheckoutNumber(checkoutNumber)
    setLocalChannelCode(channelCode)
    setLocalCheckoutType(checkoutType)
    setLocalStatus(status)
  }, [orderNumber, trackingNumber, checkoutNumber, channelCode, checkoutType, status])

  const pendingChangeCount = [
    localOrderNumber !== orderNumber,
    localTrackingNumber !== trackingNumber,
    localCheckoutNumber !== checkoutNumber,
    localChannelCode !== channelCode,
    localCheckoutType !== checkoutType,
    localStatus !== status,
  ].filter(Boolean).length

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
      if (orderNumber) params.set('orderNumber', orderNumber)
      if (trackingNumber) params.set('trackingNumber', trackingNumber)
      if (checkoutNumber) params.set('checkoutNumber', checkoutNumber)
      if (channelCode) params.set('channelCode', channelCode)
      if (checkoutType) params.set('checkoutType', checkoutType)
      if (status) params.set('status', status)
      const res = await fetch(`/api/v1/checkout?${params}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch checkout orders:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, orderNumber, trackingNumber, checkoutNumber, channelCode, checkoutType, status])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    params.set('page', '1')
    router.push(`/checkout-orders?${params.toString()}`)
  }

  const handleSearch = () => {
    updateParams({
      orderNumber: localOrderNumber,
      trackingNumber: localTrackingNumber,
      checkoutNumber: localCheckoutNumber,
      palletNumber: '',
      bagNumber: '',
      channelCode: localChannelCode,
      checkoutType: localCheckoutType,
      status: localStatus,
    })
  }

  const handleReset = () => {
    setLocalOrderNumber('')
    setLocalTrackingNumber('')
    setLocalCheckoutNumber('')
    setLocalChannelCode('')
    setLocalCheckoutType('')
    setLocalStatus('')
    router.push('/checkout-orders')
  }

  const handlePaginationChange = (p: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (p.pageIndex + 1).toString())
    params.set('pageSize', p.pageSize.toString())
    router.push(`/checkout-orders?${params.toString()}`)
  }

  const columns: ColumnDef<CheckoutOrder>[] = useMemo(() => [
    {
      accessorKey: 'checkoutNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.checkoutNumber')} />,
      size: 200,
      cell: ({ row }) => (
        <Link
          href={`/checkout-orders/${row.original.id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.checkoutNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'warehouse.warehouseName',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.warehouse')} />,
      size: 140,
      cell: ({ row }) => <span className="text-xs">{row.original.warehouse?.warehouseName || '-'}</span>,
    },
    {
      accessorKey: 'checkoutType',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('checkoutType.label')} />,
      size: 100,
      cell: ({ row }) => (
        <Badge className={typeColors[row.original.checkoutType] || 'bg-gray-500 text-white'}>
          {row.original.checkoutType === 'PALLET' ? t('checkoutType.pallet') : t('checkoutType.bag')}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('status.label')} />,
      size: 100,
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] || 'bg-gray-500 text-white'}>
          {t(`status.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'channelName',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.channelName')} />,
      size: 120,
      cell: ({ row }) => <span className="text-xs">{row.original.channelName || '-'}</span>,
    },
    {
      accessorKey: 'orderCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.orderCount')} />,
      size: 90,
      cell: ({ row }) => <div className="text-right">{row.original.orderCount}</div>,
    },
    {
      accessorKey: 'parcelCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.parcelCount')} />,
      size: 90,
      cell: ({ row }) => <div className="text-right">{row.original.parcelCount}</div>,
    },
    {
      accessorKey: 'operatorName',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.operator')} />,
      size: 100,
      cell: ({ row }) => <span className="text-xs">{row.original.operatorName || '-'}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.startTime')} />,
      size: 160,
      cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.createdAt) || '-'}</span>,
    },
    {
      accessorKey: 'checkedOutAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('column.completedTime')} />,
      size: 160,
      cell: ({ row }) => <span className="text-xs">{row.original.checkedOutAt ? formatDateTime(row.original.checkedOutAt) : '-'}</span>,
    },
    {
      id: 'actions',
      header: () => <div className="text-center">{tCommon('actions')}</div>,
      size: 60,
      meta: { sticky: 'right' },
      cell: ({ row }) => (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/checkout-orders/${row.original.id}`} className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  {t('detail.viewDetail')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [t, tCommon])

  return (
    <div className="flex flex-col h-full gap-2">
      <Breadcrumb items={breadcrumb.list()} />

      {/* 筛选条件 */}
      <ListFilterCard mode="advanced">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSearch()
          }}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8 xl:items-end">
              <div className={`${filterFieldClassName} xl:col-span-2`}>
                <span className="text-xs text-muted-foreground">{t('filter.orderNumber')}</span>
                <Input value={localOrderNumber} onChange={(e) => setLocalOrderNumber(e.target.value)} className="h-8" />
              </div>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('filter.trackingNumber')}</span>
                <Input value={localTrackingNumber} onChange={(e) => setLocalTrackingNumber(e.target.value)} className="h-8" />
              </div>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('column.checkoutNumber')}</span>
                <Input value={localCheckoutNumber} onChange={(e) => setLocalCheckoutNumber(e.target.value)} className="h-8" />
              </div>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('filter.channelCode')}</span>
                <Input value={localChannelCode} onChange={(e) => setLocalChannelCode(e.target.value)} className="h-8" />
              </div>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('checkoutType.label')}</span>
                <EnumFilterSelect
                  value={localCheckoutType}
                  onValueChange={setLocalCheckoutType}
                  allLabel={tCommon('all')}
                  options={[
                    { value: 'PALLET', label: t('checkoutType.pallet') },
                    { value: 'BAG', label: t('checkoutType.bag') },
                  ]}
                />
              </div>
              <div className={filterFieldClassName}>
                <span className="text-xs text-muted-foreground">{t('status.label')}</span>
                <EnumFilterSelect
                  value={localStatus}
                  onValueChange={setLocalStatus}
                  allLabel={tCommon('all')}
                  options={[
                    { value: 'PENDING', label: t('status.PENDING') },
                    { value: 'CHECKED_OUT', label: t('status.CHECKED_OUT') },
                    { value: 'MOUNTED', label: t('status.MOUNTED') },
                    { value: 'MANIFESTED', label: t('status.MANIFESTED') },
                  ]}
                />
              </div>
              <div className={filterFieldClassName}>
                <span className="invisible text-xs">Actions</span>
                <CompactFilterActions
                  pendingChangeCount={pendingChangeCount}
                  searchLabel={tCommon('search')}
                  resetLabel={tCommon('reset')}
                  moreLabel=""
                  collapseLabel=""
                  expanded={false}
                  onReset={handleReset}
                  onToggleExpanded={() => {}}
                  showToggle={false}
                />
              </div>
          </div>
        </form>
      </ListFilterCard>

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="checkout-orders-list"
          columns={columns}
          data={orders}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={false}
          enableColumnVisibility={false}
          enableRowSelection={false}
          maxHeight="100%"
        />
      </div>
    </div>
  )
}

export default function CheckoutOrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutOrdersContent />
    </Suspense>
  )
}
