'use client'

import { useTranslations } from 'next-intl'
import { Package, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePackingStore } from '@/stores/packing-store'

export function PickOrderHeaderCard() {
  const t = useTranslations('packing')
  const { currentPickOrder, selectedOrder } = usePackingStore()

  // 如果有选中的订单，只显示订单信息
  if (selectedOrder) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              {t('labels.orderNumber')}: {selectedOrder.orderNumber}
            </div>
            {selectedOrder.isComplete ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">{t('status.completed')}</Badge>
            ) : (
              <Badge variant="default">{t('status.packing')}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('labels.pendingPack')}</p>
              <p className="text-lg font-semibold">{selectedOrder.totalExpected}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('labels.packed')}</p>
              <p className="text-lg font-semibold text-green-600">{selectedOrder.totalPacked}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('labels.progress')}</p>
              <p className="text-lg font-semibold">
                {selectedOrder.totalExpected > 0
                  ? `${Math.round((selectedOrder.totalPacked / selectedOrder.totalExpected) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentPickOrder) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            {t('header.taskNumber')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t('header.scanFirst')}</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PICKED':
        return <Badge variant="secondary">{t('status.picked')}</Badge>
      case 'PACKING':
        return <Badge variant="default">{t('status.packing')}</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-50 text-green-700">{t('status.completed')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            {currentPickOrder.taskNumber}
          </div>
          {getStatusBadge(currentPickOrder.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('labels.orderCount')}</p>
            <p className="text-lg font-semibold">{currentPickOrder.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('header.totalQty')}</p>
            <p className="text-lg font-semibold">{currentPickOrder.totalQty}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('header.pickedQty')}</p>
            <p className="text-lg font-semibold">{currentPickOrder.pickedQty}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('header.packedQty')}</p>
            <p className="text-lg font-semibold text-green-600">{currentPickOrder.packedQty}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('labels.warehouse')}</p>
            <p className="text-lg font-semibold">{currentPickOrder.warehouseName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
