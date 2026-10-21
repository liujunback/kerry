'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, ChevronDown, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePackingStore } from '@/stores/packing-store'
import type { OrderModuleState } from './modules'

interface OrderPackingScanPanelProps {
  onOrderLoaded: (orderNumber: string) => Promise<void>
  onSkuScanned: (barcode: string) => Promise<void>
  onCloseBox: () => Promise<void>
  moduleState: OrderModuleState | null
  isSubmitting: boolean
  initialOrderNumber?: string
  cellCode?: string | null
  onOperationNotice?: (notice: {
    type: 'error' | 'warning' | 'success' | 'info'
    title: string
    message?: string
  } | null) => void
}

export function OrderPackingScanPanel({
  onOrderLoaded,
  onSkuScanned,
  onCloseBox,
  moduleState,
  isSubmitting,
  initialOrderNumber,
  cellCode,
  onOperationNotice,
}: OrderPackingScanPanelProps) {
  const t = useTranslations('packing')

  const {
    currentPickOrder,
    packagingMaterials,
    materialOptions,
    isLoading,
    shouldFocusSku,
    shouldFocusMaterial,
    shouldFocusTaskNumber,
    setIsLoading,
    clearFocusSku,
    clearFocusMaterial,
    clearFocusTaskNumber,
    addPackagingMaterial,
    removePackagingMaterial,
    updatePackagingMaterialQty,
    loadMaterialOptions,
  } = usePackingStore()

  const [orderInput, setOrderInput] = useState(initialOrderNumber || '')
  const [skuInput, setSkuInput] = useState('')
  const [materialInput, setMaterialInput] = useState('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')

  const orderInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)
  const materialInputRef = useRef<HTMLInputElement>(null)

  // 当 moduleState 变化时，同步订单号到输入框
  useEffect(() => {
    if (moduleState?.orderNumber && !moduleState.isComplete) {
      setOrderInput(moduleState.orderNumber)
    }
  }, [moduleState?.orderNumber, moduleState?.isComplete])

  // 监听聚焦
  useEffect(() => {
    if (shouldFocusSku) {
      setTimeout(() => skuInputRef.current?.focus(), 100)
      clearFocusSku()
    }
  }, [shouldFocusSku, clearFocusSku])

  useEffect(() => {
    if (shouldFocusMaterial) {
      setTimeout(() => materialInputRef.current?.focus(), 100)
      clearFocusMaterial()
    }
  }, [shouldFocusMaterial, clearFocusMaterial])

  useEffect(() => {
    if (shouldFocusTaskNumber) {
      setOrderInput('')
      setTimeout(() => orderInputRef.current?.focus(), 100)
      clearFocusTaskNumber()
    }
  }, [shouldFocusTaskNumber, clearFocusTaskNumber])

  // 加载包材列表 - 只在有订单时加载（使用 store 统一管理）
  useEffect(() => {
    if (currentPickOrder) {
      loadMaterialOptions()
    }
  }, [currentPickOrder, loadMaterialOptions])

  // 模块状态
  const isComplete = moduleState?.isComplete
  const hasPendingClose = moduleState?.pendingCloseOrder
  // 已加载订单且未完成时锁定单号输入框
  const isOrderLocked = currentPickOrder && !isComplete

  // 扫描订单号
  const handleOrderSubmit = useCallback(async () => {
    if (!orderInput.trim()) return
    setIsLoading(true)
    try {
      await onOrderLoaded(orderInput.trim())
      // 成功后不清除，保持显示当前订单号
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('errors.loadOrderFailed')
      toast.error(errorMessage)
      onOperationNotice?.({
        type: 'error',
        title: t('notices.orderLoadFailed.title'),
        message: errorMessage,
      })
      setOrderInput('')
      setTimeout(() => orderInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }, [t, orderInput, onOrderLoaded, setIsLoading, onOperationNotice])

  // 关箱条码（支持多种格式）
  const CLOSE_BOX_CODES = ['CLOSEBOX', 'GB', '关箱', 'CLOSE']

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
      onOperationNotice?.({
        type: 'error',
        title: t('notices.scanFailed.title'),
        message: errorMessage,
      })
      setTimeout(() => skuInputRef.current?.select(), 50)
    } finally {
      setIsLoading(false)
    }
  }, [t, skuInput, currentPickOrder, onSkuScanned, setIsLoading, onOperationNotice])

  // 添加包材（支持关箱条码）
  const handleMaterialScan = async () => {
    if (!materialInput.trim()) return
    const code = materialInput.trim()
    const upperCode = code.toUpperCase()

    // 检查是否是关箱条码
    if (CLOSE_BOX_CODES.includes(upperCode) || CLOSE_BOX_CODES.includes(code)) {
      if (hasPendingClose) {
        setMaterialInput('')
        await onCloseBox()
        // 关箱成功后清除订单号输入框并聚焦
        setOrderInput('')
        setTimeout(() => orderInputRef.current?.focus(), 100)
        return
      } else {
        toast.error(t('errors.noPendingCloseOrder'))
        onOperationNotice?.({
          type: 'warning',
          title: t('notices.noPendingClose.title'),
          message: t('notices.noPendingClose.message'),
        })
        setMaterialInput('')
        setTimeout(() => materialInputRef.current?.focus(), 50)
        return
      }
    }

    const material = materialOptions.find(m => m.materialCode === code)
    if (!material) {
      toast.error(t('errors.materialNotFound'))
      onOperationNotice?.({
        type: 'error',
        title: t('notices.materialNotFound.title'),
        message: t('notices.materialNotFound.message', { code }),
      })
      return
    }
    if (!packagingMaterials.some(m => m.materialId === material.id)) {
      addPackagingMaterial({
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        quantity: 1,
      })
    }
    setMaterialInput('')
    // 保持聚焦在耗材输入框
    setTimeout(() => materialInputRef.current?.focus(), 50)
  }

  // 关箱
  const handleCloseBox = async () => {
    await onCloseBox()
    // 关箱成功后清除订单号输入框并聚焦
    setOrderInput('')
    setTimeout(() => orderInputRef.current?.focus(), 100)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 单号输入 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{t('labels.code')}</Label>
            {cellCode && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                {t('labels.cellCode', { cellCode })}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              ref={orderInputRef}
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isOrderLocked && handleOrderSubmit()}
              placeholder={t('orderPlaceholder')}
              disabled={isLoading || !!isOrderLocked}
              autoFocus={!currentPickOrder}
            />
          </div>
        </div>

        {/* SKU输入 */}
        {currentPickOrder && !isComplete && (
          <div className="space-y-2">
            <Label>SKU</Label>
            <div className="flex gap-2">
              <Input
                ref={skuInputRef}
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSkuSubmit()}
                placeholder={t('skuPlaceholder')}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* 耗材输入 */}
        {currentPickOrder && !isComplete && (
          <div className="space-y-2">
            <Label>{t('material')} {hasPendingClose && <span className="text-xs text-orange-600">{t('scanToClose')}</span>}</Label>
            <div className="flex gap-2">
              <Input
                ref={materialInputRef}
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMaterialScan()}
                placeholder={hasPendingClose ? t('materialPlaceholderClose') : t('materialPlaceholder')}
                className="flex-1"
              />
              <Select value={selectedMaterialId} onValueChange={(value) => {
                const material = materialOptions.find(m => m.id === value)
                if (material && !packagingMaterials.some(m => m.materialId === value)) {
                  addPackagingMaterial({
                    materialId: material.id,
                    materialCode: material.materialCode,
                    materialName: material.materialName,
                    quantity: 1,
                  })
                }
                setSelectedMaterialId('')
                // 保持聚焦在耗材输入框
                setTimeout(() => materialInputRef.current?.focus(), 50)
              }}>
                <SelectTrigger className="w-10 px-2">
                  <ChevronDown className="h-4 w-4" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground">{t('selectMaterial')}</SelectLabel>
                    {materialOptions.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.materialCode} - {material.materialName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 已选包材列表 */}
        {packagingMaterials.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('materialTable')}</TableHead>
                  <TableHead className="w-20">{t('quantity')}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packagingMaterials.map((material) => (
                  <TableRow key={material.materialId}>
                    <TableCell className="text-xs">{material.materialCode}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={material.quantity}
                        onChange={(e) => updatePackagingMaterialQty(material.materialId, parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removePackagingMaterial(material.materialId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 关箱按钮 */}
        {currentPickOrder && !isComplete && hasPendingClose && (
          <div className="space-y-2">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('messages.orderPacked', { orderNumber: moduleState?.pendingCloseOrder?.orderNumber || '' })}
              </div>
              <div className="mt-1 text-xs text-orange-600">
                {t('messages.closeBoxInstruction')}
              </div>
            </div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleCloseBox}
              disabled={isSubmitting || packagingMaterials.length === 0}
              size="lg"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('closeBox')}
            </Button>
          </div>
        )}

        {/* 无待关箱订单时的关箱按钮（禁用状态） */}
        {currentPickOrder && !isComplete && !hasPendingClose && (
          <Button
            className="w-full"
            onClick={handleCloseBox}
            disabled={true}
          >
            {t('closeBox')}
          </Button>
        )}

        {/* 完成状态 - 显示完成信息和继续按钮 */}
        {isComplete && moduleState && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('status.closeBoxCompleted')}
            </div>
            <div className="mt-2 text-sm text-green-600">
              {t('messages.orderPackingCompleted', { orderNumber: moduleState.orderNumber })}
            </div>
            <Button
              className="w-full mt-3"
              onClick={() => {
                setOrderInput('')
                setTimeout(() => orderInputRef.current?.focus(), 50)
              }}
            >
              {t('continueNext')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
