'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ColumnDef, PaginationState, RowSelectionState } from '@tanstack/react-table'
import { Copy, Eye, Loader2, MoreHorizontal, Plus, Printer, Trash2, UserRoundPen, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PickOrderListFilter } from '@/components/pick-orders/pick-order-list-filter'
import { formatInShanghaiTZ } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'
import { useWarehouseContext } from '@/contexts/warehouse-context'

interface PickTask {
  id: string
  taskNumber: string
  taskType: string
  pickMode: string | null
  status: string
  priority: number
  assignedUserId: string | null
  startedAt: string | null
  completedAt: string | null
  totalLines: number
  totalQty: number
  pickedQty: number
  notes: string | null
  createdAt: string
  createdBy: string | null
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  zone: {
    zoneCode: string
    zoneName: string
  } | null
  wave: {
    waveNumber: string
  } | null
  createdByUser: {
    username: string
    fullName: string | null
  } | null
  assignedUser: {
    username: string
    fullName: string | null
  } | null
  orderCount: number
  skuCount: number
  businessTypes: string[]
  orderTypes: string[]
  channels: string[]
  hasCombined: boolean
}

interface PickerProfileOption {
  id: string
  userId: string
  isEnabled: boolean
  allowPdaExecution: boolean
  user: {
    id: string
    username: string
    fullName: string | null
    employeeId?: string | null
  }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  PICKED: 'bg-cyan-100 text-cyan-800',
  SORTING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

function PickOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pickOrder')
  const tOutbound = useTranslations('outbound.order')
  const tCommon = useTranslations('common')
  const tMenu = useTranslations('menu')
  const tMenuGroup = useTranslations('menuGroup')
  const { selectedWarehouseId } = useWarehouseContext()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: tMenu('pickOrders'), href: '/pick-orders' },
  })

  const [tasks, setTasks] = useState<PickTask[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [printing, setPrinting] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [pickerProfiles, setPickerProfiles] = useState<PickerProfileOption[]>([])
  const [pickerProfilesLoading, setPickerProfilesLoading] = useState(false)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())

      const res = await fetch(`/api/v1/pick-orders?${params}`)
      const data = await res.json()

      if (data.success) {
        setTasks(data.data)
        setTotal(data.pagination.total)
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
    fetchTasks()
  }, [fetchTasks])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/pick-orders?${params.toString()}`)
  }

  const selectedIds = useMemo(() => {
    return tasks
      .filter((task) => rowSelection[task.id] && task.status !== 'CANCELLED')
      .map((task) => task.id)
  }, [rowSelection, tasks])

  const selectedTasks = useMemo(() => {
    return tasks.filter((task) => selectedIds.includes(task.id))
  }, [selectedIds, tasks])

  const formatPickerLabel = useCallback((profile: PickerProfileOption) => {
    const name = profile.user.fullName || profile.user.username
    return profile.user.employeeId
      ? `${name} (${profile.user.username} / ${profile.user.employeeId})`
      : `${name} (${profile.user.username})`
  }, [])

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm(t('confirmCancel'))) return

    try {
      const res = await fetch(`/api/v1/pick-orders/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        toast.success(t('cancelSuccess'))
        fetchTasks()
      } else {
        toast.error(data.message || t('cancelFailed'))
      }
    } catch {
      toast.error(t('cancelFailed'))
    }
  }, [fetchTasks, t])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
  }, [tCommon])

  const handleBatchPrint = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('selectOrdersFirst'))
      return
    }

    setPrinting(true)
    try {
      const result = await printPdfWithAgentFallback({
        pdfUrl: `/api/v1/files/pick-order/batch?ids=${selectedIds.join(',')}${selectedWarehouseId ? `&warehouseId=${selectedWarehouseId}` : ''}`,
        jobIdPrefix: 'pick-order',
        scenarioType: 'PICK_ORDER',
        warehouseId: selectedWarehouseId || undefined,
        relatedIds: selectedIds,
        relatedType: 'PICK_ORDER',
        pageCount: selectedIds.length,
      })
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }

      setRowSelection({})
      fetchTasks()
    } catch (error) {
      console.error('Failed to print pick list:', error)
      toast.error(t('printFailed'))
    } finally {
      setPrinting(false)
    }
  }

  const openBatchAssignDialog = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('selectOrdersFirst'))
      return
    }

    const lockedTasks = selectedTasks.filter((task) => !['PENDING', 'IN_PROGRESS'].includes(task.status))
    if (lockedTasks.length > 0) {
      toast.error(t('batchAssignStatusBlocked'))
      return
    }

    const warehouseIds = [...new Set(selectedTasks.map((task) => task.warehouse.id))]
    if (warehouseIds.length !== 1) {
      toast.error(t('batchAssignWarehouseBlocked'))
      return
    }

    setAssignDialogOpen(true)
    setSelectedAssigneeId('')
    setPickerProfilesLoading(true)
    try {
      const params = new URLSearchParams({
        warehouseId: warehouseIds[0] || selectedWarehouseId || '',
        pageSize: '100',
        isEnabled: 'true',
      })
      const response = await fetch(`/api/v1/picker-profiles?${params.toString()}`)
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || t('fetchPickersFailed'))
      }
      setPickerProfiles((result.data || []).filter((profile: PickerProfileOption) => profile.allowPdaExecution))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('fetchPickersFailed'))
      setPickerProfiles([])
    } finally {
      setPickerProfilesLoading(false)
    }
  }

  const handleBatchAssign = async () => {
    if (!selectedAssigneeId) {
      toast.error(t('selectUser'))
      return
    }

    setAssigning(true)
    try {
      const response = await fetch('/api/v1/pick-orders/batch/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickOrderIds: selectedIds,
          userId: selectedAssigneeId,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || t('batchAssignFailed'))
      }

      toast.success(t('batchAssignSuccess'))
      setAssignDialogOpen(false)
      setSelectedAssigneeId('')
      setRowSelection({})
      fetchTasks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('batchAssignFailed'))
    } finally {
      setAssigning(false)
    }
  }

  const columns: ColumnDef<PickTask>[] = useMemo(
    () => [
      getSelectColumn<PickTask>(),
      {
        accessorKey: 'taskNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('taskNumber')} />,
        size: 180,
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-0.5">
                <Link href={`/pick-orders/${task.id}`} className="font-mono text-xs text-primary hover:underline">
                  {task.taskNumber}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => handleCopy(task.taskNumber)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {task.wave?.waveNumber && (
                <div className="text-xs text-muted-foreground">{task.wave.waveNumber}</div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 80,
        cell: ({ row }) => (
          <Badge className={statusColors[row.original.status] || ''}>
            {t(`statuses.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'assignedUser',
        header: t('assignedUser'),
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assignedUser?.fullName || row.original.assignedUser?.username || '-'}
          </span>
        ),
      },
      {
        id: 'taskType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('taskType')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.taskType ? t(`taskTypes.${row.original.taskType}`) : '-'}
          </span>
        ),
      },
      {
        id: 'businessTypes',
        header: t('businessType'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.businessTypes.length > 0
              ? row.original.businessTypes.map((bt) => tOutbound(`types.${bt}`)).join(', ')
              : '-'}
          </span>
        ),
      },
      {
        id: 'orderCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('orderCount')} className="justify-center" />,
        size: 70,
        cell: ({ row }) => <div className="text-center text-xs tabular-nums">{row.original.orderCount}</div>,
      },
      {
        id: 'skuCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('totalSkuCount')} className="justify-center" />,
        size: 70,
        cell: ({ row }) => <div className="text-center text-xs tabular-nums">{row.original.skuCount}</div>,
      },
      {
        id: 'quantities',
        header: () => <div className="text-center text-xs text-muted-foreground">总/拣</div>,
        size: 80,
        enableSorting: false,
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="text-center text-xs tabular-nums">
              <span className="font-medium">{task.totalQty}</span>
              <span className="mx-0.5 text-muted-foreground">/</span>
              <span className="font-medium">{task.pickedQty}</span>
            </div>
          )
        },
      },
      {
        id: 'channels',
        header: t('channel'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.channels.length > 0 ? row.original.channels.join(', ') : '-'}</span>,
      },
      {
        id: 'warehouse',
        header: t('warehouse'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.warehouse?.warehouseName || '-'}</span>,
      },
      {
        id: 'dates',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('createdAt')} />,
        size: 100,
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="text-xs text-muted-foreground">
              <div>{formatInShanghaiTZ(task.createdAt, 'yy-MM-dd HH:mm') || '-'}</div>
              {task.completedAt && <div>{formatInShanghaiTZ(task.completedAt, 'yy-MM-dd HH:mm')}</div>}
            </div>
          )
        },
      },
      {
        id: 'createdByUser',
        header: t('createdByUser'),
        size: 70,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.createdByUser?.fullName || row.original.createdByUser?.username || '-'}</span>,
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' },
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/pick-orders/${task.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {t('viewDetail')}
                    </Link>
                  </DropdownMenuItem>
                  {task.status === 'PENDING' && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleCancel(task.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('cancel')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, tCommon, tOutbound, handleCancel, handleCopy]
  )

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between flex-shrink-0 print:hidden">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Link href="/pick-orders/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('createPickOrder')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="print:hidden">
        <PickOrderListFilter />
      </div>

      <div className="flex items-center gap-4 rounded-lg bg-muted p-3 flex-shrink-0 print:hidden">
        <span className="text-sm text-muted-foreground">
          {tCommon('selectedCount', { count: selectedIds.length })}
        </span>
        <Button variant="outline" onClick={handleBatchPrint} disabled={printing || selectedIds.length === 0}>
          <Printer className="mr-2 h-4 w-4" />
          {t('batchPrint')}
        </Button>
        <Button variant="outline" onClick={openBatchAssignDialog} disabled={selectedIds.length === 0}>
          <UserRoundPen className="mr-2 h-4 w-4" />
          {t('batchAssignPicker')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setRowSelection({})}
          disabled={selectedIds.length === 0}
        >
          <X className="mr-2 h-4 w-4" />
          {tCommon('cancel')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 print:hidden">
        <DataTable
          tableId="pick-orders-list"
          columns={columns}
          data={tasks}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          enableRowSelection={true}
          showSelectionCount={false}
          getRowId={(row) => row.id}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          maxHeight="100%"
        />
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t('batchAssignPicker')}</DialogTitle>
            <DialogDescription>
              {t('batchAssignPickerDesc', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t('assignedUser')}</Label>
            <Select
              value={selectedAssigneeId}
              onValueChange={setSelectedAssigneeId}
              disabled={pickerProfilesLoading || assigning}
            >
              <SelectTrigger>
                <SelectValue placeholder={pickerProfilesLoading ? tCommon('loading') : t('selectUser')} />
              </SelectTrigger>
              <SelectContent>
                {pickerProfiles.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    {pickerProfilesLoading ? tCommon('loading') : t('noPickerProfiles')}
                  </SelectItem>
                ) : (
                  pickerProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.userId}>
                      {formatPickerLabel(profile)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleBatchAssign} disabled={assigning || !selectedAssigneeId || pickerProfilesLoading}>
              {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PickOrdersPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PickOrdersContent />
    </Suspense>
  )
}
