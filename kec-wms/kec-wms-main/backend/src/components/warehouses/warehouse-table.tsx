'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { WarehouseStatusBadge } from './warehouse-status-badge'
import { WarehouseTypeBadge } from './warehouse-type-badge'

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
  warehouseType: string
  address?: string | null
  city?: string | null
  region?: string | null
  warehouseArea?: number | null
  status: string
  createdAt: string
  _count: {
    zones: number
    binLocations: number
  }
}

interface WarehouseTableProps {
  warehouses: Warehouse[]
  total: number
  pagination: PaginationState
  sorting: SortingState
  loading?: boolean
  onRefresh?: () => void
  onPaginationChange: (pagination: PaginationState) => void
  onSortingChange: (sorting: SortingState) => void
}

const statusOptions = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const

export function WarehouseTable({
  warehouses,
  total,
  pagination,
  sorting,
  loading = false,
  onRefresh,
  onPaginationChange,
  onSortingChange,
}: WarehouseTableProps) {
  const router = useRouter()
  const t = useTranslations('warehouse')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null)

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }, [tCommon])

  const handleStatusChange = useCallback(async (warehouseId: string, newStatus: string) => {
    setLoadingId(warehouseId)
    try {
      const response = await fetch(`/api/v1/warehouses/${warehouseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('statusUpdateSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }, [onRefresh, router, t, tCommon])

  const handleDelete = useCallback(async () => {
    if (!warehouseToDelete) return

    setLoadingId(warehouseToDelete.id)
    try {
      const response = await fetch(`/api/v1/warehouses/${warehouseToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('deleteSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      setDeleteDialogOpen(false)
      setWarehouseToDelete(null)
    }
  }, [onRefresh, router, t, tCommon, warehouseToDelete])

  const columns: ColumnDef<Warehouse>[] = useMemo(
    () => [
      {
        accessorKey: 'warehouseCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('code')} />,
        size: 160,
        cell: ({ row }) => {
          const warehouse = row.original

          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/warehouses/${warehouse.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {warehouse.warehouseCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(warehouse.warehouseCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'warehouseName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('name')} />,
        size: 180,
        cell: ({ row }) => <span className="text-xs">{row.original.warehouseName}</span>,
      },
      {
        accessorKey: 'warehouseType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('type')} />,
        size: 120,
        cell: ({ row }) => <WarehouseTypeBadge type={row.original.warehouseType} />,
      },
      {
        accessorKey: 'city',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('city')} />,
        size: 120,
        cell: ({ row }) => <span className="text-xs">{row.original.city || '-'}</span>,
      },
      {
        accessorKey: 'zones',
        header: t('zones'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs tabular-nums">{row.original._count.zones}</span>,
      },
      {
        accessorKey: 'bins',
        header: t('bins'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{row.original._count.binLocations}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('statusLabel')} />,
        size: 110,
        cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const warehouse = row.original

          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={loadingId === warehouse.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/warehouses/${warehouse.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/warehouses/${warehouse.id}/edit`} className="flex items-center">
                      <Pencil className="mr-2 h-4 w-4" />
                      {tCommon('edit')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-muted-foreground" disabled>
                    {t('changeStatus')}
                  </DropdownMenuItem>
                  {statusOptions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(warehouse.id, status)}
                      disabled={warehouse.status === status}
                    >
                      {t(`status.${status}`)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setWarehouseToDelete(warehouse)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [handleCopy, handleStatusChange, loadingId, t, tCommon]
  )

  return (
    <>
      <DataTable
        tableId="warehouses-list"
        columns={columns}
        data={warehouses}
        total={total}
        pagination={pagination}
        sorting={sorting}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
        loading={loading}
        enableSorting
        enableColumnVisibility={false}
        maxHeight="100%"
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDesc', { name: warehouseToDelete?.warehouseName || '' })}
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
    </>
  )
}
