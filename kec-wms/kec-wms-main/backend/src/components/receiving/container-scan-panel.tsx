'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  X,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  ScanLine,
  Keyboard,
  Boxes,
  PackageCheck,
  PackageX,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react'
import { useReceivingStore } from '@/stores/receiving-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date-formatter'

type ReceivingMode = 'scan' | 'manual'

interface ContainerScanPanelProps {
  onAsnLoaded: (asnNumber: string) => Promise<void>
  onSkuScanned: (barcode: string) => Promise<void>
  onSave: () => Promise<void>
  onContainerScanned: (containerCode: string) => Promise<void>
  onCloseContainer: () => Promise<boolean> // 返回 true 表示 ASN 已完成并被清空
  onRepackContainer: () => Promise<void>
  onOpenSerialDialog?: () => void
  initialAsnNumber?: string | null
}

export function ContainerScanPanel({
  onAsnLoaded,
  onSkuScanned,
  onSave,
  onContainerScanned,
  onCloseContainer,
  onRepackContainer,
  onOpenSerialDialog,
  initialAsnNumber,
}: ContainerScanPanelProps) {
  const t = useTranslations('receiving')

  const {
    currentAsn,
    currentItem,
    quantity,
    qualityStatus,
    batchNumber,
    expiryDate,
    serialNumbers,
    isLoading,
    isSubmitting,
    currentContainer,
    containerItems,
    containerItemsSummary,
    clearAsn,
    setIsLoading,
    setQuantity,
    incrementQuantity,
    setQualityStatus,
    setBatchNumber,
    setExpiryDate,
  } = useReceivingStore()

  const [asnInput, setAsnInput] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [containerInput, setContainerInput] = useState('')
  const [receivingMode, setReceivingMode] = useState<ReceivingMode>('manual')
  const [showContainerItems, setShowContainerItems] = useState(true)

  const asnInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)
  const containerInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const initialLoadedRef = useRef(false)

  // 自动聚焦
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已更新
    const timer = setTimeout(() => {
      if (!currentAsn && asnInputRef.current) {
        asnInputRef.current.focus()
      } else if (currentAsn && !currentContainer && containerInputRef.current) {
        containerInputRef.current.focus()
      } else if (currentAsn && currentContainer && skuInputRef.current) {
        skuInputRef.current.focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [currentAsn, currentItem, currentContainer])

  // 从URL参数自动加载ASN
  useEffect(() => {
    if (initialAsnNumber && !currentAsn && !initialLoadedRef.current) {
      initialLoadedRef.current = true
      setIsLoading(true)
      onAsnLoaded(initialAsnNumber)
        .then(() => {
          toast.success(t('asn.loadSuccess'))
          setTimeout(() => containerInputRef.current?.focus(), 50)
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
      setTimeout(() => containerInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('asn.loadFailed')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // 清除 ASN
  const handleClearAsn = () => {
    clearAsn()
    setAsnInput('')
    setContainerInput('')
    setTimeout(() => asnInputRef.current?.focus(), 100)
  }

  // 容器扫描提交
  const handleContainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = containerInput.trim()
    if (!trimmed || !currentAsn) return

    setIsLoading(true)
    try {
      await onContainerScanned(trimmed)
      setContainerInput('')
      toast.success(t('container.scanSuccess'))
      setTimeout(() => skuInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('container.notFound')
      toast.error(msg)
      setContainerInput('')
      setTimeout(() => containerInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }

  // 关箱处理（先保存当前收货，再关箱）
  const handleCloseContainerClick = async () => {
    if (!currentContainer) return

    // 如果有当前收货项且数量大于0，先保存
    if (currentItem && quantity > 0) {
      try {
        await onSave()
      } catch {
        // 保存失败，不继续关箱
        return
      }
    }

    const asnCleared = await onCloseContainer()
    setContainerInput('')
    if (asnCleared) {
      // ASN 收货完成，清空 ASN 输入并聚焦
      setAsnInput('')
      setTimeout(() => asnInputRef.current?.focus(), 50)
    } else {
      // ASN 未完成，聚焦到容器输入框
      setTimeout(() => containerInputRef.current?.focus(), 50)
    }
  }

  // SKU 提交
  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = skuInput.trim()
    if (!trimmed || !currentAsn) return

    // 检查是否已扫描容器
    if (!currentContainer) {
      toast.warning(t('container.scanFirst'))
      containerInputRef.current?.focus()
      return
    }

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

        {/* 容器扫描区 */}
        <Separator />
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            {t('container.scan')}
          </Label>
          {currentContainer ? (
                <div className="space-y-2">
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-green-600" />
                      <span className="font-mono font-medium">{currentContainer.containerCode}</span>
                      <Badge variant="secondary" className="text-xs">
                        {currentContainer.containerType}
                      </Badge>
                    </div>
                  </div>

                  {/* 装箱明细 - 按SKU分组 */}
                  {containerItemsSummary && containerItemsSummary.itemCount > 0 && (
                    <div className="border rounded">
                      <button
                        type="button"
                        onClick={() => setShowContainerItems(!showContainerItems)}
                        className="w-full flex items-center justify-between p-2 text-xs hover:bg-accent"
                      >
                        <span className="text-muted-foreground">
                          {t('container.items')} ({containerItemsSummary.skuCount} SKU, {containerItemsSummary.totalQuantity} {t('container.pcs')})
                        </span>
                        {showContainerItems ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      {showContainerItems && (
                        <div className="border-t max-h-40 overflow-y-auto">
                          {(() => {
                            const groupedBySku = containerItems.reduce((acc, item) => {
                              if (!acc[item.skuCode]) {
                                acc[item.skuCode] = {
                                  skuCode: item.skuCode,
                                  skuName: item.skuName,
                                  totalQty: 0,
                                  items: [],
                                }
                              }
                              acc[item.skuCode].totalQty += item.quantity
                              const attrKey = `${item.batchNumber || ''}_${item.expiryDate || ''}_${item.qualityType}`
                              const existingAttr = acc[item.skuCode].items.find(
                                (i) => `${i.batchNumber || ''}_${i.expiryDate || ''}_${i.qualityType}` === attrKey
                              )
                              if (existingAttr) {
                                existingAttr.quantity += item.quantity
                              } else {
                                acc[item.skuCode].items.push({ ...item })
                              }
                              return acc
                            }, {} as Record<string, { skuCode: string; skuName: string | null; totalQty: number; items: typeof containerItems }>)

                            return Object.values(groupedBySku).map((group) => (
                              <div key={group.skuCode} className="border-b last:border-b-0">
                                <div className="flex items-center justify-between px-2 py-1.5 text-xs bg-muted/30">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-mono font-medium truncate">{group.skuCode}</div>
                                    {group.skuName && (
                                      <div className="text-muted-foreground truncate text-[10px]">{group.skuName}</div>
                                    )}
                                  </div>
                                  <span className="font-bold text-primary ml-2">{group.totalQty}</span>
                                </div>
                                {group.items.length > 1 && group.items.map((item, idx) => (
                                  <div
                                    key={`${item.skuCode}-${item.batchNumber}-${item.qualityType}-${idx}`}
                                    className="flex items-center justify-between px-2 py-1 text-[10px] pl-4 text-muted-foreground hover:bg-accent/30"
                                  >
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-muted-foreground/60">└</span>
                                      {item.batchNumber && (
                                        <span className="font-mono">{item.batchNumber}</span>
                                      )}
                                      {item.expiryDate && (
                                        <span className="text-orange-600">{formatDate(item.expiryDate) || '-'}</span>
                                      )}
                                      <Badge
                                        variant={item.qualityType === 'GOOD' ? 'outline' : 'destructive'}
                                        className="text-[9px] px-1 py-0 h-4"
                                      >
                                        {item.qualityType === 'GOOD' ? t('quality.good') : t('quality.damaged')}
                                      </Badge>
                                    </div>
                                    <span className="font-medium">{item.quantity}</span>
                                  </div>
                                ))}
                                {group.items.length === 1 && (
                                  <div className="flex items-center gap-1 px-2 pb-1 text-[10px] flex-wrap">
                                    {group.items[0].batchNumber && (
                                      <span className="font-mono text-muted-foreground">{group.items[0].batchNumber}</span>
                                    )}
                                    {group.items[0].expiryDate && (
                                      <span className="text-orange-600">{formatDate(group.items[0].expiryDate) || '-'}</span>
                                    )}
                                    <Badge
                                      variant={group.items[0].qualityType === 'GOOD' ? 'outline' : 'destructive'}
                                      className="text-[9px] px-1 py-0 h-4"
                                    >
                                      {group.items[0].qualityType === 'GOOD' ? t('quality.good') : t('quality.damaged')}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleContainerSubmit}>
                  <Input
                    ref={containerInputRef}
                    value={containerInput}
                    onChange={(e) => setContainerInput(e.target.value)}
                    placeholder={t('container.scanPlaceholder')}
                    disabled={!currentAsn || isLoading}
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
              disabled={!currentAsn || !currentContainer || isLoading}
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
                  <Input
                    value={batchNumber || ''}
                    onChange={(e) => setBatchNumber(e.target.value || null)}
                    placeholder={t('form.batchNumber')}
                    className="h-8 text-sm"
                    disabled
                    readOnly
                  />
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
        {currentContainer && (
          <div className="grid grid-cols-2 gap-2">
            {containerItemsSummary && containerItemsSummary.itemCount > 0 && (
              <Button
                variant="outline"
                onClick={onRepackContainer}
                disabled={isSubmitting}
                className="h-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
              >
                <PackageX className="h-4 w-4 mr-1" />
                {t('container.repack')}
              </Button>
            )}
            <Button
              onClick={handleCloseContainerClick}
              disabled={isSubmitting}
              className={cn("h-9", containerItemsSummary && containerItemsSummary.itemCount > 0 ? "" : "col-span-2")}
            >
              <PackageCheck className="h-4 w-4 mr-1" />
              {t('container.closeAndSave')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
