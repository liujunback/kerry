'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import {
  Eye,
  MoreHorizontal,
  XCircle,
  RotateCcw,
  Download,
} from 'lucide-react'
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
import { JobStatusBadge } from './job-status-badge'
import { JobTypeBadge } from './job-type-badge'
import { JobProgressBar } from './job-progress-bar'
import { JobDetailDialog } from './job-detail-dialog'

interface Job {
  id: string
  jobNumber: string
  jobType: string
  jobSubType: string | null
  jobName: string
  description: string | null
  status: string
  progress: number
  progressMessage: string | null
  processedCount: number | null
  totalCount: number | null
  successCount: number | null
  failedCount: number | null
  errorMessage: string | null
  resultFilePath: string | null
  resultFileName: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface JobTableProps {
  jobs: Job[]
  total: number
  pagination: PaginationState
  sorting: SortingState
  onRefresh?: () => void
}

type DialogType = 'cancel' | 'retry' | null

export function JobTable({ jobs, total, pagination, sorting, onRefresh }: JobTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('jobs')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const openDialog = useCallback((type: DialogType, job: Job) => {
    setSelectedJob(job)
    setDialogType(type)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogType(null)
    setSelectedJob(null)
  }, [])

  const openDetail = useCallback((job: Job) => {
    setSelectedJob(job)
    setDetailOpen(true)
  }, [])

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/jobs?${params.toString()}`)
  }, [router, searchParams])

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }

    router.push(`/jobs?${params.toString()}`)
  }, [router, searchParams])

  const handleCancel = useCallback(async () => {
    if (!selectedJob) return
    setLoadingId(selectedJob.id)
    try {
      const response = await fetch(`/api/v1/jobs/${selectedJob.id}/cancel`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('cancelSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }, [closeDialog, onRefresh, router, selectedJob, t, tCommon])

  const handleRetry = useCallback(async () => {
    if (!selectedJob) return
    setLoadingId(selectedJob.id)
    try {
      const response = await fetch(`/api/v1/jobs/${selectedJob.id}/retry`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('retrySuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }, [closeDialog, onRefresh, router, selectedJob, t, tCommon])

  const handleDownload = useCallback((job: Job) => {
    window.open(`/api/v1/jobs/${job.id}/download`, '_blank')
  }, [])

  const canCancel = useCallback((status: string) => status === 'PENDING', [])
  const canRetry = useCallback((status: string) => status === 'FAILED', [])
  const canDownload = useCallback((job: Job) =>
    job.status === 'COMPLETED' && job.resultFilePath
  , [])

  const columns: ColumnDef<Job>[] = useMemo(
    () => [
      {
        accessorKey: 'jobNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.jobNumber')} />,
        size: 160,
        cell: ({ row }) => <span className="font-medium">{row.original.jobNumber}</span>,
      },
      {
        accessorKey: 'jobType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.type')} />,
        size: 180,
        cell: ({ row }) => (
          <JobTypeBadge
            jobType={row.original.jobType}
            jobSubType={row.original.jobSubType}
          />
        ),
      },
      {
        accessorKey: 'jobName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.name')} />,
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">{row.original.jobName}</div>
            {row.original.description && (
              <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.status')} />,
        size: 120,
        cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'progress',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.progress')} />,
        size: 240,
        cell: ({ row }) => (
          <JobProgressBar
            progress={row.original.progress}
            message={row.original.progressMessage}
            processedCount={row.original.processedCount}
            totalCount={row.original.totalCount}
            successCount={row.original.successCount}
            failedCount={row.original.failedCount}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('columns.createdAt')} />,
        size: 170,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.createdAt || '-'}</span>,
      },
      {
        id: 'actions',
        size: 72,
        enableSorting: false,
        enableHiding: false,
        header: () => <div className="text-right">{tCommon('actions')}</div>,
        cell: ({ row }) => {
          const job = row.original

          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingId === job.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openDetail(job)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {tCommon('view')}
                  </DropdownMenuItem>
                  {canDownload(job) && (
                    <DropdownMenuItem onClick={() => handleDownload(job)}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('download')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canCancel(job.status) && (
                    <DropdownMenuItem onClick={() => openDialog('cancel', job)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {t('actions.cancel')}
                    </DropdownMenuItem>
                  )}
                  {canRetry(job.status) && (
                    <DropdownMenuItem onClick={() => openDialog('retry', job)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t('actions.retry')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        meta: { sticky: 'right' as const },
      },
    ],
    [
      canCancel,
      canDownload,
      canRetry,
      handleDownload,
      loadingId,
      openDetail,
      openDialog,
      t,
      tCommon,
    ]
  )

  return (
    <>
      <div className="flex-1 min-h-0">
        <DataTable
          tableId="jobs-list"
          columns={columns}
          data={jobs}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          enableSorting={true}
          enableColumnVisibility={true}
          maxHeight="100%"
          getRowId={(job) => job.id}
        />
      </div>

      {/* Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Cancel Dialog */}
      <AlertDialog
        open={dialogType === 'cancel'}
        onOpenChange={() => closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmCancel')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmCancelDesc', { name: selectedJob?.jobNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retry Dialog */}
      <AlertDialog
        open={dialogType === 'retry'}
        onOpenChange={() => closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmRetry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmRetryDesc', { name: selectedJob?.jobNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetry}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
