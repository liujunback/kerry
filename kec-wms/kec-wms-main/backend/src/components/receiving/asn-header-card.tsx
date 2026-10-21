'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AsnStatusBadge } from '@/components/asn/asn-status-badge'
import { useReceivingStore } from '@/stores/receiving-store'

export function AsnHeaderCard() {
  const t = useTranslations('receiving')
  const tAsn = useTranslations('asn')
  const { currentAsn } = useReceivingStore()

  if (!currentAsn) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {t('asn.scanFirst')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const progress = currentAsn.totalExpectedQty > 0
    ? Math.round((currentAsn.totalReceivedQty / currentAsn.totalExpectedQty) * 100)
    : 0

  const pendingQty = currentAsn.totalExpectedQty - currentAsn.totalReceivedQty

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* ASN 基本信息 */}
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-4 text-sm flex-1">
            <div>
              <span className="text-muted-foreground">{tAsn('asnNumber')}:</span>
              <span className="ml-2 font-medium">{currentAsn.asnNumber}</span>
            </div>
            {currentAsn.externalNumber && (
              <div>
                <span className="text-muted-foreground">{tAsn('externalNumber')}:</span>
                <span className="ml-2 font-medium">{currentAsn.externalNumber}</span>
              </div>
            )}
          </div>
          <AsnStatusBadge status={currentAsn.status} />
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('progress.title')}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 数量统计 */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold">{currentAsn.totalExpectedQty}</p>
            <p className="text-xs text-muted-foreground">{t('progress.expected')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{currentAsn.totalReceivedQty}</p>
            <p className="text-xs text-muted-foreground">{t('progress.received')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{pendingQty}</p>
            <p className="text-xs text-muted-foreground">{t('progress.remaining')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
