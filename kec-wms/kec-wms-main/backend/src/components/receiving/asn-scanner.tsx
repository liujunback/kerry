'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Scan, X } from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'
import { toast } from 'sonner'

interface AsnScannerProps {
  onAsnLoaded: (asnNumber: string) => Promise<void>
}

export function AsnScanner({ onAsnLoaded }: AsnScannerProps) {
  const t = useTranslations('receiving')
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { currentAsn, clearAsn, isLoading, setIsLoading } = useReceivingStore()

  // 自动聚焦输入框
  useEffect(() => {
    if (!currentAsn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentAsn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedValue = inputValue.trim()
    if (!trimmedValue) return

    setIsLoading(true)
    try {
      await onAsnLoaded(trimmedValue)
      setInputValue('')
      toast.success(t('asn.loadSuccess'))
    } catch {
      toast.error(t('asn.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    clearAsn()
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  if (currentAsn) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scan className="h-4 w-4" />
              {t('asn.scanTitle')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              {t('asn.changeAsn')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <span className="text-xs text-muted-foreground">ASN:</span>
            <span className="font-mono text-sm font-medium">{currentAsn.asnNumber}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scan className="h-4 w-4" />
          {t('asn.scanTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('asn.scanPlaceholder')}
            disabled={isLoading}
            autoComplete="off"
            className="font-mono h-9"
          />
          <p className="text-xs text-muted-foreground">
            {t('asn.scanHint')}
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
