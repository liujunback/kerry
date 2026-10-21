'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PendingLine } from './pending-lines-table'
import { PendingContainer } from './pending-containers-table'

interface CreatePutawayOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLines: PendingLine[]
  selectedContainerItems: PendingContainer[]
  onSuccess: () => void
}

export function CreatePutawayOrderDialog({
  open,
  onOpenChange,
  selectedLines,
  selectedContainerItems,
  onSuccess,
}: CreatePutawayOrderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLineMode = selectedLines.length > 0
  const isContainerMode = selectedContainerItems.length > 0

  // 容器模式下的汇总计算
  const containerSummary = useMemo(() => {
    if (!isContainerMode) return null

    const containerIds = new Set(selectedContainerItems.map((c) => c.containerId))
    const skuCodes = new Set(selectedContainerItems.map((c) => c.skuCode))
    const totalQty = selectedContainerItems.reduce((sum, c) => sum + c.quantity, 0)
    const goodQty = selectedContainerItems
      .filter((c) => c.qualityType === 'GOOD')
      .reduce((sum, c) => sum + c.quantity, 0)
    const damagedQty = selectedContainerItems
      .filter((c) => c.qualityType !== 'GOOD')
      .reduce((sum, c) => sum + c.quantity, 0)

    return {
      containerCount: containerIds.size,
      skuCount: skuCodes.size,
      totalQty,
      goodQty,
      damagedQty,
    }
  }, [isContainerMode, selectedContainerItems])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        putawayMode: 'TASK_MODE', // 固定使用任务模式
        separateByQuality: true, // 按质量类型分组
      }

      if (isLineMode) {
        body.asnLineIds = selectedLines.map((line) => line.id)
      } else if (isContainerMode) {
        // 获取唯一的容器ID
        const containerIds = [...new Set(selectedContainerItems.map((c) => c.containerId))]
        body.containerIds = containerIds
      }

      const response = await fetch('/api/v1/putaway/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || '上架单创建成功')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.message || '创建失败')
      }
    } catch {
      toast.error('创建上架单失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 计算汇总信息
  const totalQty = isLineMode
    ? selectedLines.reduce((sum, line) => sum + line.pendingQty, 0)
    : 0 // 容器模式下不显示总数量，因为数据结构已改变

  const totalGoodQty = isLineMode
    ? selectedLines.reduce((sum, line) => sum + (line.pendingGoodQty ?? line.pendingQty), 0)
    : 0

  const totalDamagedQty = isLineMode
    ? selectedLines.reduce((sum, line) => sum + (line.pendingDamagedQty ?? 0), 0)
    : 0

  const skuCount = isLineMode
    ? new Set(selectedLines.map((line) => line.skuCode)).size
    : 0 // 容器模式下不显示SKU数量

  // 计算将创建的上架单数量（按 ASN 分组，良品和不良品合并到同一上架单）
  const estimatedOrderCount = isLineMode
    ? (() => {
        const groups = new Set<string>()
        for (const line of selectedLines) {
          const hasPending =
            (line.pendingGoodQty ?? line.pendingQty) > 0 ||
            (line.pendingDamagedQty ?? 0) > 0
          if (hasPending) groups.add(line.asn.id)
        }
        return groups.size
      })()
    : containerSummary?.containerCount ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle>创建上架单</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2">
          {/* 汇总信息 - 紧凑单行显示 */}
          <div className="rounded-lg border p-2 text-xs">
            {isLineMode && !isContainerMode && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><span className="text-muted-foreground">行数:</span> <span className="font-medium">{selectedLines.length}</span></span>
                <span><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{skuCount}种</span></span>
                <span><span className="text-muted-foreground">总数:</span> <span className="font-medium text-primary">{totalQty}</span></span>
                <span><span className="text-muted-foreground">良品:</span> <span className="font-medium text-green-600">{totalGoodQty}</span></span>
                <span><span className="text-muted-foreground">不良:</span> <span className="font-medium text-red-600">{totalDamagedQty}</span></span>
              </div>
            )}
            {isContainerMode && containerSummary && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><span className="text-muted-foreground">容器:</span> <span className="font-medium">{containerSummary.containerCount}个</span></span>
                <span><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{containerSummary.skuCount}种</span></span>
                <span><span className="text-muted-foreground">总数:</span> <span className="font-medium text-primary">{containerSummary.totalQty}</span></span>
                <span><span className="text-muted-foreground">良品:</span> <span className="font-medium text-green-600">{containerSummary.goodQty}</span></span>
                <span><span className="text-muted-foreground">不良:</span> <span className="font-medium text-red-600">{containerSummary.damagedQty}</span></span>
              </div>
            )}
          </div>

          {/* 明细列表 - 更大空间 */}
          {isLineMode && !isContainerMode && selectedLines.length > 0 && (
            <div className="rounded-lg border p-2 space-y-1">
              <h4 className="font-medium text-xs text-muted-foreground">选中明细 ({selectedLines.length})</h4>
              <div className="max-h-[280px] overflow-y-auto space-y-0.5 text-xs">
                {selectedLines.map((line) => (
                  <div key={line.id} className="flex justify-between py-0.5 hover:bg-muted/50 px-1 rounded">
                    <span className="text-muted-foreground truncate mr-2">
                      {line.asn.asnNumber} - {line.skuCode}
                    </span>
                    <span className="font-medium whitespace-nowrap">
                      <span className="text-green-600">{line.pendingGoodQty ?? line.pendingQty}</span>
                      {(line.pendingDamagedQty ?? 0) > 0 && (
                        <span className="text-red-600 ml-1">+{line.pendingDamagedQty}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isContainerMode && selectedContainerItems.length > 0 && (
            <div className="rounded-lg border p-2 space-y-1">
              <h4 className="font-medium text-xs text-muted-foreground">选中明细 ({selectedContainerItems.length})</h4>
              <div className="max-h-[280px] overflow-y-auto space-y-0.5 text-xs">
                {selectedContainerItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-0.5 hover:bg-muted/50 px-1 rounded">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.containerCode} - {item.skuCode}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{item.quantity}</span>
                      {item.qualityType === 'GOOD' ? (
                        <Badge variant="default" className="text-[10px] px-1 py-0 h-4">良品</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">破损</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '创建中...' : '确认创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
