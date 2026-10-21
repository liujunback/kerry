'use client'

import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { JobStatusBadge } from './job-status-badge'
import { JobTypeBadge } from './job-type-badge'
import { JobProgressBar } from './job-progress-bar'
import { Download } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date-formatter'

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

interface JobDetailDialogProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
}: JobDetailDialogProps) {
  const t = useTranslations('jobs')

  if (!job) return null

  const handleDownload = () => {
    window.open(`/api/v1/jobs/${job.id}/download`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('jobDetail')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">
                {t('columns.jobNumber')}
              </label>
              <p className="font-medium">{job.jobNumber}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                {t('columns.status')}
              </label>
              <div className="mt-1">
                <JobStatusBadge status={job.status} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              {t('columns.type')}
            </label>
            <div className="mt-1">
              <JobTypeBadge jobType={job.jobType} jobSubType={job.jobSubType} />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              {t('columns.name')}
            </label>
            <p className="font-medium">{job.jobName}</p>
          </div>

          {job.description && (
            <div>
              <label className="text-sm text-muted-foreground">
                {t('description')}
              </label>
              <p>{job.description}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">
              {t('columns.progress')}
            </label>
            <div className="mt-2">
              <JobProgressBar
                progress={job.progress}
                message={job.progressMessage}
                processedCount={job.processedCount}
                totalCount={job.totalCount}
                successCount={job.successCount}
                failedCount={job.failedCount}
              />
            </div>
          </div>

          {job.errorMessage && (
            <div>
              <label className="text-sm text-muted-foreground text-red-600">
                {t('errorMessage')}
              </label>
              <p className="text-red-600 text-sm bg-red-50 p-2 rounded mt-1">
                {job.errorMessage}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">{t('createdAt')}</label>
              <p>{formatDateTime(job.createdAt) || '-'}</p>
            </div>
            {job.startedAt && (
              <div>
                <label className="text-muted-foreground">{t('startedAt')}</label>
                <p>{formatDateTime(job.startedAt) || '-'}</p>
              </div>
            )}
            {job.completedAt && (
              <div>
                <label className="text-muted-foreground">
                  {t('completedAt')}
                </label>
                <p>{formatDateTime(job.completedAt) || '-'}</p>
              </div>
            )}
          </div>

          {job.resultFilePath && job.status === 'COMPLETED' && (
            <div className="pt-4 border-t">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                {t('download')} ({job.resultFileName})
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
