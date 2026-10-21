'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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
import { isSingleMultiHotPickOrderTaskType } from '@/lib/packing/task-type'
import { usePackingStore } from '@/stores/packing-store'
import type { PickOrderModuleState } from './modules'
import { getPickOrderPackingStrategy } from './modules/pick-order-strategies'

interface PickOrderPackingScanPanelProps {
  onPickOrderLoaded: (taskNumber: string) => Promise<void>
  onSkuScanned: (barcode: string) => Promise<void>
  onCloseBox: (payload?: { weight?: number }) => Promise<void>
  onNextTarget: () => void
  moduleState: PickOrderModuleState | null
  isSubmitting: boolean
  onOperationNotice?: (notice: {
    type: 'error' | 'warning' | 'success' | 'info'
    title: string
    message?: string
  } | null) => void
}

export function PickOrderPackingScanPanel({
  onPickOrderLoaded,
  onSkuScanned,
  onCloseBox,
  onNextTarget,
  moduleState,
  isSubmitting,
  onOperationNotice,
}: PickOrderPackingScanPanelProps) {
  const t = useTranslations('packing')
  const tCommon = useTranslations('common')

  const {
    currentPickOrder,
    pickOrderLines,
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

  const [taskNumberInput, setTaskNumberInput] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [materialInput, setMaterialInput] = useState('')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [weightInput, setWeightInput] = useState('')

  const taskNumberInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)
  const materialInputRef = useRef<HTMLInputElement>(null)

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
      setTaskNumberInput('')
      setWeightInput('')
      setTimeout(() => taskNumberInputRef.current?.focus(), 100)
      clearFocusTaskNumber()
    }
  }, [shouldFocusTaskNumber, clearFocusTaskNumber])

  useEffect(() => {
    if (currentPickOrder) {
      loadMaterialOptions()
    }
  }, [currentPickOrder, loadMaterialOptions])

  const handleTaskNumberSubmit = useCallback(async () => {
    if (!taskNumberInput.trim()) return
    setIsLoading(true)
    try {
      await onPickOrderLoaded(taskNumberInput.trim())
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('errors.loadFailed')
      toast.error(errorMessage)
      onOperationNotice?.({
        type: 'error',
        title: t('notices.codeLoadFailed.title'),
        message: errorMessage,
      })
      setTaskNumberInput('')
      setTimeout(() => taskNumberInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }, [t, taskNumberInput, onPickOrderLoaded, setIsLoading, onOperationNotice])

  const taskType = currentPickOrder?.taskType || ''
  const strategy = getPickOrderPackingStrategy(taskType)
  const flowDescription = strategy.getFlowDescription(t)
  const instruction = strategy.getInstruction(t)
  const isSingleMultiHotTask = isSingleMultiHotPickOrderTaskType(taskType)
  const taskTypeLabel = taskType && [
    'SINGLE_ONE_HOT',
    'SINGLE_ONE_NORMAL',
    'SINGLE_MULTI_HOT',
    'SINGLE_MULTI_NORMAL',
    'MULTI_FIXED_COMBO',
    'MULTI_NON_FIXED',
  ].includes(taskType)
    ? t(`taskTypes.${taskType}`)
    : taskType
  const pendingCloseOrder = moduleState?.pendingCloseOrder
  const pendingCompletePickOrder = moduleState?.pendingCompletePickOrder || false
  const isPickOrderCompleted = !!currentPickOrder
    && !pendingCloseOrder
    && !pendingCompletePickOrder
    && (
      currentPickOrder.status === 'COMPLETED'
      || (pickOrderLines.length > 0 && pickOrderLines.every((line) => line.packedQty >= line.expectedQty))
    )
  const showsReviewSummary = strategy.showsFixedComboSummary || strategy.showsReviewSummary
  const reviewOrder = moduleState?.completedReviewOrder || moduleState?.reviewingOrder
  const fixedComboReviewProgress = useMemo(() => {
    if (!showsReviewSummary || !reviewOrder) {
      return {
        totalExpected: 0,
        totalPacked: 0,
        percent: 0,
        items: [] as Array<{ skuCode: string; expectedQty: number; packedQty: number }>,
      }
    }

    const skuMap = new Map<string, { skuCode: string; expectedQty: number; packedQty: number }>()
    for (const line of pickOrderLines) {
      if (line.orderId !== reviewOrder.orderId) continue

      const existing = skuMap.get(line.skuId)
      if (existing) {
        existing.expectedQty += line.expectedQty
        existing.packedQty += line.packedQty
      } else {
        skuMap.set(line.skuId, {
          skuCode: line.skuCode,
          expectedQty: line.expectedQty,
          packedQty: line.packedQty,
        })
      }
    }

    const items = Array.from(skuMap.values())
    const totalExpected = items.reduce((sum, item) => sum + item.expectedQty, 0)
    const totalPacked = items.reduce((sum, item) => sum + Math.min(item.packedQty, item.expectedQty), 0)
    return {
      totalExpected,
      totalPacked,
      percent: totalExpected > 0 ? Math.round((totalPacked / totalExpected) * 100) : 0,
      items,
    }
  }, [reviewOrder, pickOrderLines, showsReviewSummary])
  const fixedComboCheck = useMemo(() => {
    if (!strategy.showsFixedComboSummary || pickOrderLines.length === 0) {
      return {
        isConsistent: true,
        groupCount: 0,
        orderCount: 0,
        groups: [] as Array<{ comboText: string; orderNumbers: string[]; items: Array<{ skuCode: string; qty: number }> }>,
      }
    }

    const orderMap = new Map<string, { orderNumber: string; skuQtyMap: Map<string, { skuCode: string; qty: number }> }>()
    for (const line of pickOrderLines) {
      const order = orderMap.get(line.orderId) || {
        orderNumber: line.orderNumber,
        skuQtyMap: new Map<string, { skuCode: string; qty: number }>(),
      }
      const existing = order.skuQtyMap.get(line.skuId)
      if (existing) {
        existing.qty += line.expectedQty
      } else {
        order.skuQtyMap.set(line.skuId, {
          skuCode: line.skuCode,
          qty: line.expectedQty,
        })
      }
      orderMap.set(line.orderId, order)
    }

    const groupsBySignature = new Map<string, {
      comboText: string
      orderNumbers: string[]
      items: Array<{ skuCode: string; qty: number }>
    }>()
    for (const order of orderMap.values()) {
      const parts = Array.from(order.skuQtyMap.entries())
        .sort(([leftSkuId], [rightSkuId]) => leftSkuId.localeCompare(rightSkuId))
        .map(([skuId, item]) => ({
          signature: `${skuId}:${item.qty}`,
          skuCode: item.skuCode,
          qty: item.qty,
          text: `${item.skuCode} x${item.qty}`,
        }))
      const signature = parts.map((item) => item.signature).join('|')
      const comboText = parts.map((item) => item.text).join(' + ')
      const group = groupsBySignature.get(signature) || {
        comboText,
        orderNumbers: [],
        items: parts.map((item) => ({
          skuCode: item.skuCode,
          qty: item.qty,
        })),
      }
      group.orderNumbers.push(order.orderNumber)
      groupsBySignature.set(signature, group)
    }

    const groups = Array.from(groupsBySignature.values())
    return {
      isConsistent: groups.length <= 1 && (!isSingleMultiHotTask || groups.every((group) => group.items.length === 1)),
      groupCount: groups.length,
      orderCount: orderMap.size,
      groups,
    }
  }, [strategy.showsFixedComboSummary, isSingleMultiHotTask, pickOrderLines])
  const submitDisabledReason = strategy.getSubmitDisabledReason({
    moduleState,
    hasPackagingMaterials: packagingMaterials.length > 0,
    fixedComboConsistent: fixedComboCheck.isConsistent,
    weightInput,
    t,
  })

  const CLOSE_BOX_CODES = ['CLOSEBOX', 'GB', '关箱', 'CLOSE']

  const handleSkuSubmit = useCallback(async () => {
    if (!skuInput.trim() || !currentPickOrder) return

    if (pendingCloseOrder) {
      toast.error(t('errors.scanCloseCodeFirst'))
      onOperationNotice?.({
        type: 'warning',
        title: t('notices.closeFirst.title'),
        message: t('notices.closeFirst.message'),
      })
      setSkuInput('')
      setTimeout(() => materialInputRef.current?.focus(), 50)
      return
    }

    if (pendingCompletePickOrder) {
      toast.error(t('errors.pickOrderReadySubmitFirst'))
      onOperationNotice?.({
        type: 'warning',
        title: t('notices.submitFirst.title'),
        message: t('notices.submitFirst.message'),
      })
      setSkuInput('')
      setTimeout(() => materialInputRef.current?.focus(), 50)
      return
    }

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
  }, [t, skuInput, currentPickOrder, pendingCloseOrder, pendingCompletePickOrder, onSkuScanned, setIsLoading, onOperationNotice])

  const handleMaterialScan = async () => {
    if (!materialInput.trim()) return
    const code = materialInput.trim()
    const upperCode = code.toUpperCase()

    if (CLOSE_BOX_CODES.includes(upperCode) || CLOSE_BOX_CODES.includes(code)) {
      if (pendingCloseOrder) {
        setMaterialInput('')
        await onCloseBox()
        setTimeout(() => skuInputRef.current?.focus(), 50)
        return
      }

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

    const material = materialOptions.find((m) => m.materialCode === code)
    if (!material) {
      toast.error(t('errors.materialNotFound'))
      onOperationNotice?.({
        type: 'error',
        title: t('notices.materialNotFound.title'),
        message: t('notices.materialNotFound.message', { code }),
      })
      setMaterialInput('')
      setTimeout(() => materialInputRef.current?.focus(), 50)
      return
    }

    if (!packagingMaterials.some((m) => m.materialId === material.id)) {
      addPackagingMaterial({
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        quantity: 1,
      })
    }

    setMaterialInput('')
    setTimeout(() => materialInputRef.current?.focus(), 50)
  }

  const handleSubmitPickOrderPacking = async () => {
    if (submitDisabledReason) {
      toast.error(submitDisabledReason)
      onOperationNotice?.({
        type: 'warning',
        title: t('notices.cannotSubmit.title'),
        message: submitDisabledReason,
      })
      return
    }

    const payload = strategy.buildSubmitPayload(weightInput)
    await onCloseBox(payload)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('scanPickOrder')}</Label>
          <div className="flex gap-2">
            <Input
              ref={taskNumberInputRef}
              value={taskNumberInput}
              onChange={(e) => setTaskNumberInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !currentPickOrder && handleTaskNumberSubmit()}
              placeholder={t('scanPlaceholder')}
              disabled={isLoading || !!currentPickOrder}
              autoFocus={!currentPickOrder}
            />
            {!currentPickOrder && (
              <Button
                onClick={handleTaskNumberSubmit}
                disabled={isLoading || !taskNumberInput.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon('confirm')}
              </Button>
            )}
          </div>
        </div>

        {currentPickOrder && (
          <>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">{t('labels.pickOrderType')}：</span>
                <span className="text-base font-semibold text-foreground">
                  {taskTypeLabel}
                </span>
              </div>
              {flowDescription && (
                <div className="mt-1 text-muted-foreground">
                  {flowDescription}
                </div>
              )}
              {strategy.showsFixedComboSummary && instruction && (
                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{isSingleMultiHotTask ? t('singleMultiHotReview.title') : t('fixedCombo.title')}</span>
                    <span className="rounded bg-white px-2 py-0.5 font-medium text-blue-800">
                      {isSingleMultiHotTask
                        ? t('singleMultiHotReview.orderCount', { count: fixedComboCheck.orderCount })
                        : t('fixedCombo.orderCount', { count: fixedComboCheck.orderCount })}
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 font-medium text-blue-800">
                      {isSingleMultiHotTask ? t('singleMultiHotReview.scanOneFullOrderQty') : t('fixedCombo.scanOneFullCombo')}
                    </span>
                  </div>
                  {fixedComboCheck.isConsistent && fixedComboCheck.groups[0] && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {fixedComboCheck.groups[0].items.map((item) => (
                        <span
                          key={item.skuCode}
                          className="inline-flex items-center gap-2 rounded border border-blue-100 bg-white px-2 py-1 text-xs font-semibold text-blue-800"
                        >
                          <span className="font-mono text-slate-950">{item.skuCode}</span>
                          <span className="h-3 w-px bg-blue-200" />
                          <span>{isSingleMultiHotTask
                            ? t('singleMultiHotReview.qtyPerOrder', { qty: item.qty })
                            : t('fixedCombo.qtyPerOrder', { qty: item.qty })}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showsReviewSummary && reviewOrder && (
                <div className={moduleState?.completedReviewOrder
                  ? 'mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2'
                  : 'mt-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 shadow-sm ring-1 ring-orange-200'}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800">
                    <span className={moduleState?.completedReviewOrder
                      ? 'rounded bg-emerald-600 px-2 py-0.5 font-semibold text-white'
                      : 'rounded bg-orange-600 px-2 py-0.5 font-semibold text-white'}
                    >
                      {moduleState?.completedReviewOrder && pendingCloseOrder
                        ? (isSingleMultiHotTask
                          ? t('singleMultiHotReview.reviewCompletePendingClose')
                          : t('fixedCombo.reviewCompletePendingClose'))
                        : moduleState?.completedReviewOrder
                          ? (isSingleMultiHotTask ? t('singleMultiHotReview.reviewComplete') : t('fixedCombo.reviewComplete'))
                          : (isSingleMultiHotTask ? t('singleMultiHotReview.reviewing') : t('fixedCombo.reviewing'))}
                    </span>
                    <span className={moduleState?.completedReviewOrder
                      ? 'rounded bg-white px-2 py-0.5 font-medium text-emerald-800'
                      : 'rounded bg-white px-2 py-0.5 font-medium text-orange-800'}
                    >
                      {reviewOrder.orderNumber}
                    </span>
                    <span className={moduleState?.completedReviewOrder
                      ? 'rounded bg-white px-2 py-0.5 font-semibold text-emerald-800'
                      : 'rounded bg-white px-2 py-0.5 font-semibold text-orange-800'}
                    >
                      {fixedComboReviewProgress.totalPacked}/{fixedComboReviewProgress.totalExpected} ({fixedComboReviewProgress.percent}%)
                    </span>
                  </div>
                  {fixedComboReviewProgress.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {fixedComboReviewProgress.items.map((item) => {
                        const isComplete = item.packedQty >= item.expectedQty
                        return (
                          <span
                            key={item.skuCode}
                            className={isComplete
                              ? 'inline-flex items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1 text-xs font-semibold text-emerald-700'
                              : 'inline-flex items-center gap-2 rounded border border-orange-100 bg-white px-2 py-1 text-xs font-semibold text-orange-700'}
                          >
                            <span className="font-mono text-slate-950">{item.skuCode}</span>
                            <span className="h-3 w-px bg-slate-200" />
                            <span>
                              {Math.min(item.packedQty, item.expectedQty)} / {item.expectedQty}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              {strategy.showsFixedComboSummary && !fixedComboCheck.isConsistent && (
                <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                  <div className="font-medium">
                    {isSingleMultiHotTask
                      ? t('singleMultiHotReview.inconsistent', { count: fixedComboCheck.groupCount })
                      : t('fixedCombo.inconsistent', { count: fixedComboCheck.groupCount })}
                  </div>
                  <div className="mt-1 space-y-1 text-xs">
                    {fixedComboCheck.groups.map((group) => (
                      <div key={group.comboText}>
                        {isSingleMultiHotTask
                          ? t('singleMultiHotReview.groupSummary', { comboText: group.comboText, count: group.orderNumbers.length })
                          : t('fixedCombo.groupSummary', { comboText: group.comboText, count: group.orderNumbers.length })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isPickOrderCompleted && (
              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div>
                  <div className="text-sm font-medium text-emerald-800">
                    {t('completedPickOrderReadyForNext')}
                  </div>
                  <div className="mt-1 text-xs text-emerald-700">
                    {t('completedPickOrderReadyForNextDesc')}
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={onNextTarget}
                  size="lg"
                >
                  {t('nextPickOrder')}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('scanSku')}</Label>
              <div className="flex gap-2">
                <Input
                  ref={skuInputRef}
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSkuSubmit()}
                  placeholder={t('skuPlaceholder')}
                  disabled={isLoading || !!pendingCloseOrder || pendingCompletePickOrder || isPickOrderCompleted}
                  autoFocus={!pendingCloseOrder && !pendingCompletePickOrder && !isPickOrderCompleted}
                />
              </div>
            </div>

            {!isPickOrderCompleted && (
              <div className="space-y-2">
                <Label>
                  {t('material')}
                  {(pendingCloseOrder || pendingCompletePickOrder) && (
                    <span className="ml-1 text-xs text-orange-600">
                      {pendingCloseOrder ? t('scanToClose') : t('confirmMaterialBeforeSubmit')}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    ref={materialInputRef}
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMaterialScan()}
                    placeholder={pendingCloseOrder ? t('materialPlaceholderClose') : t('materialPlaceholder')}
                    className="flex-1"
                  />
                  <Select value={selectedMaterialId} onValueChange={(value) => {
                    const material = materialOptions.find((m) => m.id === value)
                    if (material && !packagingMaterials.some((m) => m.materialId === value)) {
                      addPackagingMaterial({
                        materialId: material.id,
                        materialCode: material.materialCode,
                        materialName: material.materialName,
                        quantity: 1,
                      })
                    }
                    setSelectedMaterialId('')
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

            {!isPickOrderCompleted && packagingMaterials.length > 0 && (
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

            {pendingCloseOrder && typeof pendingCloseOrder === 'object' && (
              <div className="space-y-2">
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="text-sm font-medium text-orange-700">
                    {t('messages.orderPacked', { orderNumber: pendingCloseOrder.orderNumber })}
                  </div>
                  <div className="mt-1 text-xs text-orange-600">
                    {t('strategy.orderClose.submitReadyDescription')}
                  </div>
                </div>
                <Button
                  className="w-full bg-orange-600 text-white hover:bg-orange-700"
                  onClick={() => onCloseBox()}
                  disabled={isSubmitting || packagingMaterials.length === 0}
                  size="lg"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('closeBox')}
                </Button>
              </div>
            )}

            {pendingCompletePickOrder && (
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="text-sm font-medium text-blue-700">
                    {moduleState ? strategy.getSubmitReadyTitle(moduleState, t) : t('strategy.defaultSubmitReadyTitle')}
                  </div>
                  <div className="mt-1 text-xs text-blue-600">
                    {strategy.getSubmitReadyDescription(t)}
                  </div>
                </div>

                {strategy.requiresWeight && (
                  <div className="space-y-2">
                    <Label>{t('packageWeightKg')}</Label>
                    <Input
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder={t('packageWeightPlaceholder')}
                      inputMode="decimal"
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleSubmitPickOrderPacking}
                  disabled={isSubmitting || !!submitDisabledReason}
                  size="lg"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('submitPacking')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
