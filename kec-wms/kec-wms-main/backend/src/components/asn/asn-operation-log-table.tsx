'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface OperationLog {
  id: string
  operationType: string
  operationName: string
  beforeStatus: string | null
  afterStatus: string | null
  remark: string | null
  operatorName: string | null
  createdAt: string
}

interface AsnOperationLogTableProps {
  asnId: string
}

export function AsnOperationLogTable({ asnId }: AsnOperationLogTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/operation-logs`)
        const data = await response.json()
        if (data.success) {
          setLogs(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch operation logs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [asnId])

  const totalPages = Math.ceil(logs.length / pageSize)
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {tCommon('loading')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('operationLog.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('operationLog.operationType')}</TableHead>
                <TableHead>{t('operationLog.statusChange')}</TableHead>
                <TableHead>{t('operationLog.remark')}</TableHead>
                <TableHead>{t('operationLog.operator')}</TableHead>
                <TableHead>{t('operationLog.operationTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.operationName}</TableCell>
                    <TableCell>
                      {log.beforeStatus && log.afterStatus
                        ? `${log.beforeStatus} → ${log.afterStatus}`
                        : '-'}
                    </TableCell>
                    <TableCell>{log.remark || '-'}</TableCell>
                    <TableCell>{log.operatorName || '-'}</TableCell>
                    <TableCell>{formatDateTime(log.createdAt) || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {tCommon('pagination.showing', { from: logs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0, to: Math.min(currentPage * pageSize, logs.length), total: logs.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
