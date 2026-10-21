'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { format } from '@/lib/utils/date-formatter'
import { ArrowLeft, CheckCircle, Printer, Loader2 } from 'lucide-react'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ManifestOrderStatusBadge } from '@/components/manifest-order/manifest-order-status-badge'
import { toast } from 'sonner'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

interface CheckoutRecord {
  id: string
  sequenceNumber: number
  orderNumber: string
  trackingNumber: string | null
  channelName: string | null
  scannedAt: string
  scannedBy: string | null
  scannedByUser: {
    username: string
    fullName: string
  } | null
  order: {
    extension: { checkOutWeightKg: string | null } | null
  } | null
}

interface CheckoutOrder {
  id: string
  checkoutNumber: string
  checkoutType: string
  status: string
  channelName: string | null
  orderCount: number
  parcelCount: number
  checkedOutAt: string | null
  records: CheckoutRecord[]
}

interface ManifestOrderDetail {
  id: string
  manifestNumber: string
  status: string
  channelName: string | null
  orderCount: number
  parcelCount: number
  containerCount: number
  totalWeightKg: string | null
  createdAt: string
  completedAt: string | null
  createdBy: string | null
  createdByUser: { username: string; fullName: string } | null
  completedBy: string | null
  warehouse: {
    warehouseCode: string
    warehouseName: string
  } | null
  client: {
    clientCode: string
    clientName: string
  } | null
  checkoutOrders: CheckoutOrder[]
}

export default function ManifestOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('manifestOrder')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/manifest-orders' },
  })

  const [data, setData] = useState<ManifestOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/manifest-orders/${params.id}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch manifest order:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleComplete = async () => {
    try {
      const res = await fetch(`/api/v1/manifest-orders/${params.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(t('completeSuccess'))
        fetchData()
      } else {
        toast.error(result.error || result.message)
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setCompleteDialogOpen(false)
    }
  }

  const handlePrint = async () => {
    try {
      const res = await fetch(`/api/v1/manifest-orders/${params.id}/print`)
      const result = await res.json()
      if (result.success && result.data?.url) {
        const printResult = await printPdfWithAgentFallback({
          pdfUrl: result.data.url,
          jobIdPrefix: 'manifest-order',
          scenarioType: 'MANIFEST_ORDER',
          relatedIds: [String(params.id)],
          relatedType: 'MANIFEST_ORDER',
          pageCount: 1,
        })
        if (printResult.mode === 'browser') {
          toast.warning('打印插件不可用，已回退浏览器打印')
        }
      } else {
        toast.error('打印失败')
      }
    } catch {
      toast.error('打印失败')
    }
  }

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
        <p className="text-muted-foreground">未找到数据</p>
      </div>
    )
  }

  // 汇总所有签出单的记录
  const allRecords = data.checkoutOrders.flatMap((checkout) =>
    checkout.records.map((record) => ({
      ...record,
      checkoutNumber: checkout.checkoutNumber,
      checkoutType: checkout.checkoutType,
    }))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail.title'))} />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon('back')}
          </Button>
          {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
            <Button onClick={() => setCompleteDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('actions.complete')}
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('actions.print')}
          </Button>
        </div>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('manifestNumber')}:</p>
              <p className="font-medium text-primary">{data.manifestNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('status')}:</p>
              <ManifestOrderStatusBadge status={data.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('warehouse')}:</p>
              <p className="font-medium text-primary">{data.warehouse?.warehouseName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('operator')}:</p>
              <p>{data.createdByUser?.fullName || data.createdByUser?.username || data.createdBy || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('startTime')}:</p>
              <p>{format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('completedAt')}:</p>
              <p>{data.completedAt ? format(new Date(data.completedAt), 'yyyy-MM-dd HH:mm:ss') : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 明细 Tab */}
      <Card>
        <Tabs defaultValue="checkoutOrders">
          <CardHeader>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="checkoutOrders">{t('detail.checkoutOrders')}</TabsTrigger>
                <TabsTrigger value="orderDetails">{t('detail.orderDetails')}</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-6 text-sm">
                <span>{t('containerCount')}: <strong>{data.containerCount}</strong></span>
                <span>{t('orderCount')}: <strong>{data.orderCount}</strong></span>
                <span>{t('parcelCount')}: <strong>{data.parcelCount}</strong></span>
                <span>{t('totalWeightKg')}: <strong>{data.totalWeightKg ?? '-'}</strong></span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="checkoutOrders">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail.checkoutNumber')}</TableHead>
                    <TableHead>{t('detail.checkoutType')}</TableHead>
                    <TableHead>{t('detail.checkoutStatus')}</TableHead>
                    <TableHead>{t('channelName')}</TableHead>
                    <TableHead>{t('orderCount')}</TableHead>
                    <TableHead>{t('parcelCount')}</TableHead>
                    <TableHead>{t('detail.checkedOutAt')}</TableHead>
                    <TableHead>{t('detail.weightKg')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.checkoutOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {tCommon('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.checkoutOrders.map((checkout) => {
                      const totalWeight = checkout.records.reduce((sum, r) => {
                        const w = parseFloat(r.order?.extension?.checkOutWeightKg ?? '0')
                        return sum + (isNaN(w) ? 0 : w)
                      }, 0)
                      return (
                        <TableRow key={checkout.id}>
                          <TableCell>{checkout.checkoutNumber}</TableCell>
                          <TableCell>
                            {checkout.checkoutType === 'PALLET' ? t('detail.checkoutTypes.pallet') : t('detail.checkoutTypes.bag')}
                          </TableCell>
                          <TableCell>{t(`detail.checkoutStatuses.${checkout.status}`)}</TableCell>
                          <TableCell>{checkout.channelName || '-'}</TableCell>
                          <TableCell>{checkout.orderCount}</TableCell>
                          <TableCell>{checkout.parcelCount}</TableCell>
                          <TableCell>{checkout.checkedOutAt ? format(new Date(checkout.checkedOutAt), 'yyyy-MM-dd HH:mm:ss') : '-'}</TableCell>
                          <TableCell>{totalWeight > 0 ? totalWeight.toFixed(3) : '-'}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="orderDetails">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail.orderNumber')}</TableHead>
                    <TableHead>{t('detail.trackingNumber')}</TableHead>
                    <TableHead>{t('detail.platformNumber')}</TableHead>
                    <TableHead>{t('detail.containerNumber')}</TableHead>
                    <TableHead>{t('channelName')}</TableHead>
                    <TableHead>{t('operator')}</TableHead>
                    <TableHead>{t('detail.operationTime')}</TableHead>
                    <TableHead>{t('detail.weightKg')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {tCommon('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.orderNumber}</TableCell>
                        <TableCell>{record.trackingNumber || '-'}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{record.checkoutNumber}</TableCell>
                        <TableCell>{record.channelName || '-'}</TableCell>
                        <TableCell>{record.scannedByUser?.fullName || record.scannedByUser?.username || '-'}</TableCell>
                        <TableCell>{format(new Date(record.scannedAt), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                        <TableCell>{record.order?.extension?.checkOutWeightKg ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmComplete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmCompleteDesc', { number: data.manifestNumber })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
