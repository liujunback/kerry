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
import { Badge } from '@/components/ui/badge'

interface InventoryTransaction {
  id: string
  eventNumber: string
  eventType: string
  bucketType: string
  quantityDelta: number
  skuCode: string
  sku: {
    skuName: string
  } | null
  location: {
    locationCode: string
  } | null
  batchNumber: string | null
  lpn: string | null
  referenceType: string | null
  referenceNumber: string | null
  createdAt: string
}

interface OrderInventoryTransactionTableProps {
  orderId: string
}

// 事件类型标签映射
const eventTypeLabels: Record<string, string> = {
  PUTAWAY: '上架',
  PICK: '拣货',
  SHIP: '发货',
  FREEZE: '冻结',
  UNFREEZE: '解冻',
  TRANSFER: '移库',
  ADJUST: '调整',
}

// 桶类型标签映射
const bucketTypeLabels: Record<string, string> = {
  AVAILABLE: '可用',
  ALLOCATED: '已分配',
  PICKING: '拣货中',
  FROZEN: '冻结',
  DEFECTIVE: '不良品',
}

// 事件类型颜色映射
const eventTypeColors: Record<string, string> = {
  PUTAWAY: 'bg-green-500 text-white',
  PICK: 'bg-blue-500 text-white',
  SHIP: 'bg-purple-500 text-white',
  FREEZE: 'bg-orange-500 text-white',
  UNFREEZE: 'bg-cyan-500 text-white',
  TRANSFER: 'bg-indigo-500 text-white',
  ADJUST: 'bg-yellow-500 text-white',
}

export function OrderInventoryTransactionTable({ orderId }: OrderInventoryTransactionTableProps) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(
          `/api/v1/inventory/transactions?referenceId=${orderId}&referenceType=OUTBOUND_ORDER&pageSize=100`
        )
        const data = await response.json()
        if (data.success) {
          setTransactions(data.data)
        }
      } catch (error) {
        console.error('获取库存流水失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无库存流水记录
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>流水号</TableHead>
            <TableHead>事件类型</TableHead>
            <TableHead>桶类型</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>货位</TableHead>
            <TableHead>批次号</TableHead>
            <TableHead>LPN</TableHead>
            <TableHead className="text-right">数量变化</TableHead>
            <TableHead>关联单号</TableHead>
            <TableHead>时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono text-sm">
                {transaction.eventNumber}
              </TableCell>
              <TableCell>
                <Badge className={eventTypeColors[transaction.eventType] || 'bg-gray-500 text-white'}>
                  {eventTypeLabels[transaction.eventType] || transaction.eventType}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {bucketTypeLabels[transaction.bucketType] || transaction.bucketType}
                </span>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{transaction.skuCode}</div>
                  {transaction.sku && (
                    <div className="text-sm text-muted-foreground">
                      {transaction.sku.skuName}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {transaction.location?.locationCode || '-'}
              </TableCell>
              <TableCell>
                {transaction.batchNumber || '-'}
              </TableCell>
              <TableCell>
                {transaction.lpn || '-'}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    transaction.quantityDelta > 0
                      ? 'text-green-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {transaction.quantityDelta > 0 ? '+' : ''}
                  {transaction.quantityDelta}
                </span>
              </TableCell>
              <TableCell>
                {transaction.referenceNumber || '-'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(new Date(transaction.createdAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
