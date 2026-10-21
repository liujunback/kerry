'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, RefreshCw, Copy, MoreHorizontal, Eye, Pencil, Power, PowerOff, Trash2, Printer, Loader2, Layers } from 'lucide-react'
import { ColumnDef, PaginationState, SortingState, RowSelectionState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ContainerFilter } from '@/components/containers/container-filter'
import { ContainerStatusBadge } from '@/components/containers/container-status-badge'
import { ContainerTypeBadge } from '@/components/containers/container-type-badge'
import { BatchStatusDialog } from '@/components/containers/batch-status-dialog'
import { BatchCreateDialog } from '@/components/containers/batch-create-dialog'
import { CreateContainerDialog } from '@/components/containers/create-container-dialog'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

interface Container {
  id: string
  containerCode: string
  containerType: string
  containerTypeLabel: string
  usage: string
  usageLabel: string
  enabledStatus: string
  enabledStatusLabel: string
  workStatus: string
  workStatusLabel: string
  lastOccupiedTime?: string | null
  weightCapacityKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  remarks?: string | null
  warehouse?: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  createdAt: string
}

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

function ContainersContent() {
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/containers' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [containers, setContainers] = useState<Container[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchAction, setBatchAction] = useState<'ENABLED' | 'DISABLED'>('ENABLED')
  const [batchCreateDialogOpen, setBatchCreateDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

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

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE')
      const data = await res.json()
      if (data.success) {
        setWarehouses(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }

  const fetchContainers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const res = await fetch(`/api/v1/containers?${params}`)
      const data = await res.json()
      if (data.success) {
        setContainers(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch containers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    fetchContainers()
  }, [searchParams])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/containers?${params.toString()}`)
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
    router.push(`/containers?${params.toString()}`)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }

  // 从rowSelection获取选中的ID列表
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]).map(idx => containers[parseInt(idx)]?.id).filter(Boolean)
  }, [rowSelection, containers])

  const handleRowSelectionChange = (selection: RowSelectionState) => {
    setRowSelection(selection)
  }

  const handleBatchSuccess = () => {
    setRowSelection({})
    fetchContainers()
  }

  const handleStatusChange = async (id: string, enabledStatus: 'ENABLED' | 'DISABLED') => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/v1/containers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledStatus }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        fetchContainers()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    setLoadingId(id)
    try {
      const response = await fetch(`/api/v1/containers/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('deleteSuccess'))
        fetchContainers()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const printContainerLabels = async (ids: string[]) => {
    const pdfUrl = `/api/v1/files/container-label/batch?ids=${ids.join(',')}`
    return await printPdfWithAgentFallback({
      pdfUrl,
      jobIdPrefix: 'container-label',
      scenarioType: 'CONTAINER_LABEL',
      relatedIds: ids,
      relatedType: 'CONTAINER',
      pageCount: ids.length,
    })
  }

  const handleBatchPrint = async () => {
    try {
      const result = await printContainerLabels(selectedIds)
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error(t('printError'))
    }
  }

  const handleSinglePrint = async (containerId: string) => {
    try {
      const result = await printContainerLabels([containerId])
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error(t('printError'))
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr) || '-'
  }

  const columns: ColumnDef<Container>[] = useMemo(
    () => [
      getSelectColumn<Container>(),
      {
        accessorKey: 'containerCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('containerCode')} />,
        size: 180,
        cell: ({ row }) => {
          const container = row.original
          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/containers/${container.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {container.containerCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(container.containerCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'containerType',
        header: t('containerType'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <ContainerTypeBadge type={row.original.containerType} />,
      },
      {
        accessorKey: 'usage',
        header: t('usage'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.usageLabel}</span>,
      },
      {
        accessorKey: 'enabledStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('enabledStatus')} />,
        size: 100,
        cell: ({ row }) => (
          <ContainerStatusBadge
            enabledStatus={row.original.enabledStatus}
            workStatus={row.original.workStatus}
          />
        ),
      },
      {
        accessorKey: 'warehouse',
        header: t('warehouse'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.warehouse?.warehouseName || '-'}</span>,
      },
      {
        accessorKey: 'weightCapacityKg',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('weightCapacityKg')} className="justify-end" />,
        size: 100,
        cell: ({ row }) => (
          <div className="text-right text-xs">
            {row.original.weightCapacityKg ? `${row.original.weightCapacityKg} kg` : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'lastOccupiedTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('lastOccupiedTime')} />,
        size: 150,
        cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDate(row.original.lastOccupiedTime) || '-'}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tCommon('createdAt')} />,
        size: 150,
        cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDate(row.original.createdAt) || '-'}</span>,
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const container = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loadingId === container.id}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/containers/${container.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/containers/${container.id}/edit`} className="flex items-center">
                      <Pencil className="mr-2 h-4 w-4" />
                      {tCommon('edit')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSinglePrint(container.id)}>
                    <Printer className="mr-2 h-4 w-4" />
                    {t('print')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {container.enabledStatus === 'ENABLED' ? (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(container.id, 'DISABLED')}
                      disabled={container.workStatus === 'OCCUPIED'}
                    >
                      <PowerOff className="mr-2 h-4 w-4" />
                      {t('enabledStatuses.DISABLED')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleStatusChange(container.id, 'ENABLED')}>
                      <Power className="mr-2 h-4 w-4" />
                      {t('enabledStatuses.ENABLED')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(container.id)}
                    disabled={container.enabledStatus !== 'DISABLED' || container.workStatus !== 'IDLE'}
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
          <Button variant="outline" size="icon" onClick={fetchContainers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedIds.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setBatchAction('ENABLED')
                  setBatchDialogOpen(true)
                }}
              >
                <Power className="h-4 w-4 mr-1" />
                {t('batchEnable')} ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBatchAction('DISABLED')
                  setBatchDialogOpen(true)
                }}
              >
                <PowerOff className="h-4 w-4 mr-1" />
                {t('batchDisable')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleBatchPrint}>
                <Printer className="h-4 w-4 mr-1" />
                {t('batchPrint')}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setBatchCreateDialogOpen(true)}>
            <Layers className="h-4 w-4 mr-2" />
            {t('batchCreate')}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </div>
      </div>

      <ContainerFilter />

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="containers-list"
          columns={columns}
          data={containers}
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
          onRowSelectionChange={handleRowSelectionChange}
          maxHeight="100%"
        />
      </div>

      <BatchStatusDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        selectedContainerIds={selectedIds}
        targetStatus={batchAction}
        onSuccess={handleBatchSuccess}
      />

      <BatchCreateDialog
        open={batchCreateDialogOpen}
        onOpenChange={setBatchCreateDialogOpen}
        warehouses={warehouses}
        onSuccess={fetchContainers}
      />

      <CreateContainerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        warehouses={warehouses}
        onSuccess={fetchContainers}
      />
    </div>
  )
}

export default function ContainersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ContainersContent />
    </Suspense>
  )
}
