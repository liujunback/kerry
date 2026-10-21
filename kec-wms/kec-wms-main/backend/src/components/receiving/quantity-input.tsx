'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'

export function QuantityInput() {
  const t = useTranslations('receiving')
  const { currentItem, quantity, setQuantity, incrementQuantity } = useReceivingStore()

  const isDisabled = !currentItem
  const maxQty = currentItem?.maxQty ?? 0

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setQuantity(value)
    } else if (e.target.value === '') {
      setQuantity(0)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('form.receivedQty')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => incrementQuantity(-1)}
            disabled={isDisabled || quantity <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={quantity}
            onChange={handleInputChange}
            disabled={isDisabled}
            className="text-center text-lg font-bold"
            min={0}
            max={maxQty}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => incrementQuantity(1)}
            disabled={isDisabled || quantity >= maxQty}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {currentItem && (
          <p className="text-xs text-muted-foreground">
            {t('progress.remaining')}: {maxQty}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
