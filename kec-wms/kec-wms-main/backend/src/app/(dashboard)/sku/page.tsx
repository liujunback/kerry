'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { RefreshCw, Copy, MoreHorizontal, Eye, Pencil, Trash2, FolderTree, Loader2 } from 'lucide-react'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
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
import { SkuFilter } from '@/components/sku/sku-filter'
import { SkuStatusBadge } from '@/components/sku/sku-status-badge'
import { formatDate } from '@/lib/utils/date-formatter'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface Sku {
  id: string
  skuCode: string
  skuName: string
  barcode: string | null
  unit: string | null
  storageCondition: string | null
  abcClass: string | null
  isBatchManaged: boolean
  isSerialManaged: boolean
  isFirstReceiving: boolean
  isSelfPackaged: boolean
  imageUrl: string | null
  status: string
  createdAt: string
  client: { id: string; clientCode: string; clientName: string } | null
  category: { id: string; categoryCode: string; categoryName: string } | null
  _count: { uoms: number; barcodes: number; inventoryBuckets: number }
}

interface Category {
  id: string
  categoryCode: string
  categoryName: string
}

function SkuContent() {
  const t = useTranslations('sku')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/sku' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [skus, setSkus] = useState<Sku[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [skuToDelete, setSkuToDelete] = useState<Sku | null>(null)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/sku-categories?pageSize=100&isActive=true')
      const data = await res.json()
      if (data.success) setCategories(data.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchSkus = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const res = await fetch(`/api/v1/skus?${params}`)
      const data = await res.json()
      if (data.success) {
        setSkus(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch skus:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchSkus()
  }, [searchParams])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/sku?${params.toString()}`)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }
    router.push(`/sku?${params.toString()}`)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/v1/skus/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('statusUpdateSuccess'))
        fetchSkus()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async () => {
    if (!skuToDelete) return
    setLoadingId(skuToDelete.id)
    try {
      const response = await fetch(`/api/v1/skus/${skuToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('deleteSuccess'))
        fetchSkus()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      setDeleteDialogOpen(false)
      setSkuToDelete(null)
    }
  }

  const columns: ColumnDef<Sku>[] = useMemo(
    () => [
      {
        accessorKey: 'skuCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('code')} />,
        size: 150,
        cell: ({ row }) => {
          const sku = row.original
          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/sku/${sku.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {sku.skuCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(sku.skuCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'skuName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('name')} />,
        size: 200,
        cell: ({ row }) => <span className="text-xs">{row.original.skuName}</span>,
      },
      {
        accessorKey: 'barcode',
        header: t('barcode'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs font-mono">{row.original.barcode || '-'}</span>,
      },
      {
        accessorKey: 'client',
        header: t('client'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.client?.clientCode || '-'}</span>,
      },
      {
        accessorKey: 'category',
        header: t('category'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.category?.categoryName || '-'}</span>,
      },
      {
        accessorKey: 'unit',
        header: t('unit'),
        size: 60,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.unit || '-'}</span>,
      },
      {
        accessorKey: 'flags',
        header: t('flags'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const sku = row.original
          return (
            <div className="flex gap-1 flex-wrap">
              {sku.isBatchManaged && <Badge variant="outline" className="text-xs px-1">批次</Badge>}
              {sku.isSerialManaged && <Badge variant="outline" className="text-xs px-1">序列</Badge>}
              {sku.isFirstReceiving && <Badge variant="secondary" className="text-xs px-1">新品</Badge>}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tCommon('status')} />,
        size: 80,
        cell: ({ row }) => <SkuStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tCommon('createdAt')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap">
            {formatDate(row.original.createdAt) || '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const sku = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loadingId === sku.id}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/sku/${sku.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/sku/${sku.id}/edit`} className="flex items-center">
                      <Pencil className="mr-2 h-4 w-4" />
                      {tCommon('edit')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-muted-foreground" disabled>
                    {t('changeStatus')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(sku.id, 'ACTIVE')}
                    disabled={sku.status === 'ACTIVE'}
                  >
                    {t('statuses.ACTIVE')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(sku.id, 'INACTIVE')}
                    disabled={sku.status === 'INACTIVE'}
                  >
                    {t('statuses.INACTIVE')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => { setSkuToDelete(sku); setDeleteDialogOpen(true) }}
                    disabled={sku._count.inventoryBuckets > 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, tCommon, loadingId]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchSkus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/sku/categories">
            <Button variant="outline">
              <FolderTree className="h-4 w-4 mr-2" />
              {t('categories.title')}
            </Button>
          </Link>
        </div>
      </div>

          <SkuFilter categories={categories} />

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="sku-list"
          columns={columns}
          data={skus}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDesc', { name: skuToDelete?.skuName || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function SkuPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SkuContent />
    </Suspense>
  )
}
