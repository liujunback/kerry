'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'
import { toast } from 'sonner'

export function SerialNumberInput() {
  const t = useTranslations('receiving')
  const [inputValue, setInputValue] = useState('')
  const {
    currentItem,
    quantity,
    serialNumbers,
    addSerialNumber,
    removeSerialNumber,
  } = useReceivingStore()

  // 只有当 SKU 需要序列号管理时才显示
  if (!currentItem?.sku.isSerialManaged) {
    return null
  }

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    if (serialNumbers.includes(trimmed)) {
      toast.error('序列号已存在')
      return
    }

    if (serialNumbers.length >= quantity) {
      toast.error('序列号数量不能超过收货数量')
      return
    }

    addSerialNumber(trimmed)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('form.serialNumbers')}</CardTitle>
          <Badge variant="secondary">
            {serialNumbers.length} / {quantity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="扫描或输入序列号"
            className="font-mono"
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={handleAdd}
            disabled={!inputValue.trim() || serialNumbers.length >= quantity}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {serialNumbers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {serialNumbers.map((serial) => (
              <Badge
                key={serial}
                variant="outline"
                className="font-mono text-xs py-1 px-2"
              >
                {serial}
                <button
                  onClick={() => removeSerialNumber(serial)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
