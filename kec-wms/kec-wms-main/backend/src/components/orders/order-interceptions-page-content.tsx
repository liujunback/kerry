'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface InterceptionRecord {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: string
  source: 'FOMS_CANCEL' | 'MANUAL'
  remark: string
  status: 'PENDING_INTERCEPTION' | 'INTERCEPTED'
  markedByName: string
  markedAt: string
  blockedAtCheckout: string | null
  handlingAction: 'WAIT' | 'RESTOCK' | null
  handledAt: string | null
}

const sourceLabels: Record<InterceptionRecord['source'], string> = {
  FOMS_CANCEL: 'FOMS取消',
  MANUAL: '人工拦截',
}

const statusLabels: Record<InterceptionRecord['status'], string> = {
  PENDING_INTERCEPTION: '待拦截',
  INTERCEPTED: '已拦截',
}

const statusColors: Record<InterceptionRecord['status'], string> = {
  PENDING_INTERCEPTION: 'bg-yellow-100 text-yellow-800',
  INTERCEPTED: 'bg-red-100 text-red-800',
}

const handlingActionLabels: Record<'WAIT' | 'RESTOCK', string> = {
  WAIT: '等待',
  RESTOCK: '回库',
}

export function OrderInterceptionsPageContent() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<InterceptionRecord[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [orderNumber, setOrderNumber] = useState('')
  const [source, setSource] = useState<'ALL' | InterceptionRecord['source']>('ALL')
  const [status, setStatus] = useState<'ALL' | InterceptionRecord['status']>('ALL')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      })
      if (orderNumber.trim()) params.set('orderNumber', orderNumber.trim())
      if (source !== 'ALL') params.set('source', source)
      if (status !== 'ALL') params.set('status', status)

      const response = await fetch(`/api/v1/order-interceptions?${params}`)
      const result = await response.json()
      if (response.ok && result.success) {
        setRecords(result.data || [])
        setTotalPages(result.pagination?.totalPages || 1)
      }
    } finally {
      setLoading(false)
    }
  }, [orderNumber, page, source, status])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleSearch = () => {
    setPage(1)
    fetchRecords()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">订单拦截管理</h1>
          <p className="text-sm text-muted-foreground">查看活动中的订单拦截案件与待处理队列</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchRecords}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input
          placeholder="订单号"
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
        />
        <Select value={source} onValueChange={(value) => setSource(value as 'ALL' | InterceptionRecord['source'])}>
          <SelectTrigger>
            <SelectValue placeholder="来源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部来源</SelectItem>
            <SelectItem value="FOMS_CANCEL">FOMS取消</SelectItem>
            <SelectItem value="MANUAL">人工拦截</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as 'ALL' | InterceptionRecord['status'])}>
          <SelectTrigger>
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            <SelectItem value="PENDING_INTERCEPTION">待拦截</SelectItem>
            <SelectItem value="INTERCEPTED">已拦截</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={handleSearch}>查询</Button>
          <Button
            variant="outline"
            onClick={() => {
              setOrderNumber('')
              setSource('ALL')
              setStatus('ALL')
              setPage(1)
            }}
          >
            重置
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>当前订单状态</TableHead>
              <TableHead>拦截状态</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>标记时间</TableHead>
              <TableHead>标记人</TableHead>
              <TableHead>处理结果</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  暂无拦截记录
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Link href={`/orders/${record.orderId}`} className="text-primary hover:underline">
                      {record.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{record.orderStatus}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[record.status]}>
                      {statusLabels[record.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{sourceLabels[record.source]}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{record.remark}</TableCell>
                  <TableCell>{formatDateTime(record.markedAt) || '-'}</TableCell>
                  <TableCell>{record.markedByName}</TableCell>
                  <TableCell>
                    {record.handlingAction
                      ? `${handlingActionLabels[record.handlingAction]}${record.handledAt ? ` (${formatDateTime(record.handledAt)})` : ''}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          上一页
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {page} / {Math.max(totalPages, 1)} 页
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => prev + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
