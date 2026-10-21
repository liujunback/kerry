'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useReceivingStore } from '@/stores/receiving-store'

export function BatchInfoForm() {
  const t = useTranslations('receiving')
  const {
    currentItem,
    batchNumber,
    expiryDate,
    setBatchNumber,
    setExpiryDate,
  } = useReceivingStore()

  // 只有当 SKU 需要批次管理或效期管理时才显示
  const showBatch = currentItem?.sku.isBatchManaged
  const showExpiry = currentItem?.sku.isExpiryManaged

  if (!currentItem || (!showBatch && !showExpiry)) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('form.batchNumber')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showBatch && (
          <div className="space-y-2">
            <Label htmlFor="batch-number">{t('form.batchNumber')}</Label>
            <Input
              id="batch-number"
              value={batchNumber || ''}
              onChange={(e) => setBatchNumber(e.target.value || null)}
              placeholder={t('form.batchNumber')}
            />
          </div>
        )}
        {showExpiry && (
          <div className="space-y-2">
            <Label htmlFor="expiry-date">{t('form.expiryDate')}</Label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate ? expiryDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null
                setExpiryDate(date)
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
