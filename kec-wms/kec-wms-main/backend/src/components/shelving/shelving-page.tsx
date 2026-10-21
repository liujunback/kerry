'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Package, Tags, ArrowLeft } from 'lucide-react'
import { ShelvingScanPanel } from './shelving-scan-panel'
import { SkuShelvingPanel } from './sku-shelving-panel'
import { ContainerInfoCard } from './container-info-card'
import { ShelvingItemsTable } from './shelving-items-table'
import { PutawayOrderCard } from './putaway-order-card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  useShelvingStore,
  type ContainerInfo,
  type ContainerItemInfo,
  type LocationInfo,
  type SkuInfo,
  type ShelvingRecord,
} from '@/stores/shelving-store'

type ShelvingModeType = 'select' | 'container' | 'sku'

// 上架单信息类型
interface PutawayOrderInfo {
  id: string
  putawayOrderNumber: string
  status: string
  totalQty: number
  putawayQty: number
  pendingQty: number
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  asn: {
    asnNumber: string
  }
  putawayTasks: Array<{
    id: string
    putawayTaskNumber: string
    skuId: string
    skuCode: string
    skuName: string | null
    status: string
    quantity: number
    putawayQty: number
    remainingQty: number
    batchNumber: string | null
    expiryDate: string | null
    qualityType: string
    containerId: string | null
    container: {
      id: string
      containerCode: string
    } | null
    isSerialManaged: boolean
    serialNumbers: string[]
  }>
  progress: {
    totalQty: number
    putawayQty: number
    pendingQty: number
    percentage: number
    taskCount: number
    completedTaskCount: number
  }
}

// SKU上架模式的本地状态类型
interface SkuLocationInfo {
  id: string
  locationCode: string
  zoneId: string
  zoneName: string | null
  warehouseId: string
}

interface SkuSkuInfo {
  id: string
  skuCode: string
  skuName: string | null
  barcode: string | null
  isSerialManaged: boolean
  clientId: string
}

