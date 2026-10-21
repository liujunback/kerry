'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  Save,
  RotateCcw,
  ScanLine,
  Package,
  MapPin,
} from 'lucide-react'
import { useShelvingStore } from '@/stores/shelving-store'
import { toast } from 'sonner'

interface ShelvingScanPanelProps {
  onContainerLoaded: (containerCode: string, warehouseId: string) => Promise<void>
  onLocationLoaded: (locationCode: string, warehouseId: string) => Promise<void>
  onSkuScanned: (barcode: string) => void
  onSave: () => Promise<void>
  onContinue: () => void
}

export function ShelvingScanPanel({
  onContainerLoaded,
  onLocationLoaded,
  onSkuScanned,
  onSave,
  onContinue,
}: ShelvingScanPanelProps) {
  const t = useTranslations('shelving')
  const tCommon = useTranslations('common')

  const {
    currentContainer,
    currentLocation,
    currentSku,
    quantity,
    maxQuantity,
    isLoading,
    isSubmitting,
    clearContainer,
    clearLocation,
    clearCurrentSku,
    setIsLoading,
    setQuantity,
    incrementQuantity,
  } = useShelvingStore()

  const [containerInput, setContainerInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [skuInput, setSkuInput] = useState('')


  const containerInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)

  // 自动聚焦：容器 → SKU → 货位
  useEffect(() => {
    if (!currentContainer && containerInputRef.current) {
      containerInputRef.current.focus()
    } else if (currentContainer && !currentSku && skuInputRef.current) {
      skuInputRef.current.focus()
    } else if (currentContainer && currentSku && !currentLocation && locationInputRef.current) {
      locationInputRef.current.focus()
    }
  }, [currentContainer, currentSku, currentLocation])

  // 容器提交
  const handleContainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = containerInput.trim()
    if (!trimmed) return

    setIsLoading(true)
    try {
      await onContainerLoaded(trimmed, currentContainer?.warehouseId || '')
      setContainerInput('')
      toast.success(t('messages.containerLoaded'))
      setTimeout(() => skuInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('messages.containerNotFound')
      toast.error(msg)
      setContainerInput('')
      setTimeout(() => containerInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }

  // 清除容器
  const handleClearContainer = () => {
    clearContainer()
    setContainerInput('')
    setLocationInput('')
    setSkuInput('')
    setTimeout(() => containerInputRef.current?.focus(), 100)
  }

  // 货位提交
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = locationInput.trim()
    if (!trimmed || !currentContainer || !currentSku) return

    setIsLoading(true)
    try {
      await onLocationLoaded(trimmed, currentContainer.warehouseId)
      setLocationInput('')
      toast.success(t('messages.locationLoaded'))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('messages.locationNotFound')
      toast.error(msg)
      setLocationInput('')
      setTimeout(() => locationInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }

  // 清除货位
  const handleClearLocation = () => {
    clearLocation()
    setLocationInput('')
    setTimeout(() => locationInputRef.current?.focus(), 100)
  }

  // SKU提交
  const handleSkuSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = skuInput.trim()
    if (!trimmed || !currentContainer) return

    setIsLoading(true)
    try {
      onSkuScanned(trimmed)
      setSkuInput('')
      setTimeout(() => locationInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('messages.skuNotInContainer')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [
    skuInput,
    currentContainer,
    t,
    setIsLoading,
    onSkuScanned,
  ])

  // 数量输入
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setQuantity(value)
    }
  }

  // 是否可以保存
  const canSave = currentContainer && currentLocation && currentSku && quantity > 0

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* 容器扫描 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('container.label')}
          </Label>
          {currentContainer ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex-1 justify-center py-2">
                {currentContainer.containerCode}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearContainer}
                disabled={isLoading || isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleContainerSubmit}>
              <Input
                ref={containerInputRef}
                value={containerInput}
                onChange={(e) => setContainerInput(e.target.value)}
                placeholder={t('container.placeholder')}
                disabled={isLoading}
              />
            </form>
          )}
        </div>

        {/* SKU扫描 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            {t('sku.label')}
          </Label>
          {currentSku ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex-1 justify-center py-2">
                  {currentSku.skuCode}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearCurrentSku}
                  disabled={isLoading || isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {currentSku.skuName && (
                <p className="text-sm text-muted-foreground truncate">
                  {currentSku.skuName}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSkuSubmit}>
              <Input
                ref={skuInputRef}
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder={t('sku.placeholder')}
                disabled={isLoading || !currentContainer}
              />
            </form>
          )}
        </div>

        {/* 货位扫描 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('location.label')}
          </Label>
          {currentLocation ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex-1 justify-center py-2">
                {currentLocation.locationCode}
                {currentLocation.zoneName && (
                  <span className="ml-2 text-muted-foreground">
                    ({currentLocation.zoneName})
                  </span>
                )}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearLocation}
                disabled={isLoading || isSubmitting || !currentSku}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLocationSubmit}>
              <Input
                ref={locationInputRef}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder={t('location.placeholder')}
                disabled={isLoading || !currentContainer || !currentSku}
              />
            </form>
          )}
        </div>

        {/* 数量输入 - 扫描完货位后显示 */}
        {currentSku && currentLocation && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>{t('quantity.label')}</span>
                <span className="text-sm text-muted-foreground">
                  {t('quantity.max')}: {maxQuantity}
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => incrementQuantity(-1)}
                  disabled={quantity <= 1 || isSubmitting}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={handleQtyChange}
                  className="text-center"
                  min={1}
                  max={maxQuantity}
                  disabled={isSubmitting}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => incrementQuantity(1)}
                  disabled={quantity >= maxQuantity || isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onContinue}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {tCommon('reset')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => onSave()}
                disabled={!canSave || isSubmitting}
              >
                <Save className="h-4 w-4 mr-1" />
                {t('actions.shelve')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
