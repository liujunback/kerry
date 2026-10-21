'use client'

import { useCallback, useEffect, useState, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatInShanghaiTZ } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Loader2, Eye, MoreHorizontal, Copy, RotateCcw, CheckCircle2, Package, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
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
import { AsnFilter } from '@/components/asn/asn-filter'
import { AsnStatusBadge } from '@/components/asn/asn-status-badge'
import { AsnTypeBadge } from '@/components/asn/asn-type-badge'

interface Asn {
  id: string
  asnNumber: string
  externalNumber: string | null
  asnType: string
  receiving_method: string | null
  status: string
  expectedArrivalDate: string | null
  actualArrivalAt: string | null
  receivingEndAt: string | null
  totalExpectedQty: number
  totalReceivedQty: number
  totalPutawayQty: number
  createdAt: string
  client: {
    clientCode: string
    clientName: string
  } | null
  warehouse: {
    warehouseCode: string
    warehouseName: string
  } | null
}

type DialogType = 'rollback' | 'forceReceiving' | 'forcePutaway' | null

function AsnListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inbound') }],
    module: { label: t('title'), href: '/asn' },
  })

  const [asns, setAsns] = useState<Asn[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [selectedAsn, setSelectedAsn] = useState<Asn | null>(null)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const hasInvalidSelectableQuery = ['clientId', 'warehouseId'].some(
    (key) => searchParams.get(key) === 'all'
  )

  const fetchAsns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      const res = await fetch(`/api/v1/asn?${params}`)
      const data = await res.json()
      if (data.success) {
        setAsns(data.data.items)
        setTotal(data.data.pagination.total)
      } else {
        toast.error(data.message || t('fetchFailed'))
      }
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams, t])

  useEffect(() => {
    if (hasInvalidSelectableQuery) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('clientId')
      params.delete('warehouseId')
      router.replace(params.toString() ? `/asn?${params.toString()}` : '/asn')
      return
    }

    fetchAsns()
  }, [fetchAsns, hasInvalidSelectableQuery, router, searchParams])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/asn?${params.toString()}`)
  }

  const handleSortingChange = (sorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sorting.length > 0) {
      params.set('sortBy', sorting[0].id)
      params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }
    params.set('page', '1')
    router.push(`/asn?${params.toString()}`)
  }

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }, [tCommon])

  const openDialog = (type: DialogType, asn: Asn) => {
    setSelectedAsn(asn)
    setDialogType(type)
  }

  const closeDialog = () => {
    setDialogType(null)
    setSelectedAsn(null)
  }

  const handleRollback = async () => {
    if (!selectedAsn) return
    setLoadingId(selectedAsn.id)
    try {
      const response = await fetch(`/api/v1/asn/${selectedAsn.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User rollback' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('rollbackSuccess'))
        fetchAsns()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }

  const handleForceCompleteReceiving = async () => {
    if (!selectedAsn) return
    setLoadingId(selectedAsn.id)
    try {
      const response = await fetch(`/api/v1/asn/${selectedAsn.id}/force-complete-receiving`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Force complete by user' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('forceCompleteReceivingSuccess'))
        fetchAsns()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }

  const handleForceCompletePutaway = async () => {
    if (!selectedAsn) return
    setLoadingId(selectedAsn.id)
    try {
      const response = await fetch(`/api/v1/asn/${selectedAsn.id}/force-complete-putaway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Force complete by user' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('forceCompletePutawaySuccess'))
        fetchAsns()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }

  const canRollback = (status: string) => ['CANCELLED'].includes(status)
  const canForceReceiving = (status: string) => ['RECEIVING'].includes(status)
  const canForcePutaway = (status: string) => ['PUTTING_AWAY'].includes(status)
  const canStartReceiving = (status: string) => ['PENDING_RECEIVING', 'RECEIVING'].includes(status)

  // 根据收货方式获取跳转路径
  const getReceivingPath = (asn: Asn) => {
    const baseParams = `?asn=${asn.asnNumber}`
    if (asn.receiving_method === 'SKU') {
      return `/receiving/sku${baseParams}`
    } else if (asn.receiving_method === 'CONTAINER') {
      return `/receiving/container${baseParams}`
    }
    return `/receiving${baseParams}`
  }

  const columns: ColumnDef<Asn>[] = useMemo(
    () => [
      // 选择列
      {
        accessorKey: 'asnNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('number')} />,
        size: 260,
        cell: ({ row }) => {
          const asn = row.original
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-0.5">
                <Link
                  href={`/asn/${asn.id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {asn.asnNumber}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => handleCopy(asn.asnNumber)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {asn.externalNumber && (
                <div className="text-xs text-muted-foreground">{asn.externalNumber}</div>
              )}
            </div>
          )
        },
      },
      {
        id: 'asnType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('asnType')} />,
        size: 80,
        cell: ({ row }) => <AsnTypeBadge type={row.original.asnType} />,
      },
      {
        id: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 80,
        cell: ({ row }) => <AsnStatusBadge status={row.original.status} />,
      },
      {
        id: 'receivingMethod',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('receivingMethod')} />,
        size: 70,
        cell: ({ row }) => {
          const asn = row.original
          return (
            <span className="text-xs">
              {asn.receiving_method ? t(`receivingMethods.${asn.receiving_method}`) : '-'}
            </span>
          )
        },
      },
      {
        id: 'client',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('client')} />,
        size: 100,
        cell: ({ row }) => (
          <div className="text-xs truncate max-w-[100px]">{row.original.client?.clientName || '-'}</div>
        ),
      },
      {
        id: 'warehouse',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('warehouse')} />,
        size: 100,
        cell: ({ row }) => (
          <div className="text-xs truncate max-w-[100px]">{row.original.warehouse?.warehouseName || '-'}</div>
        ),
      },
      {
        id: 'quantities',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('quantities')} />,
        size: 130,
        cell: ({ row }) => {
          const asn = row.original
          return (
            <div className="text-xs tabular-nums">
              <span className="font-medium">{asn.totalExpectedQty}</span>
              <span className="text-muted-foreground mx-0.5">/</span>
              <span className="font-medium">{asn.totalReceivedQty}</span>
              <span className="text-muted-foreground mx-0.5">/</span>
              <span className="font-medium">{asn.totalPutawayQty}</span>
            </div>
          )
        },
      },
      {
        id: 'dates',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('date')} />,
        size: 100,
        cell: ({ row }) => {
          const asn = row.original
          return (
            <div className="text-xs text-muted-foreground">
              <div>{formatInShanghaiTZ(asn.createdAt, 'yy-MM-dd HH:mm') || '-'}</div>
              {asn.actualArrivalAt && <div>{formatInShanghaiTZ(asn.actualArrivalAt, 'yy-MM-dd HH:mm')}</div>}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' },
        cell: ({ row }) => {
          const asn = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loadingId === asn.id}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/asn/${asn.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  {canStartReceiving(asn.status) && (
                    <DropdownMenuItem asChild>
                      <Link href={getReceivingPath(asn)} className="flex items-center">
                        <PackageOpen className="mr-2 h-4 w-4" />
                        {t('actions.startReceiving')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canRollback(asn.status) && (
                    <DropdownMenuItem onClick={() => openDialog('rollback', asn)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t('actions.rollback')}
                    </DropdownMenuItem>
                  )}
                  {canForceReceiving(asn.status) && (
                    <DropdownMenuItem onClick={() => openDialog('forceReceiving', asn)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('actions.forceCompleteReceiving')}
                    </DropdownMenuItem>
                  )}
                  {canForcePutaway(asn.status) && (
                    <DropdownMenuItem onClick={() => openDialog('forcePutaway', asn)}>
                      <Package className="mr-2 h-4 w-4" />
                      {t('actions.forceCompletePutaway')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, tCommon, loadingId, handleCopy]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
      </div>

      <AsnFilter />

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="asn-list"
          columns={columns}
          data={asns}
          getRowId={(row) => row.id}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>

      <AlertDialog open={dialogType === 'rollback'} onOpenChange={() => closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmRollback')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmRollbackDesc', { name: selectedAsn?.asnNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialogType === 'forceReceiving'} onOpenChange={() => closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmForceCompleteReceiving')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmForceCompleteReceivingDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceCompleteReceiving}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialogType === 'forcePutaway'} onOpenChange={() => closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmForceCompletePutaway')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmForceCompletePutawayDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceCompletePutaway}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function AsnListPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AsnListContent />
    </Suspense>
  )
}
