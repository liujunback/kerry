'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CheckoutRecord {
  id: string
  sequenceNumber: number
  orderNumber: string
  trackingNumber: string | null
  scannedNumber: string
  channelName: string | null
  scannedAt: string
  scannedBy: string | null
  scannedByUser: {
    username: string
    fullName: string | null
  } | null
  order: {
    id: string
    orderNumber: string
    referenceNumber: string | null
    platform: string
    status: string
    client: {
      clientCode: string
      clientName: string
    }
    extension: { checkOutWeightKg: string | null } | null
  } | null
  shipment: {
    trackingNumber: string
  } | null
}

interface CheckoutOrderDetail {
  id: string
  checkoutNumber: string
  checkoutType: string
  status: string
  channelName: string | null
  channelCode: string | null
  orderCount: number
  parcelCount: number
  checkedOutAt: string | null
  mountedAt: string | null
  manifestedAt: string | null
  createdAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  manifestOrder: {
    id: string
    manifestNumber: string
    status: string
  } | null
  checkedOutByUser: { username: string; fullName: string | null } | null
  mountedByUser: { username: string; fullName: string | null } | null
  createdByUser: { username: string; fullName: string | null } | null
  records: CheckoutRecord[]
}

const typeColors: Record<string, string> = {
  PALLET: 'bg-purple-500 text-white',
  BAG: 'bg-orange-500 text-white',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500 text-white',
  CHECKED_OUT: 'bg-green-500 text-white',
  MOUNTED: 'bg-blue-500 text-white',
  MANIFESTED: 'bg-indigo-500 text-white',
}

export default function CheckoutOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('checkout')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const tMenu = useTranslations('menu')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: tMenu('checkoutOrders'), href: '/checkout-orders' },
  })

  const [data, setData] = useState<CheckoutOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/checkout/${params.id}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch checkout order:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('detail.notFound')}</p>
      </div>
    )
  }

  // 计算总重量
  const totalWeight = data.records.reduce((sum, r) => {
    const w = parseFloat(r.order?.extension?.checkOutWeightKg ?? '0')
    return sum + (isNaN(w) ? 0 : w)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail.title'))} />
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon('back')}
        </Button>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('column.checkoutNumber')}:</p>
              <p className="font-medium font-mono">{data.checkoutNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('checkoutType.label')}:</p>
              <Badge className={typeColors[data.checkoutType] || 'bg-gray-500 text-white'}>
                {data.checkoutType === 'PALLET' ? t('checkoutType.pallet') : t('checkoutType.bag')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('status.label')}:</p>
              <Badge className={statusColors[data.status] || 'bg-gray-500 text-white'}>
                {t(`status.${data.status}`)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.warehouse')}:</p>
              <p>{data.warehouse?.warehouseName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.channelName')}:</p>
              <p>{data.channelName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.orderCount')}:</p>
              <p className="font-medium">{data.orderCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.parcelCount')}:</p>
              <p className="font-medium">{data.parcelCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('detail.totalWeight')}:</p>
              <p className="font-medium">{totalWeight > 0 ? `${totalWeight.toFixed(3)} kg` : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.startTime')}:</p>
              <p>{formatDateTime(data.createdAt) || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.completedTime')}:</p>
              <p>{data.checkedOutAt ? formatDateTime(data.checkedOutAt) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('column.operator')}:</p>
              <p>{data.checkedOutByUser?.fullName || data.checkedOutByUser?.username || '-'}</p>
            </div>
            {data.manifestOrder && (
              <div>
                <p className="text-sm text-muted-foreground">{t('detail.manifestNumber')}:</p>
                <Link
                  href={`/manifest-orders/${data.manifestOrder.id}`}
                  className="text-primary hover:underline font-mono"
                >
                  {data.manifestOrder.manifestNumber}
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 扫描记录 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.records')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('table.sequence')}</TableHead>
                <TableHead>{t('detail.orderNumber')}</TableHead>
                <TableHead>{t('detail.trackingNumber')}</TableHead>
                <TableHead>{t('detail.clientName')}</TableHead>
                <TableHead>{t('column.channelName')}</TableHead>
                <TableHead>{t('detail.weightKg')}</TableHead>
                <TableHead>{t('detail.scanOperator')}</TableHead>
                <TableHead>{t('table.scanTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {t('messages.noRecords')}
                  </TableCell>
                </TableRow>
              ) : (
                data.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.sequenceNumber}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.order ? (
                        <Link
                          href={`/orders/${record.order.id}`}
                          className="text-primary hover:underline"
                        >
                          {record.orderNumber}
                        </Link>
                      ) : (
                        record.orderNumber
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.trackingNumber || record.shipment?.trackingNumber || '-'}
                    </TableCell>
                    <TableCell>{record.order?.client?.clientName || '-'}</TableCell>
                    <TableCell>{record.channelName || '-'}</TableCell>
                    <TableCell>{record.order?.extension?.checkOutWeightKg ?? '-'}</TableCell>
                    <TableCell>
                      {record.scannedByUser?.fullName || record.scannedByUser?.username || '-'}
                    </TableCell>
                    <TableCell>{formatDateTime(record.scannedAt) || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
