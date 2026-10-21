'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  MapPin,
  ScanLine,
  Minus,
  Plus,
  Save,
  RotateCcw,
  X,
  ClipboardList,
  Calendar,
  Package,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { formatDate } from '@/lib/utils/date-formatter'

interface LocationInfo {
  id: string
  locationCode: string
  zoneId: string
  zoneName: string | null
  zoneQualityType?: string
  warehouseId: string
}

interface SkuInfo {
  id: string
  skuCode: string
  skuName: string | null
  barcode: string | null
  isSerialManaged: boolean
  clientId: string
}

interface PutawayTaskInfo {
  id: string
  skuId: string
  skuCode: string
  skuName?: string | null
  remainingQty: number
  qualityType?: string
  batchNumber?: string | null
  expiryDate?: string | null
}

interface PutawayOrderInfo {
  id: string
  putawayOrderNumber: string
  status: string
  putawayTasks?: PutawayTaskInfo[]
}

interface SkuShelvingPanelProps {
  onSave: (data: {
    locationId: string
    locationCode: string
    skuId: string
    skuCode: string
    quantity: number
    serialNumbers: string[]
    warehouseId: string
    clientId: string
    // 选中的任务信息
    putawayLineId?: string
    batchNumber?: string | null
    expiryDate?: string | null
  }) => Promise<void>
  quantity: number
  setQuantity: (qty: number) => void
  currentSku: SkuInfo | null
  setCurrentSku: (sku: SkuInfo | null) => void
  currentLocation: LocationInfo | null
  setCurrentLocation: (location: LocationInfo | null) => void
  isSubmitting: boolean
  // 上架单相关
  putawayOrderInput: string
  setPutawayOrderInput: (value: string) => void
  currentPutawayOrder: PutawayOrderInfo | null
  onLoadPutawayOrder: (orderNumber: string) => Promise<void>
  onClearPutawayOrder: () => void
  isLoadingOrder: boolean
}

