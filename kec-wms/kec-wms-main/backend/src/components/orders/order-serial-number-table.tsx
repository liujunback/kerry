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

interface SerialNumber {
  id: string
  serialNumber: string
  skuId: string
  shippedAt: string | null
  createdBy: string | null
  sku: {
    skuCode: string
    skuName: string | null
  } | null
}

interface OrderSerialNumberTableProps {
  orderId: string
}

export function OrderSerialNumberTable({ orderId }: OrderSerialNumberTableProps) {
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSerialNumbers = async () => {
      try {
        const response = await fetch(`/api/v1/outbound-orders/${orderId}/serial-numbers`)
        const data = await response.json()
        if (data.success) {
          setSerialNumbers(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch serial numbers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSerialNumbers()
  }, [orderId])

  const formatDateTimeOrDash = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr)
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
            <TableHead>SKU编码</TableHead>
            <TableHead>SKU名称</TableHead>
            <TableHead>序列号</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead>操作时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {serialNumbers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                暂无序列号数据
              </TableCell>
            </TableRow>
          ) : (
            serialNumbers.map((sn) => (
              <TableRow key={sn.id}>
                <TableCell className="font-medium">{sn.sku?.skuCode || '-'}</TableCell>
                <TableCell>{sn.sku?.skuName || '-'}</TableCell>
                <TableCell>{sn.serialNumber}</TableCell>
                <TableCell>{sn.createdBy || '-'}</TableCell>
                <TableCell>{formatDateTimeOrDash(sn.shippedAt) || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
