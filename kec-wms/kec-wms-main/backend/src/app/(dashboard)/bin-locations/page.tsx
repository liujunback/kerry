'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Layers, RefreshCw, Copy, MoreHorizontal, Eye, Pencil, Lock, Unlock, Trash2, Loader2, Printer, ExternalLink } from 'lucide-react'
import { ColumnDef, PaginationState, SortingState, RowSelectionState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { BinLocationFilter } from '@/components/bin-locations/bin-location-filter'
import { BinLocationStatusBadge } from '@/components/bin-locations/bin-location-status-badge'
import { BinLocationLockBadge } from '@/components/bin-locations/bin-location-lock-badge'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

interface BinLocation {
  id: string
  locationCode: string
  aisle: string | null
  rack: string | null
  shelf: string | null
  bin: string | null
  locationType: string | null
  lockStatus: string
  isPickable: boolean
  isReceivable: boolean
  status: string
  createdAt: string
  zone: {
    id: string
    zoneCode: string
    zoneName: string | null
  }
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
}

interface Zone {
  id: string
  zoneCode: string
  zoneName: string | null
  warehouseId: string
}

// MORE_CONTENT_PLACEHOLDER

const lockOptions = ['UNLOCKED', 'LOCKED'] as const
const statusOptions = ['ACTIVE', 'INACTIVE'] as const

function BinLocationsContent() {
  const t = useTranslations('binLocation')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/bin-locations' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [binLocations, setBinLocations] = useState<BinLocation[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [binToDelete, setBinToDelete] = useState<BinLocation | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [printing, setPrinting] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  // 从URL参数恢复排序状态
  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/v1/zones?pageSize=500&status=ACTIVE')
      const data = await res.json()
      if (data.success) {
        setZones(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch zones:', error)
    }
  }

  const fetchBinLocations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const res = await fetch(`/api/v1/bin-locations?${params}`)
      const data = await res.json()
      if (data.success) {
        setBinLocations(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch bin locations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  useEffect(() => {
    fetchBinLocations()
  }, [searchParams])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/bin-locations?${params.toString()}`)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1') // 排序变化时重置到第一页
    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }
    router.push(`/bin-locations?${params.toString()}`)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }

  const handleStatusChange = async (binId: string, newStatus: string) => {
    setLoadingId(binId)
    try {
      const response = await fetch(`/api/v1/bin-locations/${binId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('statusUpdateSuccess'))
        fetchBinLocations()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const handleLockChange = async (binId: string, newLockStatus: string) => {
    setLoadingId(binId)
    try {
      const response = await fetch(`/api/v1/bin-locations/${binId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockStatus: newLockStatus }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('lockUpdateSuccess'))
        fetchBinLocations()
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
    if (!binToDelete) return
    setLoadingId(binToDelete.id)
    try {
      const response = await fetch(`/api/v1/bin-locations/${binToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('deleteSuccess'))
        fetchBinLocations()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      setDeleteDialogOpen(false)
      setBinToDelete(null)
    }
  }

  // 获取选中的货位ID列表
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]).map(index => binLocations[parseInt(index)]?.id).filter(Boolean)
  }, [rowSelection, binLocations])

  const printBinLocationLabels = async (ids: string[]) => {
    const pdfUrl = `/api/v1/files/bin-location-label/batch?ids=${ids.join(',')}`
    return await printPdfWithAgentFallback({
      pdfUrl,
      jobIdPrefix: 'bin-location-label',
      scenarioType: 'BIN_LOCATION_LABEL',
      relatedIds: ids,
      relatedType: 'BIN_LOCATION',
      pageCount: ids.length,
    })
  }

  // 批量打印
  const handleBatchPrint = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('selectToPrint'))
      return
    }

    setPrinting(true)
    try {
      const result = await printBinLocationLabels(selectedIds)
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
      toast.success(t('printSuccess'))
    } catch {
      toast.error(t('printError'))
    } finally {
      setPrinting(false)
    }
  }

  // 单个打印
  const handleSinglePrint = async (binId: string) => {
    try {
      const result = await printBinLocationLabels([binId])
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error(t('printError'))
    }
  }

  // 打开打印设置页面
  const openPrintSettings = () => {
    window.open('/settings/print', '_blank')
  }

