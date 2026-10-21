'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  ScanLine,
  Keyboard,
  Package,
} from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ReceivingMode = 'scan' | 'manual'

interface SkuScanPanelProps {
  onAsnLoaded: (asnNumber: string) => Promise<void>
  onSkuScanned: (barcode: string) => Promise<void>
  onSave: () => Promise<void>
  onContinue: () => void
  onOpenSerialDialog?: () => void
  initialAsnNumber?: string | null
}

export function SkuScanPanel({
  onAsnLoaded,
  onSkuScanned,
  onSave,
  onContinue,
  onOpenSerialDialog,
  initialAsnNumber,
}: SkuScanPanelProps) {
  const t = useTranslations('receiving')
  const tCommon = useTranslations('common')

  const {
    currentAsn,
    currentItem,
    quantity,
    qualityStatus,
    batchNumber,
    expiryDate,
    serialNumbers,
    availableBatchLines,
    isLoading,
    isSubmitting,
    clearAsn,
    setIsLoading,
    setQuantity,
    incrementQuantity,
    setQualityStatus,
    selectBatchLine,
    setExpiryDate,
  } = useReceivingStore()

  const [asnInput, setAsnInput] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [receivingMode, setReceivingMode] = useState<ReceivingMode>('manual')
  const [showContinueConfirm, setShowContinueConfirm] = useState(false)

  const asnInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const initialLoadedRef = useRef(false)

  // 自动聚焦
  useEffect(() => {
    if (!currentAsn && asnInputRef.current) {
      asnInputRef.current.focus()
    } else if (currentAsn && skuInputRef.current) {
      skuInputRef.current.focus()
    }
  }, [currentAsn, currentItem])

  // 从URL参数自动加载ASN
  useEffect(() => {
    if (initialAsnNumber && !currentAsn && !initialLoadedRef.current) {
      initialLoadedRef.current = true
      setIsLoading(true)
      onAsnLoaded(initialAsnNumber)
        .then(() => {
          toast.success(t('asn.loadSuccess'))
          setTimeout(() => skuInputRef.current?.focus(), 50)
        })
        .catch((error: unknown) => {
          const msg = error instanceof Error ? error.message : t('asn.loadFailed')
          toast.error(msg)
          setTimeout(() => asnInputRef.current?.focus(), 50)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [initialAsnNumber, currentAsn, onAsnLoaded, setIsLoading, t])

  // ASN 提交
  const handleAsnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = asnInput.trim()
    if (!trimmed) return

    setIsLoading(true)
    try {
      await onAsnLoaded(trimmed)
      setAsnInput('')
      toast.success(t('asn.loadSuccess'))
      setTimeout(() => skuInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('asn.loadFailed')
      toast.error(msg)
      setAsnInput('')
      setTimeout(() => asnInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }

  // 清除 ASN
  const handleClearAsn = () => {
    clearAsn()
    setAsnInput('')
    setTimeout(() => asnInputRef.current?.focus(), 100)
  }

  // SKU 提交
  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = skuInput.trim()
    if (!trimmed || !currentAsn) return

    setIsLoading(true)
    try {
      // 逐件扫描模式：如果已有当前SKU且条码相同，直接增加数量
      if (receivingMode === 'scan' && currentItem &&
          (currentItem.sku.barcode === trimmed || currentItem.sku.skuCode === trimmed)) {
        if (quantity < currentItem.maxQty) {
          incrementQuantity(1)
          toast.success(`+1 (${quantity + 1}/${currentItem.maxQty})`)
        } else {
          toast.warning('已达到最大可收数量')
        }
        setSkuInput('')
        setTimeout(() => skuInputRef.current?.focus(), 50)
        return
      }

      // 加载新的 SKU
      await onSkuScanned(trimmed)
      setSkuInput('')

      // 逐件扫描模式下，自动设置数量为1
      if (receivingMode === 'scan') {
        setQuantity(1)
        setTimeout(() => skuInputRef.current?.focus(), 50)
      } else {
        // 手动录入模式下，光标跳转到数量输入框
        setTimeout(() => quantityInputRef.current?.focus(), 50)
      }

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('messages.skuNotInAsn')
      toast.error(msg)
      setSkuInput('')
      setTimeout(() => skuInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }

  // 数量输入
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setQuantity(value)
    } else if (e.target.value === '') {
      setQuantity(0)
    }
  }

  const maxQty = currentItem?.maxQty ?? 0
  const showBatch = currentItem?.sku.isBatchManaged
  const showExpiry = currentItem?.sku.isExpiryManaged
  const showSerial = currentItem?.sku.isSerialManaged
  const canSave = currentItem && quantity > 0 && !isSubmitting

  return (
    <Card className="shadow-sm">
      <CardContent className="px-4 py-4 space-y-3">
        {/* ASN 扫描区 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            {t('asn.scanTitle')}
          </Label>
          {currentAsn ? (
            <div className="flex items-center justify-between p-2 bg-muted rounded text-sm">
              <span className="font-mono font-medium">{currentAsn.asnNumber}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAsn}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {t('asn.changeAsn')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAsnSubmit}>
              <Input
                ref={asnInputRef}
                value={asnInput}
                onChange={(e) => setAsnInput(e.target.value)}
                placeholder={t('asn.scanPlaceholder')}
                disabled={isLoading}
                autoComplete="off"
                className="font-mono h-9"
              />
            </form>
          )}
        </div>

        <Separator />

        {/* 收货模式切换 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            {t('mode.title')}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setReceivingMode('manual')
                // 切换到手动录入模式时，重置数量为0
                if (currentItem) {
                  setQuantity(0)
                }
                setTimeout(() => skuInputRef.current?.focus(), 50)
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded border-2 p-2 transition-all text-sm',
                receivingMode === 'manual'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-accent'
              )}
            >
              <Keyboard className={cn('h-4 w-4', receivingMode === 'manual' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-medium">{t('mode.manual')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setReceivingMode('scan')
                setTimeout(() => skuInputRef.current?.focus(), 50)
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded border-2 p-2 transition-all text-sm',
                receivingMode === 'scan'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-accent'
              )}
            >
              <ScanLine className={cn('h-4 w-4', receivingMode === 'scan' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-medium">{t('mode.scan')}</span>
            </button>
          </div>
        </div>

        <Separator />

        {/* SKU 扫描区 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            {t('sku.scanTitle')}
            {receivingMode === 'scan' && currentItem && (
              <span className="ml-2 text-primary">
                (重复扫描 +1)
              </span>
            )}
          </Label>
          <form onSubmit={handleSkuSubmit}>
            <Input
              ref={skuInputRef}
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder={receivingMode === 'scan' ? '扫描条码自动+1' : t('form.scanPlaceholder')}
              disabled={!currentAsn || isLoading}
              autoComplete="off"
              className="font-mono h-9"
            />
          </form>
          {currentItem && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm flex items-center justify-between">
              <div>
                <span className="font-medium">{currentItem.sku.skuCode}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {currentItem.sku.skuName}
                </span>
              </div>
              {receivingMode === 'scan' && (
                <Badge variant="secondary" className="text-xs">
                  {quantity}/{maxQty}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* 手动录入模式下显示数量输入 */}
        {receivingMode === 'manual' && (
          <>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                {t('form.receivedQty')}
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => incrementQuantity(-1)}
                  disabled={!currentItem || quantity <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  ref={quantityInputRef}
                  type="number"
                  value={quantity || ''}
                  onChange={handleQtyChange}
                  disabled={!currentItem}
                  className="text-center text-lg font-bold h-9"
                  min={0}
                  max={maxQty}
                  placeholder="0"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => incrementQuantity(1)}
                  disabled={!currentItem || quantity >= maxQty}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-1 mt-2">
                <span className="text-xs text-muted-foreground self-center mr-1">
                  {t('form.quickQty')}:
                </span>
                {[1, 5, 10].map((n) => (
                  <Button
                    key={n}
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setQuantity(n)}
                    disabled={!currentItem || n > maxQty}
                  >
                    {n}
                  </Button>
                ))}
                {maxQty > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setQuantity(maxQty)}
                    disabled={!currentItem || quantity === maxQty}
                  >
                    MAX
                  </Button>
                )}
              </div>
              {currentItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('progress.remaining')}: {maxQty}
                </p>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* 质量状态 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            {t('quality.title')}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setQualityStatus('GOOD')}
              disabled={!currentItem}
              className={cn(
                'flex items-center justify-center gap-2 rounded border-2 p-2 transition-all',
                qualityStatus === 'GOOD'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-border hover:bg-accent',
                !currentItem && 'opacity-50 cursor-not-allowed'
              )}
            >
              <CheckCircle2
                className={cn(
                  'h-5 w-5',
                  qualityStatus === 'GOOD' ? 'text-green-500' : 'text-muted-foreground'
                )}
              />
              <span className="text-sm font-medium">{t('quality.good')}</span>
            </button>
            <button
              type="button"
              onClick={() => setQualityStatus('DAMAGED')}
              disabled={!currentItem}
              className={cn(
                'flex items-center justify-center gap-2 rounded border-2 p-2 transition-all',
                qualityStatus === 'DAMAGED'
                  ? 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-border hover:bg-accent',
                !currentItem && 'opacity-50 cursor-not-allowed'
              )}
            >
              <XCircle
                className={cn(
                  'h-5 w-5',
                  qualityStatus === 'DAMAGED' ? 'text-red-500' : 'text-muted-foreground'
                )}
              />
              <span className="text-sm font-medium">{t('quality.damaged')}</span>
            </button>
          </div>
        </div>

        {/* 批次/效期 (条件显示) */}
        {currentItem && (showBatch || showExpiry) && (
          <>
            <Separator />
            <div className={cn(
              "grid gap-2",
              showBatch && showExpiry ? "grid-cols-2" : "grid-cols-1"
            )}>
              {showBatch && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {t('form.batchNumber')}
                  </Label>
                  {/* 如果有多个批次可选，显示下拉选择器 */}
                  {availableBatchLines.length > 1 ? (
                    <Select
                      value={currentItem.asnLineId}
                      onValueChange={(lineId) => selectBatchLine(lineId)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={t('form.selectBatch')}>
                          {batchNumber || t('form.noBatch')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableBatchLines.map((line) => (
                          <SelectItem key={line.id} value={line.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{line.batchNumber || t('form.noBatch')}</span>
                              <span className="text-xs text-muted-foreground">
                                ({t('form.remaining')}: {line.remainingQty})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    /* 只有一个批次或无批次，显示只读文本 */
                    <div className="h-8 px-3 py-1 text-sm bg-muted rounded-md flex items-center">
                      {batchNumber || '-'}
                    </div>
                  )}
                </div>
              )}
              {showExpiry && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {t('form.expiryDate')}
                  </Label>
                  <Input
                    type="date"
                    value={expiryDate ? expiryDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null
                      setExpiryDate(date)
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* 序列号提示 (条件显示) */}
        {showSerial && (
          <>
            <Separator />
            <button
              type="button"
              onClick={onOpenSerialDialog}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded transition-all',
                serialNumbers.length === quantity
                  ? 'bg-green-50 dark:bg-green-950 border-2 border-green-500'
                  : 'bg-amber-50 dark:bg-amber-950 border-2 border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900'
              )}
            >
              <div className="flex items-center gap-2">
                <Package className={cn(
                  'h-4 w-4',
                  serialNumbers.length === quantity ? 'text-green-600' : 'text-amber-600'
                )} />
                <span className={cn(
                  'text-sm',
                  serialNumbers.length === quantity
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-amber-700 dark:text-amber-300'
                )}>
                  {t('form.serialRequired')}
                </span>
              </div>
              <Badge variant={serialNumbers.length === quantity ? 'default' : 'secondary'} className="text-xs">
                {serialNumbers.length} / {quantity}
              </Badge>
            </button>
          </>
        )}

        <Separator />

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onSave} disabled={!canSave} className="h-9">
            <Save className="h-4 w-4 mr-1" />
            {isSubmitting ? tCommon('saving') : t('form.confirmReceive')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowContinueConfirm(true)}
            disabled={!currentAsn || isSubmitting}
            className="h-9"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            {t('continueReceiving')}
          </Button>
        </div>

        {/* 继续收货确认对话框 */}
        <AlertDialog open={showContinueConfirm} onOpenChange={setShowContinueConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('continueReceiving')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('messages.continueConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onContinue()
                  setShowContinueConfirm(false)
                  setTimeout(() => skuInputRef.current?.focus(), 50)
                }}
              >
                {tCommon('confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
