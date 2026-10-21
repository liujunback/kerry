'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils/date-formatter'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PRINT_SCENARIO_LABELS } from '@/lib/printing/print-config'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SUCCESS: { label: '成功', variant: 'default' },
  FAILED: { label: '失败', variant: 'destructive' },
  PRINTING: { label: '打印中', variant: 'secondary' },
  PENDING: { label: '等待', variant: 'outline' },
}

interface HistoryItem {
  id: string
  labelType: string
  scenarioType: string | null
  labelSpecCode: string | null
  warehouseId: string | null
  status: string
  pageCount: number
  printedAt: string
  errorMessage: string | null
  device: { id: string; name: string } | null
  template: { id: string; name: string } | null
  printedBy: { id: string; fullName: string } | null
  warehouse: { id: string; warehouseName: string; warehouseCode: string } | null
}

export function PrintHistoryTable() {
  const [histories, setHistories] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/print-history?pageSize=50')
      const json = await res.json()
      if (json.success) setHistories(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistories() }, [fetchHistories])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>打印时间</TableHead>
            <TableHead>业务标签</TableHead>
            <TableHead>标签规格</TableHead>
            <TableHead>仓库</TableHead>
            <TableHead>模板</TableHead>
            <TableHead>设备</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead>页数</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">加载中...</TableCell>
            </TableRow>
          ) : histories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">暂无打印记录</TableCell>
            </TableRow>
          ) : (
            histories.map((h) => {
              const statusCfg = STATUS_CONFIG[h.status] ?? { label: h.status, variant: 'outline' as const }
              return (
                <TableRow key={h.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(h.printedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {h.scenarioType
                        ? PRINT_SCENARIO_LABELS[h.scenarioType as keyof typeof PRINT_SCENARIO_LABELS] ?? h.scenarioType
                        : '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{h.labelSpecCode ?? h.labelType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {h.warehouse ? `${h.warehouse.warehouseCode} - ${h.warehouse.warehouseName}` : '全局默认'}
                  </TableCell>
                  <TableCell className="text-sm">{h.template?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{h.device?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{h.printedBy?.fullName ?? '-'}</TableCell>
                  <TableCell className="text-sm">{h.pageCount}</TableCell>
                  <TableCell>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    {h.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{h.errorMessage}</p>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
