'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date-formatter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

interface OrderOperationLogTableProps {
  orderId: string
}

export function OrderOperationLogTable({ orderId }: OrderOperationLogTableProps) {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/v1/operation-logs/OUTBOUND_ORDER/${orderId}`)
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
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">序号</TableHead>
            <TableHead>操作类型</TableHead>
            <TableHead>描述</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead>操作时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                暂无操作日志
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log, index) => (
              <TableRow key={log.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{log.operationName}</TableCell>
                <TableCell>
                  {log.beforeStatus && log.afterStatus
                    ? `${log.beforeStatus} → ${log.afterStatus}`
                    : log.remark || '-'}
                </TableCell>
                <TableCell>{log.operatorName || 'system'}</TableCell>
                <TableCell>{formatDateTime(log.createdAt) || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
