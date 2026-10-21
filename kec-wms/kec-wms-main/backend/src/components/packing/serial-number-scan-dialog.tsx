'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface SerialNumberScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skuCode: string
  skuName: string | null
  requiredQuantity: number
  onConfirm: (serialNumbers: string[]) => void | Promise<void>
}

export function SerialNumberScanDialog({
  open,
  onOpenChange,
  skuCode,
  skuName,
  requiredQuantity,
  onConfirm,
}: SerialNumberScanDialogProps) {
  const t = useTranslations('packing.serialDialog')
  const [serialNumbers, setSerialNumbers] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 重置状态
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSerialNumbers([])
      setCurrentInput('')
      // 延迟聚焦，确保对话框已完全打开
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // 添加序列号
  const handleAddSerialNumber = () => {
    const trimmed = currentInput.trim()
    if (!trimmed) return

    // 检查是否重复
    if (serialNumbers.includes(trimmed)) {
      alert(t('duplicate'))
      setCurrentInput('')
      return
    }

    // 检查是否超过需要数量
    if (serialNumbers.length >= requiredQuantity) {
      alert(t('onlyRequired', { count: requiredQuantity }))
      return
    }

    setSerialNumbers([...serialNumbers, trimmed])
    setCurrentInput('')

    // 如果已收集足够数量，自动提交
    if (serialNumbers.length + 1 === requiredQuantity) {
      setTimeout(async () => {
        await onConfirm([...serialNumbers, trimmed])
        // 不在这里关闭对话框，由父组件根据验证结果决定是否关闭
      }, 300)
    }
  }

  // 移除序列号
  const handleRemoveSerialNumber = (index: number) => {
    setSerialNumbers(serialNumbers.filter((_, i) => i !== index))
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSerialNumber()
    }
  }

  // 手动确认
  const handleConfirm = async () => {
    if (serialNumbers.length !== requiredQuantity) {
      alert(t('countMismatch', { required: requiredQuantity, current: serialNumbers.length }))
      return
    }
    await onConfirm(serialNumbers)
    // 不在这里关闭对话框，由父组件根据结果决定是否关闭
  }

  // 清空所有序列号
  const handleClearAll = () => {
    setSerialNumbers([])
    setCurrentInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription asChild>
            <div>
              {skuName && <div className="font-medium text-foreground">{skuName}</div>}
              <div className="text-sm">SKU: {skuCode}</div>
              <div className="text-sm mt-1">
                {t.rich('required', {
                  count: requiredQuantity,
                  strong: (chunks) => <span className="font-bold text-primary">{chunks}</span>,
                })}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 输入框 */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              className="flex-1"
            />
            <Button onClick={handleAddSerialNumber} type="button">
              {t('add')}
            </Button>
          </div>

          {/* 已扫描的序列号列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {t('scannedCount', { current: serialNumbers.length, required: requiredQuantity })}
              </div>
              {serialNumbers.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs"
                >
                  {t('clearAll')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md bg-muted/30">
              {serialNumbers.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('empty')}</div>
              ) : (
                serialNumbers.map((sn, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {sn}
                    <button
                      onClick={() => handleRemoveSerialNumber(index)}
                      className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={serialNumbers.length !== requiredQuantity}
            type="button"
          >
            {t('confirm', { current: serialNumbers.length, required: requiredQuantity })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
