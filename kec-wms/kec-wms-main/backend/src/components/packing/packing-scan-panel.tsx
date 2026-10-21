'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, ScanLine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { usePackingStore } from '@/stores/packing-store'
import {
  type ScanType,
  type PickOrderModuleState,
  type OrderModuleState,
  orderModule,
} from '@/components/packing/modules'

interface PackingScanPanelProps {
  onPickOrderLoaded: (taskNumber: string) => Promise<void>
  onSkuScanned: (barcode: string) => Promise<void>
  scanType: ScanType | null
  moduleState: PickOrderModuleState | OrderModuleState | null
  materialPanel?: React.ReactNode
}

export function PackingScanPanel({
  onPickOrderLoaded,
  onSkuScanned,
  scanType,
  moduleState,
  materialPanel,
}: PackingScanPanelProps) {
  const t = useTranslations('packing')
  const {
    currentPickOrder,
    orderSummary,
    isLoading,
    shouldFocusSku,
    setIsLoading,
    clearFocusSku,
  } = usePackingStore()

  const [taskNumberInput, setTaskNumberInput] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const taskNumberInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)

  // 监听聚焦SKU输入框的触发
  useEffect(() => {
    if (shouldFocusSku) {
      setTimeout(() => skuInputRef.current?.focus(), 100)
      clearFocusSku()
    }
  }, [shouldFocusSku, clearFocusSku])

  // 扫描拣货单/订单
  const handleTaskNumberSubmit = useCallback(async () => {
    if (!taskNumberInput.trim()) return

    setIsLoading(true)
    try {
      await onPickOrderLoaded(taskNumberInput.trim())
      setTaskNumberInput('')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('errors.loadFailed')
      toast.error(errorMessage)
      setTaskNumberInput('')
      setTimeout(() => taskNumberInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }, [t, taskNumberInput, onPickOrderLoaded, setIsLoading])

  // 扫描 SKU
  const handleSkuSubmit = useCallback(async () => {
    if (!skuInput.trim() || !currentPickOrder) return

    setIsLoading(true)
    try {
      await onSkuScanned(skuInput.trim())
      setSkuInput('')
      setTimeout(() => skuInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('errors.scanSkuFailed')
      toast.error(errorMessage)
      setTimeout(() => skuInputRef.current?.select(), 50)
    } finally {
      setIsLoading(false)
    }
  }, [t, skuInput, currentPickOrder, onSkuScanned, setIsLoading])

  // 获取业务模式显示文本
  const getBusinessModeText = (mode: string) => {
    switch (mode) {
      case 'STANDARD':
        return t('businessMode.STANDARD')
      case 'RETURN_WAREHOUSE':
        return t('businessMode.RETURN_WAREHOUSE')
      case 'SCRAP':
        return t('businessMode.SCRAP')
      default:
        return mode
    }
  }

  // 获取订单类型显示文本
  const getOrderTypeText = (type: string) => {
    switch (type) {
      case 'SINGLE_SKU_SINGLE':
        return t('orderTypes.SINGLE_SKU_SINGLE')
      case 'MULTI_SKU_SINGLE':
        return t('orderTypes.MULTI_SKU_SINGLE')
      case 'SINGLE_SKU_MULTI':
        return t('orderTypes.SINGLE_SKU_MULTI')
      case 'MULTI_SKU_MULTI':
        return t('orderTypes.MULTI_SKU_MULTI')
      default:
        return type
    }
  }

  // 判断订单模式是否完成
  const isOrderComplete = scanType === 'ORDER' && moduleState && (moduleState as OrderModuleState).isComplete

  // 渲染初始扫描区（未加载任何数据时）
  const renderInitialScan = () => (
    <div className="space-y-2">
      <Label>{t('scanPickOrder')}</Label>
      <div className="flex gap-2">
        <Input
          ref={taskNumberInputRef}
          value={taskNumberInput}
          onChange={(e) => setTaskNumberInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTaskNumberSubmit()}
          placeholder={t('scanPlaceholder')}
          disabled={isLoading}
          autoFocus
        />
        <Button
          onClick={handleTaskNumberSubmit}
          disabled={isLoading || !taskNumberInput.trim()}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
        </Button>
      </div>
    </div>
  )

  // 渲染订单完成状态（订单模式关箱后）
  const renderOrderComplete = () => {
    const state = moduleState as OrderModuleState
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('status.closeBoxCompleted')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('labels.orderNumber')}：</span>
              <span className="font-medium">{state.orderNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('labels.packed')}：</span>
              <span className="font-medium text-green-600">{state.totalPacked}/{state.totalExpected}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">{t('messages.scanNextOrder')}</p>
        <div className="flex gap-2">
          <Input
            ref={taskNumberInputRef}
            value={taskNumberInput}
            onChange={(e) => setTaskNumberInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTaskNumberSubmit()}
            placeholder={t('scanPlaceholder')}
            disabled={isLoading}
            autoFocus
          />
          <Button
            onClick={handleTaskNumberSubmit}
            disabled={isLoading || !taskNumberInput.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
          </Button>
        </div>
      </div>
    )
  }

  // 渲染订单模式信息
  const renderOrderInfo = () => {
    if (scanType !== 'ORDER' || !moduleState) return null
    return orderModule.renderScanInfo?.({ moduleState: moduleState as OrderModuleState })
  }

  // 渲染拣货单模式汇总信息
  const renderPickOrderSummary = () => {
    if (scanType !== 'PICK_ORDER' || !orderSummary) return null
    return (
      <div className="space-y-2 p-3 bg-muted rounded-lg">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">{t('labels.orderType')}：</span>
            <span className="font-medium">{getOrderTypeText(orderSummary.orderType)}</span>
          </div>
          {orderSummary.channel && (
            <div>
              <span className="text-muted-foreground">{t('labels.channel')}：</span>
              <span className="font-medium">{orderSummary.channel}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">{t('table.skuCode')}：</span>
            <span className="font-medium">{orderSummary.skuCode}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('header.totalQty')}：</span>
            <span className="font-medium">{orderSummary.totalQty}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('labels.unpacked')}：</span>
            <span className="font-medium text-orange-600">{orderSummary.unpackedQty}</span>
          </div>
        </div>
      </div>
    )
  }

  // 渲染 SKU 扫描区
  const renderSkuScan = () => {
    if (!currentPickOrder || currentPickOrder.orderBusinessType !== 'STANDARD') return null
    // 订单模式完成后不显示SKU扫描区
    if (scanType === 'ORDER' && moduleState && (moduleState as OrderModuleState).isComplete) return null
    // 订单模式有待关箱订单时也不显示SKU扫描区
    if (scanType === 'ORDER' && moduleState && (moduleState as OrderModuleState).pendingCloseOrder) return null
    return (
      <div className="space-y-2">
        <Label>{t('scanSku')}</Label>
        <div className="flex gap-2">
          <Input
            ref={skuInputRef}
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSkuSubmit()}
            placeholder={t('skuPlaceholder')}
            disabled={isLoading}
          />
          <Button
            onClick={handleSkuSubmit}
            disabled={isLoading || !skuInput.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanLine className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 初始扫描区 - 未加载数据且非订单完成状态 */}
        {!currentPickOrder && !isOrderComplete && renderInitialScan()}

        {/* 订单完成状态 */}
        {!currentPickOrder && isOrderComplete && renderOrderComplete()}

        {/* 已加载数据 */}
        {currentPickOrder && (
          <>
            {/* 业务模式 */}
            <div className="space-y-2">
              <Label>{t('businessMode.title')}</Label>
              <Badge variant="outline" className="text-sm">
                {getBusinessModeText(currentPickOrder.orderBusinessType)}
              </Badge>
            </div>

            {/* 订单模式信息 */}
            {renderOrderInfo()}

            {/* 拣货单模式汇总信息 */}
            {renderPickOrderSummary()}

            {/* SKU 扫描区 */}
            {renderSkuScan()}

            {/* 订单完成后显示单号输入框 */}
            {isOrderComplete && (
              <div className="space-y-2 pt-2 border-t">
                <Label>{t('scanNextOrder')}</Label>
                <div className="flex gap-2">
                  <Input
                    ref={taskNumberInputRef}
                    value={taskNumberInput}
                    onChange={(e) => setTaskNumberInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTaskNumberSubmit()}
                    placeholder={t('scanPlaceholder')}
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button
                    onClick={handleTaskNumberSubmit}
                    disabled={isLoading || !taskNumberInput.trim()}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirm')}
                  </Button>
                </div>
              </div>
            )}

            {/* 包材与称重 */}
            {materialPanel}
          </>
        )}
      </CardContent>
    </Card>
  )
}
