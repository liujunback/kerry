'use client'

import { useState, useRef, useEffect, useCallback, startTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, X, ScanLine, CheckCircle, List, Loader2 } from 'lucide-react'

interface AvailableSerial {
  serialNumber: string
  receivedAt: string | null
}

interface SerialScanDialogProps {
  open: boolean
  skuCode: string
  skuName: string
  requiredCount: number
  initialSerialNumbers?: string[]
  // 可选：用于上架模式，提供可选序列号列表
  skuId?: string
  warehouseId?: string
  putawayOrderId?: string
  onConfirm: (serialNumbers: string[]) => void
  onCancel: () => void
}

export function SerialScanDialog({
  open,
  skuCode,
  skuName,
  requiredCount,
  initialSerialNumbers = [],
  skuId,
  warehouseId,
  putawayOrderId,
  onConfirm,
  onCancel,
}: SerialScanDialogProps) {
  const t = useTranslations('receiving.serialScanDialog')
  const [serialInput, setSerialInput] = useState('')
  const [localSerialNumbers, setLocalSerialNumbers] = useState<string[]>([])
  const [availableSerials, setAvailableSerials] = useState<AvailableSerial[]>([])
  const [isLoadingSerials, setIsLoadingSerials] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 是否为上架模式（有 skuId 参数）
  const isPutawayMode = !!skuId

  // 加载可用序列号
  useEffect(() => {
    if (open && isPutawayMode && skuId) {
      startTransition(() => {
        setIsLoadingSerials(true)
        const params = new URLSearchParams({ skuId })
        if (warehouseId) params.append('warehouseId', warehouseId)
        if (putawayOrderId) params.append('putawayOrderId', putawayOrderId)

        fetch(`/api/v1/shelving/sku/serial-numbers?${params}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setAvailableSerials(data.data)
            }
          })
          .catch(console.error)
          .finally(() => setIsLoadingSerials(false))
      })
    }
  }, [open, isPutawayMode, skuId, warehouseId, putawayOrderId])

  // 初始化序列号列表
  useEffect(() => {
    if (open) {
      startTransition(() => {
        setLocalSerialNumbers(initialSerialNumbers)
        setSerialInput('')
        if (!isPutawayMode) {
          setAvailableSerials([])
        }
      })
    }
  }, [open, initialSerialNumbers, isPutawayMode])

  // 自动聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // 添加序列号
  const handleAddSerial = useCallback(() => {
    const serial = serialInput.trim()
    if (!serial) return

    if (localSerialNumbers.includes(serial)) {
      toast.error(t('duplicateSerial'))
      return
    }

    if (localSerialNumbers.length >= requiredCount) {
      toast.error(t('countReached'))
      return
    }

    // 上架模式下验证序列号是否在可用列表中
    if (isPutawayMode && availableSerials.length > 0) {
      const isValid = availableSerials.some(s => s.serialNumber === serial)
      if (!isValid) {
        toast.error(t('serialNotAvailable'))
        return
      }
    }

    setLocalSerialNumbers(prev => [...prev, serial])
    setSerialInput('')
    inputRef.current?.focus()
  }, [serialInput, localSerialNumbers, requiredCount, isPutawayMode, availableSerials, t])

  // 切换选择序列号（从可选列表）
  const handleToggleSerial = useCallback((serial: string) => {
    if (localSerialNumbers.includes(serial)) {
      setLocalSerialNumbers(prev => prev.filter(s => s !== serial))
    } else {
      if (localSerialNumbers.length >= requiredCount) {
        toast.error(t('countReached'))
        return
      }
      setLocalSerialNumbers(prev => [...prev, serial])
    }
  }, [localSerialNumbers, requiredCount, t])

  // 全选可用序列号
  const handleSelectAll = useCallback(() => {
    const toSelect = availableSerials
      .slice(0, requiredCount)
      .map(s => s.serialNumber)
    setLocalSerialNumbers(toSelect)
  }, [availableSerials, requiredCount])

  // 移除序列号
  const handleRemoveSerial = useCallback((serial: string) => {
    setLocalSerialNumbers(prev => prev.filter(s => s !== serial))
  }, [])

  // 确认
  const handleConfirm = useCallback(() => {
    if (localSerialNumbers.length !== requiredCount) {
      toast.error(t('countMismatch'))
      return
    }
    onConfirm(localSerialNumbers)
  }, [localSerialNumbers, requiredCount, onConfirm, t])

  const progress = (localSerialNumbers.length / requiredCount) * 100
  const isComplete = localSerialNumbers.length === requiredCount

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {skuCode} - {skuName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 进度显示 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('progress')}</span>
              <span className={isComplete ? 'text-green-600 font-medium' : ''}>
                {localSerialNumbers.length} / {requiredCount}
              </span>
            </div>
            <Progress value={progress} className={isComplete ? '[&>div]:bg-green-600' : ''} />
          </div>

          {/* 序列号输入 */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSerial()
                }
              }}
              placeholder={t('inputPlaceholder')}
              className="font-mono"
              disabled={isComplete}
            />
            <Button
              size="icon"
              onClick={handleAddSerial}
              disabled={!serialInput.trim() || isComplete}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 可选序列号列表（上架模式） */}
          {isPutawayMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <List className="h-4 w-4" />
                  {t('availableList')}
                </span>
                {availableSerials.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isComplete}
                  >
                    {t('selectAll')}
                  </Button>
                )}
              </div>
              {isLoadingSerials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableSerials.length > 0 ? (
                <ScrollArea className="h-32 rounded-md border p-2">
                  <div className="space-y-1">
                    {availableSerials.map((item) => {
                      const isSelected = localSerialNumbers.includes(item.serialNumber)
                      return (
                        <div
                          key={item.serialNumber}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => handleToggleSerial(item.serialNumber)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSerial(item.serialNumber)}
                          />
                          <span className="font-mono text-sm flex-1">{item.serialNumber}</span>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {t('noAvailableSerials')}
                </div>
              )}
            </div>
          )}

          {/* 已扫描序列号列表 */}
          {localSerialNumbers.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t('scannedList')}</span>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-muted rounded-lg">
                {localSerialNumbers.map((serial, index) => (
                  <Badge
                    key={serial}
                    variant="secondary"
                    className="font-mono text-xs flex items-center gap-1"
                  >
                    <span className="text-muted-foreground">{index + 1}.</span>
                    {serial}
                    <button
                      type="button"
                      onClick={() => handleRemoveSerial(serial)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 完成提示 */}
          {isComplete && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              {t('complete')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!isComplete}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
