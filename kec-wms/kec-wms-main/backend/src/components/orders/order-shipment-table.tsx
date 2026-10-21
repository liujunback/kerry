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
import { formatDateTime } from '@/lib/utils/date-formatter'

interface Shipment {
  id: string
  shipmentNumber: string
  status: string
  carrierName: string | null
  trackingNumber: string | null
  totalWeightKg: number | null
  shippedAt: string | null
}

interface OrderShipmentTableProps {
  orderId: string
}

const shipmentStatusLabels: Record<string, string> = {
  CREATED: '已创建',
  READY: '待发货',
  SHIPPED: '已发货',
  DELIVERED: '已送达',
  CANCELLED: '已取消',
}

const shipmentStatusColors: Record<string, string> = {
  CREATED: 'bg-gray-500 text-white',
  READY: 'bg-yellow-500 text-white',
  SHIPPED: 'bg-green-500 text-white',
  DELIVERED: 'bg-green-600 text-white',
  CANCELLED: 'bg-red-500 text-white',
}

export function OrderShipmentTable({ orderId }: OrderShipmentTableProps) {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShipments()
  }, [orderId])

  const fetchShipments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/outbound-orders/${orderId}`)
      const data = await res.json()
      if (data.success) {
        setShipments(data.data.shipments || [])
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTimeOrDash = (date: string | null) => {
    if (!date) return '-'
    return formatDateTime(date)
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
            <TableHead>包裹号</TableHead>
            <TableHead>物流单号</TableHead>
            <TableHead>承运商</TableHead>
            <TableHead className="text-right">重量(KG)</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>发货时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                暂无包裹数据
              </TableCell>
            </TableRow>
          ) : (
            shipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">{shipment.shipmentNumber}</TableCell>
                <TableCell>{shipment.trackingNumber || '-'}</TableCell>
                <TableCell>{shipment.carrierName || '-'}</TableCell>
                <TableCell className="text-right">{shipment.totalWeightKg?.toString() || '-'}</TableCell>
                <TableCell>
                  <Badge className={shipmentStatusColors[shipment.status] || 'bg-gray-500 text-white'}>
                    {shipmentStatusLabels[shipment.status] || shipment.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTimeOrDash(shipment.shippedAt) || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