export function ShelvingPage() {
  const t = useTranslations('shelving')
  const tMenuGroup = useTranslations('menuGroup')
  const [shelvingMode, setShelvingMode] = useState<ShelvingModeType>('select')

  // 上架单相关状态
  const [putawayOrderInput, setPutawayOrderInput] = useState('')
  const [currentPutawayOrder, setCurrentPutawayOrder] = useState<PutawayOrderInfo | null>(null)
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)

  // SKU上架模式的本地状态
  const [skuLocation, setSkuLocation] = useState<SkuLocationInfo | null>(null)
  const [skuSku, setSkuSku] = useState<SkuSkuInfo | null>(null)
  const [skuQuantity, setSkuQuantity] = useState(0)
  const [skuRecords, setSkuRecords] = useState<ShelvingRecord[]>([])
  const [skuIsSubmitting, setSkuIsSubmitting] = useState(false)

  const {
    currentContainer,
    containerItems,
    currentLocation,
    currentSku,
    quantity,
    shelvingRecords,
    setContainer,
    clearContainer,
    setLocation,
    setCurrentSku,
    addShelvingRecord,
    resetCurrentItem,
    setIsSubmitting,
    reset,
  } = useShelvingStore()

  // 返回模式选择
  const handleBackToModeSelect = useCallback(() => {
    reset()
    // 重置SKU上架模式状态
    setSkuLocation(null)
    setSkuSku(null)
    setSkuQuantity(0)
    // 重置上架单状态
    setCurrentPutawayOrder(null)
    setPutawayOrderInput('')
    setShelvingMode('select')
  }, [reset])

  // 加载上架单
  const handleLoadPutawayOrder = useCallback(async (orderNumber: string) => {
    if (!orderNumber.trim()) return

    setIsLoadingOrder(true)
    try {
      const response = await fetch(
        `/api/v1/shelving/putaway-order?orderNumber=${encodeURIComponent(orderNumber.trim())}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('messages.orderNotFound'))
      }

      const data = await response.json()
      setCurrentPutawayOrder(data.data)
      setPutawayOrderInput('')
      toast.success(t('messages.orderLoaded'))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('messages.orderNotFound')
      toast.error(msg)
    } finally {
      setIsLoadingOrder(false)
    }
  }, [t])

  // 清除上架单（重置页面状态）
  const handleClearPutawayOrder = useCallback(() => {
    setCurrentPutawayOrder(null)
    setPutawayOrderInput('')
    setSkuLocation(null)
    setSkuSku(null)
    setSkuQuantity(0)
    setSkuRecords([])
  }, [])

  // 刷新上架单进度，返回刷新后的数据
  const refreshPutawayOrder = useCallback(async (orderNumber?: string): Promise<PutawayOrderInfo | null> => {
    const targetOrderNumber = orderNumber || currentPutawayOrder?.putawayOrderNumber
    if (!targetOrderNumber) return null

    try {
      const response = await fetch(
        `/api/v1/shelving/putaway-order?orderNumber=${encodeURIComponent(targetOrderNumber)}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCurrentPutawayOrder(data.data)
          return data.data
        }
      }
    } catch (error) {
      console.error('刷新上架单失败:', error)
    }
    return null
  }, [currentPutawayOrder?.putawayOrderNumber])

  // 加载容器
  const handleContainerLoaded = useCallback(async (
    containerCode: string,
    warehouseId: string
  ) => {
    const response = await fetch(
      `/api/v1/shelving/container?containerCode=${encodeURIComponent(containerCode)}&warehouseId=${encodeURIComponent(warehouseId)}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('messages.containerNotFound'))
    }

    const data = await response.json()
    const { container, items } = data.data

    const containerInfo: ContainerInfo = {
      id: container.id,
      containerCode: container.containerCode,
      containerType: container.containerType,
      workStatus: container.workStatus,
      warehouseId: container.warehouseId,
    }

    const containerItemsInfo: ContainerItemInfo[] = items.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      skuId: item.skuId as string,
      skuCode: item.skuCode as string,
      skuName: item.skuName as string | null,
      barcode: item.barcode as string | null,
      quantity: item.quantity as number,
      availableQty: item.availableQty as number,
      batchNumber: item.batchNumber as string | null,
      qualityStatus: item.qualityStatus as string,
      isSerialManaged: item.isSerialManaged as boolean,
      serialNumbers: item.serialNumbers as string[],
    }))

    setContainer(containerInfo, containerItemsInfo)
  }, [t, setContainer])

  // 加载货位
  const handleLocationLoaded = useCallback(async (
    locationCode: string,
    warehouseId: string
  ) => {
    const response = await fetch(
      `/api/v1/shelving/location?locationCode=${encodeURIComponent(locationCode)}&warehouseId=${encodeURIComponent(warehouseId)}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('messages.locationNotFound'))
    }

    const data = await response.json()
    const location = data.data

    // 获取当前SKU的质量状态（容器模式）
    const containerItem = containerItems.find(i => i.skuId === currentSku?.id)
    const itemQualityStatus = containerItem?.qualityStatus || 'GOOD'
    const zoneQualityType = location.zoneQualityType || 'GOOD'

    // 校验质量类型匹配
    if (itemQualityStatus === 'GOOD' && zoneQualityType !== 'GOOD') {
      throw new Error(`良品不能上架到${location.zoneName || '非良品'}库区，请选择良品库区`)
    }
    if ((itemQualityStatus === 'DAMAGED' || itemQualityStatus === 'DEFECTIVE') && zoneQualityType === 'GOOD') {
      throw new Error(`不良品不能上架到${location.zoneName || '良品'}库区，请选择不良品库区`)
    }

    const locationInfo: LocationInfo = {
      id: location.id,
      locationCode: location.locationCode,
      zoneId: location.zoneId,
      zoneName: location.zoneName,
      zoneQualityType: location.zoneQualityType,
      locationType: location.locationType,
      isReceivable: location.isReceivable,
      status: location.status,
    }

    setLocation(locationInfo)
  }, [t, setLocation, containerItems, currentSku])

  // 扫描SKU (容器模式)
  const handleSkuScanned = useCallback((barcode: string) => {
    if (!currentContainer || !containerItems.length) {
      throw new Error(t('messages.scanContainerFirst'))
    }

    // 在容器物品中查找匹配的SKU
    const item = containerItems.find(
      i => i.skuCode === barcode || i.barcode === barcode
    )

    if (!item) {
      throw new Error(t('messages.skuNotInContainer'))
    }

    if (item.availableQty <= 0) {
      throw new Error(t('messages.noAvailableQty'))
    }

    const skuInfo: SkuInfo = {
      id: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      barcode: item.barcode,
      isSerialManaged: item.isSerialManaged,
    }

    setCurrentSku(skuInfo, item.availableQty, item.serialNumbers)
  }, [currentContainer, containerItems, t, setCurrentSku])

  // 保存上架 (容器模式)
  const handleSave = useCallback(async () => {
    if (!currentContainer || !currentLocation || !currentSku || quantity <= 0) {
      return
    }

    // 获取当前容器物品
    const containerItem = containerItems.find(
      i => i.skuId === currentSku.id
    )

    if (!containerItem) {
      toast.error(t('messages.skuNotInContainer'))
      return
    }

    // 对于序列号管理的SKU，自动使用容器物品中的序列号
    const serialNumbersToUse = currentSku.isSerialManaged
      ? (containerItem.serialNumbers || []).slice(0, quantity)
      : []

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/shelving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: currentContainer.id,
          containerCode: currentContainer.containerCode,
          locationId: currentLocation.id,
          locationCode: currentLocation.locationCode,
          skuId: currentSku.id,
          skuCode: currentSku.skuCode,
          batchNumber: containerItem.batchNumber,
          qualityStatus: containerItem.qualityStatus,
          quantity,
          serialNumbers: serialNumbersToUse,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('messages.shelvingFailed'))
      }

      // 添加上架记录
      const record: ShelvingRecord = {
        id: Date.now().toString(),
        skuCode: currentSku.skuCode,
        skuName: currentSku.skuName,
        locationCode: currentLocation.locationCode,
        quantity,
        serialNumbers: [],
        createdAt: new Date().toISOString(),
      }
      addShelvingRecord(record)

      // 更新容器物品数量和序列号
      const updatedItems = containerItems.map(item => {
        if (item.skuId === currentSku.id) {
          // 移除已使用的序列号
          const remainingSerials = currentSku.isSerialManaged
            ? (item.serialNumbers || []).slice(quantity)
            : item.serialNumbers
          return {
            ...item,
            availableQty: item.availableQty - quantity,
            quantity: item.quantity - quantity,
            serialNumbers: remainingSerials,
          }
        }
        return item
      }).filter(item => item.quantity > 0)

      // 如果容器还有物品，更新状态；否则清除容器
      if (updatedItems.length > 0) {
        setContainer(currentContainer, updatedItems)
      } else {
        clearContainer()
      }

      toast.success(t('messages.shelvingSuccess'))
      resetCurrentItem()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('messages.shelvingFailed')
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    currentContainer,
    currentLocation,
    currentSku,
    quantity,
    containerItems,
    t,
    setIsSubmitting,
    addShelvingRecord,
    setContainer,
    clearContainer,
    resetCurrentItem,
  ])

  // 继续扫描
  const handleContinue = useCallback(() => {
    resetCurrentItem()
  }, [resetCurrentItem])

  // SKU上架保存 (必须在所有条件返回之前定义)
  const handleSkuSave = useCallback(async (data: {
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
  }) => {
    setSkuIsSubmitting(true)
    try {
      // 自动获取序列号：从上架单任务中获取（根据选中的任务ID）
      let serialNumbersToUse = data.serialNumbers
      if (currentPutawayOrder && data.putawayLineId) {
        const matchingTask = currentPutawayOrder.putawayTasks?.find(
          task => task.id === data.putawayLineId
        )
        if (matchingTask?.isSerialManaged && matchingTask.serialNumbers?.length > 0) {
          // 截取对应数量的序列号
          serialNumbersToUse = matchingTask.serialNumbers.slice(0, data.quantity)
        }
      }

      const response = await fetch('/api/v1/shelving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'sku',
          locationId: data.locationId,
          locationCode: data.locationCode,
          skuId: data.skuId,
          skuCode: data.skuCode,
          quantity: data.quantity,
          warehouseId: data.warehouseId,
          clientId: data.clientId,
          serialNumbers: serialNumbersToUse,
          putawayOrderId: currentPutawayOrder?.id,
          // 传递选中任务的信息
          putawayLineId: data.putawayLineId,
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('messages.shelvingFailed'))
      }

      // 添加上架记录
      const record: ShelvingRecord = {
        id: Date.now().toString(),
        skuCode: data.skuCode,
        skuName: skuSku?.skuName || null,
        locationCode: data.locationCode,
        quantity: data.quantity,
        serialNumbers: [],
        createdAt: new Date().toISOString(),
      }
      setSkuRecords(prev => [record, ...prev])

      toast.success(t('messages.shelvingSuccess'))

      // 刷新上架单进度并检查是否完成
      const orderNumber = currentPutawayOrder?.putawayOrderNumber
      const updatedOrder = await refreshPutawayOrder(orderNumber)
      if (updatedOrder?.status === 'COMPLETED') {
        // 上架单已完成，重置所有状态
        toast.success(t('messages.orderCompleted'))
        setCurrentPutawayOrder(null)
        setPutawayOrderInput('')
        setSkuLocation(null)
        setSkuSku(null)
        setSkuQuantity(0)
      } else {
        // 检查当前SKU是否还有剩余数量
        const currentTask = updatedOrder?.putawayTasks?.find(
          task => task.skuId === data.skuId || task.skuCode === data.skuCode
        )
        const remainingQty = currentTask?.remainingQty || 0

        // 无论是否还有剩余数量，都清除SKU和货位，必须重新扫描
        setSkuSku(null)
        setSkuLocation(null)
        setSkuQuantity(0)
        if (remainingQty > 0) {
          toast.info(t('messages.continueToNextLocation', { remaining: remainingQty }))
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('messages.shelvingFailed')
      toast.error(errorMessage)
    } finally {
      setSkuIsSubmitting(false)
    }
  }, [t, skuSku, refreshPutawayOrder, currentPutawayOrder])

  // 模式选择界面
  if (shelvingMode === 'select') {
    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: tMenuGroup('inbound'), href: '/asn' },
            { label: t('title') },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* SKU上架模式 */}
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => setShelvingMode('sku')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Tags className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('modeSelect.skuMode')}</CardTitle>
              <CardDescription>{t('modeSelect.skuModeDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              {t('modeSelect.skuModeFlow')}
            </CardContent>
          </Card>

          {/* 容器上架模式 */}
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => setShelvingMode('container')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('modeSelect.containerMode')}</CardTitle>
              <CardDescription>{t('modeSelect.containerModeDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              {t('modeSelect.containerModeFlow')}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // SKU上架模式
  if (shelvingMode === 'sku') {
    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: tMenuGroup('inbound'), href: '/asn' },
            { label: t('title') },
            { label: t('modeSelect.skuMode') },
          ]}
        />

        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={handleBackToModeSelect}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('modeSelect.backToSelect')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧扫描区 */}
          <div className="lg:col-span-1">
            <SkuShelvingPanel
              onSave={handleSkuSave}
              quantity={skuQuantity}
              setQuantity={setSkuQuantity}
              currentSku={skuSku}
              setCurrentSku={setSkuSku}
              currentLocation={skuLocation}
              setCurrentLocation={setSkuLocation}
              isSubmitting={skuIsSubmitting}
              putawayOrderInput={putawayOrderInput}
              setPutawayOrderInput={setPutawayOrderInput}
              currentPutawayOrder={currentPutawayOrder}
              onLoadPutawayOrder={handleLoadPutawayOrder}
              onClearPutawayOrder={handleClearPutawayOrder}
              isLoadingOrder={isLoadingOrder}
            />
          </div>

          {/* 右侧记录区 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 上架单进度卡片 */}
            {currentPutawayOrder && (
              <PutawayOrderCard order={currentPutawayOrder} currentSkuId={skuSku?.id} />
            )}
            <ShelvingItemsTable records={skuRecords} />
          </div>
        </div>
      </div>
    )
  }

  // 容器上架模式
  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: tMenuGroup('inbound'), href: '/asn' },
          { label: t('title') },
          { label: t('modeSelect.containerMode') },
        ]}
      />

      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBackToModeSelect}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('modeSelect.backToSelect')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧扫描区 */}
        <div className="lg:col-span-1">
          <ShelvingScanPanel
            onContainerLoaded={handleContainerLoaded}
            onLocationLoaded={handleLocationLoaded}
            onSkuScanned={handleSkuScanned}
            onSave={handleSave}
            onContinue={handleContinue}
          />
        </div>

        {/* 右侧详情区 */}
        <div className="lg:col-span-2 space-y-4">
          <ContainerInfoCard />
          <ShelvingItemsTable records={shelvingRecords} />
        </div>
      </div>
    </div>
  )
}
