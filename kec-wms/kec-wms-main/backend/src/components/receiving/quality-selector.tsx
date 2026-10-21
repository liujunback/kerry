'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'
import { cn } from '@/lib/utils'

export function QualitySelector() {
  const t = useTranslations('receiving')
  const { currentItem, qualityStatus, setQualityStatus } = useReceivingStore()

  const isDisabled = !currentItem

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('quality.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={qualityStatus}
          onValueChange={(value) => setQualityStatus(value as 'GOOD' | 'DAMAGED')}
          disabled={isDisabled}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <RadioGroupItem
              value="GOOD"
              id="quality-good"
              className="peer sr-only"
            />
            <Label
              htmlFor="quality-good"
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                'peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 dark:peer-data-[state=checked]:bg-green-950',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <CheckCircle2 className={cn(
                'h-8 w-8 mb-2',
                qualityStatus === 'GOOD' ? 'text-green-500' : 'text-muted-foreground'
              )} />
              <span className="font-medium">{t('quality.good')}</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="DAMAGED"
              id="quality-damaged"
              className="peer sr-only"
            />
            <Label
              htmlFor="quality-damaged"
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                'peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <XCircle className={cn(
                'h-8 w-8 mb-2',
                qualityStatus === 'DAMAGED' ? 'text-red-500' : 'text-muted-foreground'
              )} />
              <span className="font-medium">{t('quality.damaged')}</span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
