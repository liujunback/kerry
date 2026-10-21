'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface OrderPackingVideoTableProps {
  orderId: string
}

interface PackingVideoRecord {
  orderId: string
  jobId: string
  status: string
  cameraId: string
  fileName: string | null
  objectKey: string | null
  videoUrl: string
  downloadUrl?: string
  createdAt: string
}

export function OrderPackingVideoTable({ orderId }: OrderPackingVideoTableProps) {
  const [records, setRecords] = useState<PackingVideoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestUrl = useMemo(
    () => `/api/v1/packing/videos?orderId=${encodeURIComponent(orderId)}`,
    [orderId]
  )

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(requestUrl, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json() as { data?: PackingVideoRecord[] }
      setRecords(Array.isArray(payload.data) ? payload.data : [])
    } catch (fetchError) {
      console.error('Failed to fetch packing videos:', fetchError)
      setError('查询打包视频失败')
    } finally {
      setLoading(false)
    }
  }, [requestUrl])

  useEffect(() => {
    void fetchRecords()
  }, [fetchRecords])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          展示打包录像任务，点击下载后保存到本地，再使用本地播放器查看
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { void fetchRecords() }}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          刷新
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>任务ID</TableHead>
              <TableHead>摄像头</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>文件名</TableHead>
              <TableHead>对象Key</TableHead>
              <TableHead className="text-right">下载</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  暂无打包视频记录
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => {
                const downloadUrl = record.downloadUrl || `/api/v1/packing/videos/download?orderId=${encodeURIComponent(record.orderId)}&jobId=${encodeURIComponent(record.jobId)}&cameraId=${encodeURIComponent(record.cameraId)}`

                return (
                  <TableRow key={`${record.jobId}:${record.cameraId}`}>
                    <TableCell>{formatDateTime(record.createdAt) || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{record.jobId}</TableCell>
                    <TableCell>{record.cameraId}</TableCell>
                    <TableCell>{record.status || '-'}</TableCell>
                    <TableCell>{record.fileName || '-'}</TableCell>
                    <TableCell className="max-w-[360px] truncate font-mono text-xs">
                      {record.objectKey || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {downloadUrl ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          asChild
                        >
                          <a href={downloadUrl}>
                            <Download className="mr-1 h-3.5 w-3.5" />
                            下载
                          </a>
                        </Button>
                      ) : (
                        <Button type="button" variant="secondary" size="sm" disabled>
                          下载
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