// COLUMNS_PLACEHOLDER

  const columns: ColumnDef<BinLocation>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'locationCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('code')} />,
        size: 150,
        cell: ({ row }) => {
          const bin = row.original
          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/bin-locations/${bin.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {bin.locationCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(bin.locationCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'warehouse',
        header: t('warehouse'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.warehouse?.warehouseCode || '-'}</span>,
      },
      {
        accessorKey: 'zone',
        header: t('zone'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.zone?.zoneCode || '-'}</span>,
      },
      {
        accessorKey: 'location',
        header: t('location'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const bin = row.original
          return (
            <span className="text-xs">
              {[bin.aisle, bin.rack, bin.shelf, bin.bin].filter(Boolean).join('-') || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'locationType',
        header: t('type'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.locationType || '-'}</span>,
      },
      {
        accessorKey: 'flags',
        header: t('flags'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => {
          const bin = row.original
          return (
            <div className="flex gap-1">
              {bin.isPickable && <Badge variant="outline" className="text-xs px-1">P</Badge>}
              {bin.isReceivable && <Badge variant="outline" className="text-xs px-1">R</Badge>}
            </div>
          )
        },
      },
      {
        accessorKey: 'lockStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('lock')} />,
        size: 80,
        cell: ({ row }) => <BinLocationLockBadge lockStatus={row.original.lockStatus} />,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('statusLabel')} />,
        size: 80,
        cell: ({ row }) => <BinLocationStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const bin = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loadingId === bin.id}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/bin-locations/${bin.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/bin-locations/${bin.id}/edit`} className="flex items-center">
                      <Pencil className="mr-2 h-4 w-4" />
                      {tCommon('edit')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSinglePrint(bin.id)}>
                    <Printer className="mr-2 h-4 w-4" />
                    {t('print')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-muted-foreground" disabled>
                    <Lock className="h-4 w-4 mr-2" />
                    {t('changeLock')}
                  </DropdownMenuItem>
                  {lockOptions.map((lock) => (
                    <DropdownMenuItem
                      key={lock}
                      onClick={() => handleLockChange(bin.id, lock)}
                      disabled={bin.lockStatus === lock}
                    >
                      {lock === 'UNLOCKED' ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                      {t(`lockStatus.${lock}`)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-muted-foreground" disabled>
                    {t('changeStatus')}
                  </DropdownMenuItem>
                  {statusOptions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(bin.id, status)}
                      disabled={bin.status === status}
                    >
                      {t(`status.${status}`)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => { setBinToDelete(bin); setDeleteDialogOpen(true) }}
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
    [t, tCommon, loadingId]
  )

// RETURN_PLACEHOLDER

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchBinLocations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/bin-locations/bulk-create">
            <Button variant="outline">
              <Layers className="h-4 w-4 mr-2" />
              {t('bulkCreate')}
            </Button>
          </Link>
          <Link href="/bin-locations/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('create')}
            </Button>
          </Link>
        </div>
      </div>

      <BinLocationFilter zones={zones} />

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg flex-shrink-0">
          <span className="text-sm">
            {t('selectedCount', { count: selectedIds.length })}
          </span>
          <Button
            size="sm"
            onClick={handleBatchPrint}
            disabled={printing}
          >
            {printing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
            {t('batchPrint')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openPrintSettings}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            {t('printSettings')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRowSelection({})}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="bin-locations-list"
          columns={columns}
          data={binLocations}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          enableRowSelection={true}
          showSelectionCount={false}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          maxHeight="100%"
        />
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDesc', { name: binToDelete?.locationCode || '' })}
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

export default function BinLocationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <BinLocationsContent />
    </Suspense>
  )
}
