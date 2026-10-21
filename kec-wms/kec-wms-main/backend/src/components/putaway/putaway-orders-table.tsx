'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Printer, Eye, Copy } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { PutawayOrderStatusBadge } from './putaway-order-status-badge'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

export interface PutawayOrder {
  id: string
  putawayOrderNumber: string
  status: string
  putawayMode: string
  totalQty: number
  putawayQty: number
  pendingQty: number
  skuCount: number
  containerCount: number
  createdAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  client: {
    clientCode: string
    clientName: string
  }
  asn: {
    asnNumber: string
  }
  _count: {
    putawayTasks: number
  }
}

interface PutawayOrdersTableProps {
  orders: PutawayOrder[]
  isLoading?: boolean
  onViewDetail?: (order: PutawayOrder) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function PutawayOrdersTable({
  orders,
  isLoading,
  onViewDetail,
  selectedIds = new Set(),
  onSelectionChange,
}: PutawayOrdersTableProps) {
  const t = useTranslations('putaway')
  const [printingId, setPrintingId] = useState<string | null>(null)

  // 打印上架单
  const handlePrint = async (e: React.MouseEvent, order: PutawayOrder) => {
    e.stopPropagation()
    setPrintingId(order.id)

    try {
      const result = await printPdfWithAgentFallback({
        pdfUrl: `/api/v1/files/putaway-order/batch?ids=${order.id}`,
        jobIdPrefix: 'putaway-order',
        scenarioType: 'PUTAWAY_ORDER',
        relatedIds: [order.id],
        relatedType: 'PUTAWAY_ORDER',
        pageCount: 1,
      })
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error('打印失败')
    } finally {
      setPrintingId(null)
    }
  }

  // 复制上架单号
  const handleCopy = async (e: React.MouseEvent, orderNumber: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(orderNumber)
      toast.success('已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  // 可选择的订单（排除已完成状态）
  const selectableOrders = orders.filter((o) => o.status !== 'COMPLETED')

  // 全选/取消全选（只选择可选择的订单）
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange(new Set(selectableOrders.map((o) => o.id)))
    } else {
      onSelectionChange(new Set())
    }
  }

  // 单选
  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    onSelectionChange(newSet)
  }

  const isAllSelected = selectableOrders.length > 0 && selectableOrders.every((o) => selectedIds.has(o.id))
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && <TableHead className="w-[50px]"></TableHead>}
              <TableHead>{t('orderTable.orderNumber')}</TableHead>
              <TableHead>{t('orderTable.asnNumber')}</TableHead>
              <TableHead>{t('orderTable.warehouse')}</TableHead>
              <TableHead>{t('orderTable.client')}</TableHead>
              <TableHead>{t('orderTable.status')}</TableHead>
              <TableHead className="w-[70px]">{t('orderTable.totalQty')}</TableHead>
              <TableHead className="w-[70px]">{t('orderTable.putawayQty')}</TableHead>
              <TableHead className="w-[70px]">{t('orderTable.pendingQty')}</TableHead>
              <TableHead>{t('orderTable.putawayMode')}</TableHead>
              <TableHead>{t('orderTable.createdAt')}</TableHead>
              <TableHead className="w-[80px]">{t('orderTable.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: onSelectionChange ? 12 : 11 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        {t('noOrders')}
      </div>
    )
  }

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'TASK_MODE':
        return t('orderDetail.modes.TASK_MODE')
      case 'CONTAINER_MODE':
        return t('orderDetail.modes.CONTAINER_MODE')
      case 'MIXED_MODE':
        return t('orderDetail.modes.MIXED_MODE')
      default:
        return mode
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label={t('table.selectAll')}
                  {...(isIndeterminate ? { 'data-state': 'indeterminate' } : {})}
                />
              </TableHead>
            )}
            <TableHead>{t('orderTable.orderNumber')}</TableHead>
            <TableHead>{t('orderTable.asnNumber')}</TableHead>
            <TableHead>{t('orderTable.warehouse')}</TableHead>
            <TableHead>{t('orderTable.client')}</TableHead>
            <TableHead>{t('orderTable.status')}</TableHead>
            <TableHead className="w-[70px]">{t('orderTable.totalQty')}</TableHead>
            <TableHead className="w-[70px]">{t('orderTable.putawayQty')}</TableHead>
            <TableHead className="w-[70px]">{t('orderTable.pendingQty')}</TableHead>
            <TableHead>{t('orderTable.putawayMode')}</TableHead>
            <TableHead>{t('orderTable.createdAt')}</TableHead>
            <TableHead className="w-[80px]">{t('orderTable.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isCompleted = order.status === 'COMPLETED'
            return (
            <TableRow key={order.id}>
              {onSelectionChange && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(order.id)}
                    onCheckedChange={(checked) => handleSelectOne(order.id, !!checked)}
                    aria-label={`选择 ${order.putawayOrderNumber}`}
                    disabled={isCompleted}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  <span
                    className="cursor-pointer hover:text-primary hover:underline"
                    onClick={() => onViewDetail?.(order)}
                  >
                    {order.putawayOrderNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleCopy(e, order.putawayOrderNumber)}
                    title="复制单号"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{order.asn.asnNumber}</TableCell>
              <TableCell>{order.warehouse.warehouseName}</TableCell>
              <TableCell>{order.client.clientName}</TableCell>
              <TableCell>
                <PutawayOrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>{order.totalQty}</TableCell>
              <TableCell>{order.putawayQty}</TableCell>
              <TableCell>{order.pendingQty}</TableCell>
              <TableCell>{getModeLabel(order.putawayMode)}</TableCell>
              <TableCell>
                {formatDateTime(order.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {onViewDetail && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(order)}
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handlePrint(e, order)}
                    disabled={printingId === order.id}
                    title="打印上架单"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  )
}