export function SkuShelvingPanel({
  onSave,
  quantity,
  setQuantity,
  currentSku,
  setCurrentSku,
  currentLocation,
  setCurrentLocation,
  isSubmitting,
  putawayOrderInput,
  setPutawayOrderInput,
  currentPutawayOrder,
  onLoadPutawayOrder,
  onClearPutawayOrder,
  isLoadingOrder,
}: SkuShelvingPanelProps) {
  const t = useTranslations('shelving')
  const tCommon = useTranslations('common')

  // 上架单是否已完成
  const isOrderCompleted = currentPutawayOrder?.status === 'COMPLETED'

  const [locationInput, setLocationInput] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [maxQuantity, setMaxQuantity] = useState<number>(0)
  // 匹配的任务列表（按质量类型过滤后）
  const [matchingTasks, setMatchingTasks] = useState<PutawayTaskInfo[]>([])
  // 选中的效期和批次（分开选择）
  const [selectedExpiry, setSelectedExpiry] = useState<string>('')
  const [selectedBatch, setSelectedBatch] = useState<string>('')

  const orderInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const skuInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)

  // 自动聚焦
  useEffect(() => {
    if (!currentPutawayOrder && orderInputRef.current) {
      orderInputRef.current.focus()
    } else if (currentPutawayOrder && !currentSku && skuInputRef.current) {
      skuInputRef.current.focus()
    } else if (currentSku && !currentLocation && locationInputRef.current) {
      locationInputRef.current.focus()
    }
  }, [currentPutawayOrder, currentSku, currentLocation])

  // 上架单号提交
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!putawayOrderInput.trim()) return
    await onLoadPutawayOrder(putawayOrderInput.trim())
  }

  // 货位提交
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = locationInput.trim()
    if (!trimmed || !currentSku) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/v1/shelving/location?locationCode=${encodeURIComponent(trimmed)}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('messages.locationNotFound'))
      }

      const data = await response.json()
      const location = data.data

      // 获取当前SKU对应的所有未完成任务
      const allMatchingTasks = currentPutawayOrder?.putawayTasks?.filter(
        task => (task.skuId === currentSku.id || task.skuCode === currentSku.skuCode) && task.remainingQty > 0
      ) || []

      const zoneQualityType = location.zoneQualityType || 'GOOD'

      // 根据货位质量类型，筛选匹配的任务（可能有多个不同效期/批次）
      const filteredTasks = allMatchingTasks.filter(task => {
        const taskQualityType = task.qualityType || 'GOOD'
        // 良品库区匹配良品任务，非良品库区匹配非良品任务
        if (zoneQualityType === 'GOOD') {
          return taskQualityType === 'GOOD'
        } else {
          return taskQualityType !== 'GOOD'
        }
      })

      // 如果没有找到匹配的任务，说明质量类型不匹配
      if (filteredTasks.length === 0) {
        if (zoneQualityType === 'GOOD') {
          throw new Error(`该货位是良品库区，但该SKU没有待上架的良品任务`)
        } else {
          throw new Error(`该货位是${location.zoneName || '不良品'}库区，但该SKU没有待上架的不良品任务`)
        }
      }

      setCurrentLocation({
        id: location.id,
        locationCode: location.locationCode,
        zoneId: location.zoneId,
        zoneName: location.zoneName,
        zoneQualityType: location.zoneQualityType,
        warehouseId: location.warehouseId,
      })
      setLocationInput('')
      setQuantity(0)

      // 保存匹配的任务列表
      setMatchingTasks(filteredTasks)

      // 提取唯一的效期和批次列表，默认选择第一个
      const expirySet = new Set(filteredTasks.map(t => t.expiryDate || ''))
      const batchSet = new Set(filteredTasks.map(t => t.batchNumber || ''))
      const firstExpiry = Array.from(expirySet)[0] || ''
      const firstBatch = Array.from(batchSet)[0] || ''

      setSelectedExpiry(firstExpiry)
      setSelectedBatch(firstBatch)

      // 找到匹配的任务并设置 maxQuantity
      const matchedTask = filteredTasks.find(t =>
        (t.expiryDate || '') === firstExpiry && (t.batchNumber || '') === firstBatch
      )
      if (matchedTask) {
        setMaxQuantity(matchedTask.remainingQty)
      } else if (filteredTasks.length > 0) {
        // 如果没有精确匹配，使用第一个任务
        setMaxQuantity(filteredTasks[0].remainingQty)
      }

      toast.success(t('messages.locationLoaded'))
      // 聚焦到数量输入框
      setTimeout(() => quantityInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('messages.locationNotFound')
      toast.error(msg)
      setLocationInput('')
      setTimeout(() => locationInputRef.current?.focus(), 50)
    } finally {
      setIsLoading(false)
    }
  }

  // 计算唯一的效期列表和批次列表
  const uniqueExpiries = Array.from(new Set(matchingTasks.map(t => t.expiryDate || '')))
  const uniqueBatches = Array.from(new Set(matchingTasks.map(t => t.batchNumber || '')))

  // 根据选中的效期和批次，找到对应的任务
  const selectedTask = matchingTasks.find(t =>
    (t.expiryDate || '') === selectedExpiry && (t.batchNumber || '') === selectedBatch
  ) || (matchingTasks.length === 1 ? matchingTasks[0] : null)

  // 效期选择变更
  const handleExpiryChange = (expiry: string) => {
    setSelectedExpiry(expiry)
    // 更新 maxQuantity
    const task = matchingTasks.find(t =>
      (t.expiryDate || '') === expiry && (t.batchNumber || '') === selectedBatch
    )
    if (task) {
      setMaxQuantity(task.remainingQty)
      if (quantity > task.remainingQty) {
        setQuantity(0)
      }
    }
  }

  // 批次选择变更
  const handleBatchChange = (batch: string) => {
    setSelectedBatch(batch)
    // 更新 maxQuantity
    const task = matchingTasks.find(t =>
      (t.expiryDate || '') === selectedExpiry && (t.batchNumber || '') === batch
    )
    if (task) {
      setMaxQuantity(task.remainingQty)
      if (quantity > task.remainingQty) {
        setQuantity(0)
      }
    }
  }

  // 清除货位
  const handleClearLocation = () => {
    setCurrentLocation(null)
    setLocationInput('')
    setMatchingTasks([])
    setSelectedExpiry('')
    setSelectedBatch('')
    setMaxQuantity(0)
    setTimeout(() => locationInputRef.current?.focus(), 100)
  }

  // SKU提交
  const handleSkuSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = skuInput.trim()
    if (!trimmed) return

    setIsLoading(true)
    try {
      // 查询SKU信息
      const response = await fetch(
        `/api/v1/shelving/sku?barcode=${encodeURIComponent(trimmed)}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('skuMode.skuNotFound'))
      }

      const data = await response.json()
      const sku = data.data

      // 检查该SKU在上架单中是否已完成
      if (currentPutawayOrder) {
        // 找到所有匹配该SKU的任务
        const matchingTasks = currentPutawayOrder.putawayTasks?.filter(
          task => task.skuId === sku.id || task.skuCode === sku.skuCode
        ) || []

        if (matchingTasks.length > 0) {
          // 检查是否所有任务都已完成（所有任务的剩余数量都为0）
          const allCompleted = matchingTasks.every(task => task.remainingQty <= 0)

          if (allCompleted) {
            toast.warning(t('messages.skuAlreadyCompleted'))
            setSkuInput('')
            setTimeout(() => skuInputRef.current?.focus(), 50)
            return
          }
        }
      }

      setCurrentSku({
        id: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        barcode: sku.barcode,
        isSerialManaged: sku.isSerialManaged,
        clientId: sku.clientId,
      })
      setSkuInput('')

      setTimeout(() => locationInputRef.current?.focus(), 50)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('skuMode.skuNotFound')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [skuInput, currentPutawayOrder, t, setQuantity, setCurrentSku])

  // 清除SKU
  const handleClearSku = () => {
    setCurrentSku(null)
    setCurrentLocation(null)
    setSkuInput('')
    setLocationInput('')
    setQuantity(0)
    setMatchingTasks([])
    setSelectedExpiry('')
    setSelectedBatch('')
    setMaxQuantity(0)
    setTimeout(() => skuInputRef.current?.focus(), 100)
  }

  // 数量输入
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // 允许清空输入框
    if (value === '') {
      setQuantity(0)
      return
    }
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      // 限制不能超过最大数量
      const finalValue = Math.min(numValue, maxQuantity)
      setQuantity(finalValue)
      // 如果输入的值超过最大值，提示用户
      if (numValue > maxQuantity) {
        toast.warning(t('messages.qtyExceedsRemaining', { max: maxQuantity }))
      }
    }
  }

  // 增减数量
  const adjustQuantity = (delta: number) => {
    const newQty = quantity + delta
    if (newQty > 0 && newQty <= maxQuantity) {
      setQuantity(newQty)
    }
  }

  // 是否可以保存
  const canSave = currentLocation && currentSku && quantity > 0 && selectedTask

  // 保存
  const handleSave = async () => {
    if (!canSave || !currentLocation || !currentSku || !selectedTask) return

    await onSave({
      locationId: currentLocation.id,
      locationCode: currentLocation.locationCode,
      skuId: currentSku.id,
      skuCode: currentSku.skuCode,
      quantity,
      serialNumbers: [],
      warehouseId: currentLocation.warehouseId,
      clientId: currentSku.clientId,
      // 传递选中任务的信息
      putawayLineId: selectedTask.id,
      batchNumber: selectedTask.batchNumber,
      expiryDate: selectedTask.expiryDate,
    })
  }

  // 重置
  const handleReset = () => {
    setCurrentSku(null)
    setSkuInput('')
    setQuantity(0)
    setTimeout(() => skuInputRef.current?.focus(), 100)
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* 上架单号扫描 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {t('putawayOrder.scanLabel')}
          </Label>
          {currentPutawayOrder ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex-1 justify-center py-2">
                {currentPutawayOrder.putawayOrderNumber}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearPutawayOrder}
                disabled={isLoadingOrder || isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleOrderSubmit}>
              <Input
                ref={orderInputRef}
                value={putawayOrderInput}
                onChange={(e) => setPutawayOrderInput(e.target.value)}
                placeholder={t('putawayOrder.scanPlaceholder')}
                disabled={isLoadingOrder}
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
                  onClick={handleClearSku}
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
                disabled={isLoading || !currentPutawayOrder || isOrderCompleted}
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
                disabled={isLoading || isSubmitting}
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
                disabled={isLoading || !currentSku || isOrderCompleted}
              />
            </form>
          )}
        </div>

        {/* 数量输入 */}
        {currentSku && currentLocation && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>{t('quantity.label')}</span>
                {maxQuantity > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {t('quantity.max')}: {maxQuantity}
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustQuantity(-1)}
                  disabled={quantity <= 1 || isSubmitting}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  ref={quantityInputRef}
                  type="number"
                  value={quantity || ''}
                  onChange={handleQtyChange}
                  className="text-center"
                  min={1}
                  max={maxQuantity || undefined}
                  disabled={isSubmitting}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustQuantity(1)}
                  disabled={quantity >= maxQuantity || isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 效期选择 - 当有多个效期时显示 */}
            {uniqueExpiries.length > 1 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('expiryBatch.expiry')}
                </Label>
                <Select value={selectedExpiry} onValueChange={handleExpiryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('expiryBatch.selectExpiry')} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueExpiries.map(expiry => (
                      <SelectItem key={expiry || 'none'} value={expiry}>
                        {expiry ? formatDate(expiry) : t('expiryBatch.noExpiry')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 批次选择 - 当有多个批次时显示 */}
            {uniqueBatches.length > 1 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('expiryBatch.batch')}
                </Label>
                <Select value={selectedBatch} onValueChange={handleBatchChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('expiryBatch.selectBatch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueBatches.map(batch => (
                      <SelectItem key={batch || 'none'} value={batch}>
                        {batch || t('expiryBatch.noBatch')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 显示选中的效期/批次信息 - 当各自只有一个选项时 */}
            {uniqueExpiries.length === 1 && uniqueBatches.length === 1 && selectedTask && (selectedTask.expiryDate || selectedTask.batchNumber) && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {selectedTask.expiryDate && (
                  <span>{t('expiryBatch.expiry')}: {formatDate(selectedTask.expiryDate)}</span>
                )}
                {selectedTask.expiryDate && selectedTask.batchNumber && <span className="mx-2">|</span>}
                {selectedTask.batchNumber && (
                  <span>{t('expiryBatch.batch')}: {selectedTask.batchNumber}</span>
                )}
              </div>
            )}

            {/* 显示剩余数量提示 */}
            {selectedTask && (
              <div className="text-sm text-muted-foreground">
                {t('expiryBatch.remaining')}: {selectedTask.remainingQty}
              </div>
            )}

            <Separator />

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {tCommon('reset')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
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
