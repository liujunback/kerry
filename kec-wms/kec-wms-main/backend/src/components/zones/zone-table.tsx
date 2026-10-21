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
import { ZoneStatusBadge } from './zone-status-badge'
import { ZoneTypeBadge } from './zone-type-badge'

interface Zone {
  id: string
  zoneCode: string
  zoneName: string | null
  zoneType: string
  qualityType: string
  capacityUnits: number | null
  currentUnits: number
  status: string
  createdAt: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  _count: {
    binLocations: number
  }
}

interface ZoneTableProps {
  zones: Zone[]
  total: number
  pagination: PaginationState
  sorting: SortingState
  loading?: boolean
  onRefresh?: () => void
  onPaginationChange: (pagination: PaginationState) => void
  onSortingChange: (sorting: SortingState) => void
}

const statusOptions = ['ACTIVE', 'INACTIVE'] as const

export function ZoneTable({
  zones,
  total,
  pagination,
  sorting,
  loading = false,
  onRefresh,
  onPaginationChange,
  onSortingChange,
}: ZoneTableProps) {
  const router = useRouter()
  const t = useTranslations('zone')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null)

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }, [tCommon])

  const handleStatusChange = useCallback(async (zoneId: string, newStatus: string) => {
    setLoadingId(zoneId)
    try {
      const response = await fetch(`/api/v1/zones/${zoneId}/status`, {
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
    if (!zoneToDelete) return

    setLoadingId(zoneToDelete.id)
    try {
      const response = await fetch(`/api/v1/zones/${zoneToDelete.id}`, {
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
      setZoneToDelete(null)
    }
  }, [onRefresh, router, t, tCommon, zoneToDelete])

  const columns: ColumnDef<Zone>[] = useMemo(
    () => [
      {
        accessorKey: 'zoneCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('code')} />,
        size: 160,
        cell: ({ row }) => {
          const zone = row.original

          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/zones/${zone.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {zone.zoneCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(zone.zoneCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'zoneName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('name')} />,
        size: 180,
        cell: ({ row }) => <span className="text-xs">{row.original.zoneName || '-'}</span>,
      },
      {
        accessorKey: 'warehouse',
        header: t('warehouse'),
        size: 140,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.warehouse?.warehouseCode || row.original.warehouse?.warehouseName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'zoneType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('type')} />,
        size: 120,
        cell: ({ row }) => <ZoneTypeBadge type={row.original.zoneType} />,
      },
      {
        accessorKey: 'capacityUnits',
        header: t('capacity'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.capacityUnits ? `${row.original.currentUnits}/${row.original.capacityUnits}` : '-'}
          </span>
        ),
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
        cell: ({ row }) => <ZoneStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const zone = row.original

          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={loadingId === zone.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/zones/${zone.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/zones/${zone.id}/edit`} className="flex items-center">
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
                      onClick={() => handleStatusChange(zone.id, status)}
                      disabled={zone.status === status}
                    >
                      {t(`status.${status}`)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setZoneToDelete(zone)
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
        tableId="zones-list"
        columns={columns}
        data={zones}
        total={total}
        pagination={pagination}
        sorting={sorting}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
        loading={loading}
        enableSorting
        enableColumnVisibility={false}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDesc', { name: zoneToDelete?.zoneCode || '' })}
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
