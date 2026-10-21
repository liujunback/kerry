'use client'

import { Progress } from '@/components/ui/progress'

interface JobProgressBarProps {
  progress: number
  message?: string | null
  processedCount?: number | null
  totalCount?: number | null
  successCount?: number | null
  failedCount?: number | null
}

export function JobProgressBar({
  progress,
  message,
  processedCount,
  totalCount,
  successCount,
  failedCount,
}: JobProgressBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-10">{progress}%</span>
      </div>
      {message && (
        <p className="text-xs text-muted-foreground truncate">{message}</p>
      )}
      {totalCount !== null && totalCount !== undefined && totalCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {processedCount || 0}/{totalCount}
          </span>
          {successCount !== null && successCount !== undefined && (
            <span className="text-green-600">成功: {successCount}</span>
          )}
          {failedCount !== null && failedCount !== undefined && failedCount > 0 && (
            <span className="text-red-600">失败: {failedCount}</span>
          )}
        </div>
      )}
    </div>
  )
}
