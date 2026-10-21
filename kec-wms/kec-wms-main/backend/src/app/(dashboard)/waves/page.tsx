'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, RefreshCw, Play, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { ColumnDef, PaginationState, RowSelectionState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { WaveDetailDialog } from '@/components/waves/wave-detail-dialog'
import { formatDate } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

interface Wave {
  id: string
  waveNumber: string
  waveType: string
  status: string
  pickStrategy: string
  totalOrders: number
  totalLines: number
  totalQty: number
  pickedQty: number
  createdAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-500 text-white',
  RELEASED: 'bg-blue-500 text-white',
  PICKING: 'bg-purple-500 text-white',
  PICKED: 'bg-indigo-500 text-white',
  SORTING: 'bg-orange-500 text-white',
  COMPLETED: 'bg-green-500 text-white',
  CANCELLED: 'bg-red-500 text-white',
}

export default function WavesPage() {
  const t = useTranslations('outbound.wave')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/waves' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [waves, setWaves] = useState<Wave[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'all')
  const [total, setTotal] = useState(0)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [printing, setPrinting] = useState(false)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const fetchWaves = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.set('search', search)
      if (status && status !== 'all') params.set('status', status)

      const res = await fetch(`/api/v1/waves?${params}`)
      const data = await res.json()
      if (data.success) {
        setWaves(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch waves:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWaves()
  }, [page, pageSize, status])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/waves?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    router.push(`/waves?${params.toString()}`)
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (newStatus && newStatus !== 'all') {
      params.set('status', newStatus)
    } else {
      params.delete('status')
    }
    router.push(`/waves?${params.toString()}`)
  }

  // 从rowSelection获取选中的ID列表
  const selectedWaveIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]).map(idx => waves[parseInt(idx)]?.id).filter(Boolean)
  }, [rowSelection, waves])

  const handleRowSelectionChange = (selection: RowSelectionState) => {
    setRowSelection(selection)
  }

  const handleRelease = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/waves/${id}/release`, { method: 'POST' })
      if (res.ok) {
        fetchWaves()
      }
    } catch (error) {
      console.error('Failed to release wave:', error)
    }
  }

  const handleViewWave = (waveId: string) => {
    setSelectedWaveId(waveId)
    setShowDetailDialog(true)
  }

  const handleBatchPrint = async () => {
    if (selectedWaveIds.length === 0) {
      toast.error(t('selectWavesToPrint'))
      return
    }

    setPrinting(true)
    try {
      const result = await printPdfWithAgentFallback({
        pdfUrl: `/api/v1/files/wave-pick-list/batch?ids=${selectedWaveIds.join(',')}`,
        jobIdPrefix: 'wave-pick-list',
        scenarioType: 'WAVE_PICK_LIST',
        relatedIds: selectedWaveIds,
        relatedType: 'WAVE',
        pageCount: selectedWaveIds.length,
      })
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
      setRowSelection({})
    } catch (error) {
      console.error('Failed to print pick list:', error)
      toast.error(t('printPickListFailed'))
    } finally {
      setPrinting(false)
    }
  }

  const columns: ColumnDef<Wave>[] = useMemo(
    () => [
      getSelectColumn<Wave>(),
      {
        accessorKey: 'waveNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('waveNumber')} />,
        size: 150,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.waveNumber}</span>,
      },
      {
        accessorKey: 'warehouse',
        header: tCommon('warehouse'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.warehouse?.warehouseName || '-'}</span>,
      },
      {
        accessorKey: 'waveType',
        header: t('type'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{t(`types.${row.original.waveType}`)}</span>,
      },
      {
        accessorKey: 'pickStrategy',
        header: t('pickStrategy'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{t(`pickStrategies.${row.original.pickStrategy}`)}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 90,
        cell: ({ row }) => (
          <div className="flex justify-start">
            <Badge className={statusColors[row.original.status] || 'bg-gray-500 text-white'}>
              {t(`statuses.${row.original.status}`)}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'totalOrders',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('totalOrders')} />,
        size: 70,
        cell: ({ row }) => <div className="text-left text-xs tabular-nums">{row.original.totalOrders}</div>,
      },
      {
        accessorKey: 'totalLines',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('totalLines')} />,
        size: 70,
        cell: ({ row }) => <div className="text-left text-xs tabular-nums">{row.original.totalLines}</div>,
      },
      {
        accessorKey: 'totalQty',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('qtyAndPicked')} />,
        size: 100,
        cell: ({ row }) => (
          <div className="text-left text-xs tabular-nums">
            {row.original.totalQty} / {row.original.pickedQty}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('createdTime')} />,
        size: 100,
        cell: ({ row }) => (
          <div className="text-left">
            <span className="text-xs whitespace-nowrap">
              {formatDate(row.original.createdAt) || '-'}
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 100,
        cell: ({ row }) => {
          const wave = row.original
          return (
            <div className="flex items-center justify-center gap-1">
              {wave.status === 'CREATED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRelease(wave.id)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {t('release')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewWave(wave.id)}
              >
                {tCommon('view')}
              </Button>
            </div>
          )
        },
      },
    ],
    [t, tCommon]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('statusFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="CREATED">{t('statuses.CREATED')}</SelectItem>
            <SelectItem value="RELEASED">{t('statuses.RELEASED')}</SelectItem>
            <SelectItem value="PICKING">{t('statuses.PICKING')}</SelectItem>
            <SelectItem value="PICKED">{t('statuses.PICKED')}</SelectItem>
            <SelectItem value="COMPLETED">{t('statuses.COMPLETED')}</SelectItem>
            <SelectItem value="CANCELLED">{t('statuses.CANCELLED')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchWaves}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        {selectedWaveIds.length > 0 && (
          <Button
            variant="outline"
            onClick={handleBatchPrint}
            disabled={printing}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t('batchPrintPickList')} ({selectedWaveIds.length})
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="waves-list"
          columns={columns}
          data={waves}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          enableRowSelection={true}
          showSelectionCount={false}
          onRowSelectionChange={handleRowSelectionChange}
          maxHeight="100%"
        />
      </div>

      <WaveDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        waveId={selectedWaveId}
      />
    </div>
  )
}
