'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Save, RotateCcw, CheckCircle } from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'

interface ReceivingActionsProps {
  onSave: () => Promise<void>
  onContinue: () => void
  onComplete: () => Promise<void>
}

export function ReceivingActions({ onSave, onContinue, onComplete }: ReceivingActionsProps) {
  const t = useTranslations('receiving')
  const tCommon = useTranslations('common')
  const {
    currentAsn,
    currentItem,
    quantity,
    isSubmitting,
  } = useReceivingStore()

  const canSave = currentItem && quantity > 0 && !isSubmitting
  const canComplete = currentAsn && !isSubmitting

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-2">
          <Button
            onClick={onSave}
            disabled={!canSave}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? tCommon('saving') : t('form.confirmReceive')}
          </Button>
          <Button
            variant="secondary"
            onClick={onContinue}
            disabled={!currentAsn || isSubmitting}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('continueReceiving')}
          </Button>
          <Button
            variant="outline"
            onClick={onComplete}
            disabled={!canComplete}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('completeReceiving')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
