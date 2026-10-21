'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock } from 'lucide-react'
import { type CellAllocation } from '@/stores/sorting-store'

interface CellDetailLine {
  id: string
  skuCode: string
  skuName: string | null
  orderNumber: string
  expectedQty: number
  sortedQty: number
  status: string
}

interface SortingCellDetailDialogProps {
  open: boolean
  onClose: () => void
  sortingTaskId: string
  cellCode: string
  allocation?: CellAllocation
}

export function SortingCellDetailDialog({
  open,
  onClose,
  sortingTaskId,
  cellCode,
  allocation,
}: SortingCellDetailDialogProps) {
  const [lines, setLines] = useState<CellDetailLine[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/v1/sorting/cell-detail?sortingTaskId=${sortingTaskId}&cellCode=${encodeURIComponent(cellCode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLines(data.data)
      })
      .finally(() => setLoading(false))
  }, [open, sortingTaskId, cellCode])

  const sortedLines = lines.filter((l) => l.status === 'SORTED')
  const pendingLines = lines.filter((l) => l.status === 'PENDING')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            格口 {cellCode} 分拣明细
            {allocation && (
              <Badge variant="outline" className="ml-2 text-xs">
                {allocation.sortedQty}/{allocation.expectedQty}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">加载中...</div>
        ) : (
          <div className="space-y-4">
            {/* 已分拣 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                已分拣 ({sortedLines.length})
              </div>
              {sortedLines.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-5">暂无</p>
              ) : (
                <div className="space-y-1">
                  {sortedLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{line.skuCode}</span>
                        {line.skuName && <span className="ml-1.5 text-muted-foreground text-xs">{line.skuName}</span>}
                        <div className="text-xs text-muted-foreground">{line.orderNumber}</div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {line.sortedQty}/{line.expectedQty}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 未分拣 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-orange-700">
                <Clock className="h-4 w-4" />
                待分拣 ({pendingLines.length})
              </div>
              {pendingLines.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-5">暂无</p>
              ) : (
                <div className="space-y-1">
                  {pendingLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between rounded-md bg-orange-50 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{line.skuCode}</span>
                        {line.skuName && <span className="ml-1.5 text-muted-foreground text-xs">{line.skuName}</span>}
                        <div className="text-xs text-muted-foreground">{line.orderNumber}</div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                        {line.sortedQty}/{line.expectedQty}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
