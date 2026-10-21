'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Scan } from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'
import { toast } from 'sonner'

interface SkuScannerProps {
  onSkuScanned: (barcode: string) => Promise<void>
}

export function SkuScanner({ onSkuScanned }: SkuScannerProps) {
  const t = useTranslations('receiving')
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { currentAsn, currentItem, isLoading, setIsLoading } = useReceivingStore()

  // 当 ASN 加载后自动聚焦到 SKU 输入框
  useEffect(() => {
    if (currentAsn && !currentItem && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentAsn, currentItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedValue = inputValue.trim()
    if (!trimmedValue || !currentAsn) return

    setIsLoading(true)
    try {
      await onSkuScanned(trimmedValue)
      setInputValue('')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('messages.skuNotInAsn')
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = !currentAsn || isLoading

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scan className="h-4 w-4" />
          {t('sku.scanTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('form.scanPlaceholder')}
            disabled={isDisabled}
            autoComplete="off"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {currentAsn ? t('form.scanHint') : t('asn.scanFirst')}
          </p>
          {currentItem && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm font-medium">{currentItem.sku.skuCode}</p>
              <p className="text-xs text-muted-foreground truncate">{currentItem.sku.skuName}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
