'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface OrderLine {
  id: string
  lineNumber: number
  skuCode: string
  skuName: string | null
  orderedQty: number
  allocatedQty: number
  pickedQty: number
  packedQty: number
  shippedQty: number
  qualityType: string
  batchNumber: string | null
  status: string
  sku: {
    barcode: string | null
    isSelfPackaged: boolean
    isSerialManaged: boolean
  } | null
}

interface OrderSkuTableProps {
  orderId: string
}

const lineStatusLabels: Record<string, string> = {
  PENDING: '待处理',
  ALLOCATED: '已分配',
  PICKING: '拣货中',
  PICKED: '已拣货',
  PACKED: '已打包',
  SHIPPED: '已发货',
}

const qualityTypeLabels: Record<string, string> = {
  GOOD: '良品',
  DEFECTIVE: '次品',
  DAMAGED: '残品',
}

export function OrderSkuTable({ orderId }: OrderSkuTableProps) {
  const [lines, setLines] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLines()
  }, [orderId])

  const fetchLines = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/outbound-orders/${orderId}`)
      const data = await res.json()
      if (data.success) {
        setLines(data.data.lines || [])
      }
    } catch (error) {
      console.error('Failed to fetch order lines:', error)
    } finally {
      setLoading(false)
    }
  }

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
            <TableHead>SKU编码</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>SKU名称</TableHead>
            <TableHead className="text-right">SKU数量</TableHead>
            <TableHead>质量</TableHead>
            <TableHead>批次号</TableHead>
            <TableHead>自带包装</TableHead>
            <TableHead>是否SN</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                暂无SKU数据
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.lineNumber}</TableCell>
                <TableCell className="font-medium">{line.skuCode}</TableCell>
                <TableCell>{line.sku?.barcode || '-'}</TableCell>
                <TableCell>{line.skuName || '-'}</TableCell>
                <TableCell className="text-right">{line.orderedQty}</TableCell>
                <TableCell>{qualityTypeLabels[line.qualityType] || line.qualityType}</TableCell>
                <TableCell>{line.batchNumber || '-'}</TableCell>
                <TableCell>
                  {line.sku?.isSelfPackaged ? (
                    <Badge variant="outline" className="bg-green-50">是</Badge>
                  ) : (
                    <Badge variant="outline">否</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {line.sku?.isSerialManaged ? (
                    <Badge variant="outline" className="bg-blue-50">是</Badge>
                  ) : (
                    <Badge variant="outline">否</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {lineStatusLabels[line.status] || line.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
