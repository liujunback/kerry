'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { OrderPackingScanPanel } from '@/components/packing/order-packing-scan-panel'
import { PickOrderPackingScanPanel } from '@/components/packing/pick-order-packing-scan-panel'
import {
  checkPackVideoServiceConnection,
  getPackVideoEnabledPreference,
  setPackVideoEnabledPreference,
  triggerPackVideoGeneration,
} from '@/components/packing/pack-video-client'
import { ShipmentLabelPrint, type LabelData } from '@/components/packing/shipment-label-print'
import { SerialScanDialog } from '@/components/receiving/serial-scan-dialog'
import { SerialNumberScanDialog } from '@/components/packing/serial-number-scan-dialog'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import {
  usePackingStore,
  type PickOrderInfo,
  type PickOrderLineInfo,
  type OrderSummary,
  type SelectedOrderInfo,
} from '@/stores/packing-store'
import {
  type ScanType,
  type PackingModuleContext,
  createPickOrderModule,
  createOrderModule,
  type PickOrderModuleState,
  type OrderModuleState,
} from '@/components/packing/modules'
import { isFixedComboPickOrderTaskType, isSingleMultiHotPickOrderTaskType } from '@/lib/packing/task-type'

// 联合模块状态类型
type ModuleState = PickOrderModuleState | OrderModuleState | null
type OperationNotice = {
  type: 'error' | 'warning' | 'success' | 'info'
  title: string
  message?: string
} | null

function restorePickOrderReviewState(
  taskType: string,
  lineInfos: PickOrderLineInfo[],
  pickOrderStatus: string,
  initialState: PickOrderModuleState
) {
  const isFixedComboTask = isFixedComboPickOrderTaskType(taskType)
  const isSingleMultiHotTask = isSingleMultiHotPickOrderTaskType(taskType)
  if (!isFixedComboTask && !isSingleMultiHotTask) return

  if (pickOrderStatus === 'COMPLETED') {
    return
  }

  const allLinesPacked = lineInfos.length > 0 && lineInfos.every((line) => line.packedQty >= line.expectedQty)
  if (allLinesPacked) {
    return
  }

  const orderProgress = new Map<string, {
    orderId: string
    orderNumber: string
    expectedQty: number
    packedQty: number
  }>()

  for (const line of lineInfos) {
    const progress = orderProgress.get(line.orderId) || {
      orderId: line.orderId,
      orderNumber: line.orderNumber,
      expectedQty: 0,
      packedQty: 0,
    }
    progress.expectedQty += line.expectedQty
    progress.packedQty += Math.min(line.packedQty, line.expectedQty)
    orderProgress.set(line.orderId, progress)
  }

  const progressedOrders = Array.from(orderProgress.values())
    .filter((item) => item.packedQty > 0 && item.expectedQty > 0)
    .sort((left, right) => right.packedQty - left.packedQty)

  const completedOrder = progressedOrders.find((item) => item.packedQty >= item.expectedQty)
  if (completedOrder && (isFixedComboTask || isSingleMultiHotTask)) {
    initialState.pendingCompletePickOrder = true
    initialState.pendingCloseOrder = null
    initialState.reviewingOrder = null
    initialState.completedReviewOrder = {
      orderId: completedOrder.orderId,
      orderNumber: completedOrder.orderNumber,
    }
    return
  }

  const reviewingOrder = progressedOrders.find((item) => item.packedQty < item.expectedQty)
  if (reviewingOrder) {
    initialState.reviewingOrder = {
      orderId: reviewingOrder.orderId,
      orderNumber: reviewingOrder.orderNumber,
    }
  }
}

function OperationNoticeBanner({
  notice,
  onClose,
}: {
  notice: OperationNotice
  onClose: () => void
}) {
  const t = useTranslations('packing')

  if (!notice) return null

  const styleMap = {
    error: {
      container: 'border-red-300 bg-red-50 text-red-900',
      icon: 'text-red-600',
      Icon: AlertTriangle,
    },
    warning: {
      container: 'border-orange-300 bg-orange-50 text-orange-900',
      icon: 'text-orange-600',
      Icon: AlertTriangle,
    },
    success: {
      container: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      icon: 'text-emerald-600',
      Icon: CheckCircle2,
    },
    info: {
      container: 'border-blue-300 bg-blue-50 text-blue-900',
      icon: 'text-blue-600',
      Icon: Info,
    },
  }[notice.type]
  const Icon = styleMap.Icon

  return (
    <div className={`pointer-events-auto flex items-start gap-3 rounded-md border px-3 py-2 shadow-sm ${styleMap.container}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styleMap.icon}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{notice.title}</div>
        {notice.message && (
          <div className="mt-0.5 text-sm leading-5">{notice.message}</div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onClose}
        aria-label={t('dismissNotice')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function PackingPage() {
  const t = useTranslations('packing')
  const tMenuGroup = useTranslations('menuGroup')

  // 模块相关状态
  const [scanType, setScanType] = useState<ScanType | null>(null)
  const [moduleState, setModuleState] = useState<ModuleState>(null)
  const [isSubmitting, setIsSubmittingLocal] = useState(false)
  const [labelDataList, setLabelDataList] = useState<LabelData[] | null>(null)
  const [cellCode, setCellCode] = useState<string | null>(null)
  const [operationNotice, setOperationNotice] = useState<OperationNotice>(null)
  const [isVideoServiceChecking, setIsVideoServiceChecking] = useState(true)
  const [isVideoServiceConnected, setIsVideoServiceConnected] = useState(false)
  const [isVideoFeatureEnabled, setIsVideoFeatureEnabled] = useState(true)

  const {
    currentPickOrder,
    currentItem,
    quantity,
    serialNumbers,
    showSerialDialog,
    packagingMaterials,
    setPickOrder,
    setIsSubmitting,
    setShowSerialDialog,
    setSerialNumbers,
    clearPickOrder,
    markPickOrderCompleted,
    setSelectedOrder,
    updateLinePackedQty,
    updatePickOrderTotals,
    clearPackagingMaterials,
    triggerFocusSku,
    triggerFocusMaterial,
    triggerFocusTaskNumber,
  } = usePackingStore()

  const buildSelectedOrderFromCurrentLines = useCallback((
    orderId: string,
    orderNumber: string
  ): SelectedOrderInfo | null => {
    const orderLines = usePackingStore.getState().pickOrderLines.filter((line) => line.orderId === orderId)
    if (orderLines.length === 0) {
      return null
    }

    const totalExpected = orderLines.reduce((sum, line) => sum + line.expectedQty, 0)
    const totalPacked = orderLines.reduce((sum, line) => sum + line.packedQty, 0)

    return {
      orderId,
      orderNumber,
      totalExpected,
      totalPacked,
      isComplete: totalExpected > 0 && totalPacked >= totalExpected,
      lines: orderLines.map((line) => ({
        lineId: line.id,
        skuCode: line.skuCode,
        skuName: line.skuName,
        expectedQty: line.expectedQty,
        packedQty: line.packedQty,
      })),
    }
  }, [])

  const keepCompletedPickOrderVisible = useCallback(() => {
    const {
      currentPickOrder: latestPickOrder,
      pickOrderLines,
      orderSummary,
    } = usePackingStore.getState()

    if (!latestPickOrder) return

    const packedLines = pickOrderLines.map((line) => ({
      ...line,
      packedQty: Math.max(line.packedQty, line.expectedQty),
      status: 'PACKED',
    }))
    const totalPackedQty = packedLines.reduce((sum, line) => sum + line.expectedQty, 0)

    setPickOrder(
      {
        ...latestPickOrder,
        status: 'COMPLETED',
        packedQty: totalPackedQty,
      },
      packedLines,
      orderSummary
    )
  }, [setPickOrder])

  const handleNextPackingTarget = useCallback(() => {
    clearPickOrder()
    setScanType(null)
    setModuleState(null)
    setCellCode(null)
    setOperationNotice(null)
    triggerFocusTaskNumber()
  }, [clearPickOrder, triggerFocusTaskNumber])

  // 创建模块实例
  const pickOrderModule = createPickOrderModule()
  const orderModule = createOrderModule()

  // 页面加载时清空数据
  useEffect(() => {
    clearPickOrder()
    setScanType(null)
    setModuleState(null)
    setCellCode(null)
  }, [clearPickOrder])

  const detectVideoServiceConnection = useCallback(async (showToast = false) => {
    setIsVideoServiceChecking(true)
    try {
      const connected = await checkPackVideoServiceConnection()
      setIsVideoServiceConnected(connected)
      if (showToast) {
        if (connected) {
          toast.success(t('video.connectionSuccess'))
        } else {
          toast.warning(t('video.serviceDisconnected'))
        }
      }
    } finally {
      setIsVideoServiceChecking(false)
    }
  }, [t])

  useEffect(() => {
    setIsVideoFeatureEnabled(getPackVideoEnabledPreference(true))
    void detectVideoServiceConnection()
  }, [detectVideoServiceConnection])

  const handleVideoFeatureSwitch = useCallback((checked: boolean) => {
    setIsVideoFeatureEnabled(checked)
    setPackVideoEnabledPreference(checked)
  }, [])

  // 构建模块上下文
  const buildModuleContext = useCallback((): PackingModuleContext | null => {
    if (!currentPickOrder) return null
    return {
      pickOrderId: currentPickOrder.id,
      taskNumber: currentPickOrder.taskNumber,
      taskType: currentPickOrder.taskType,
      warehouseId: currentPickOrder.warehouseId,
      warehouseName: currentPickOrder.warehouseName,
      orderBusinessType: currentPickOrder.orderBusinessType,
      packagingMaterials,
      isLoading: false,
      isSubmitting: isSubmitting,
      setIsLoading: () => {},
      setIsSubmitting,
      triggerFocusSku,
      triggerFocusMaterial,
      clearPackagingMaterials,
      t,
    }
  }, [currentPickOrder, packagingMaterials, isSubmitting, setIsSubmitting, triggerFocusSku, triggerFocusMaterial, clearPackagingMaterials, t])

  // 加载拣货单/订单
  const handlePickOrderLoaded = useCallback(async (taskNumber: string) => {
    setOperationNotice(null)
    const params = new URLSearchParams({ taskNumber })
    if (currentPickOrder?.warehouseId) {
      params.set('warehouseId', currentPickOrder.warehouseId)
    }
    const response = await fetch(`/api/v1/packing/lookup?${params}`)
    if (!response.ok) {
      const error = await response.json()
      const message = error.message || t('messages.pickOrderNotFound')
      setOperationNotice({
        type: 'error',
        title: t('notices.codeLoadFailed.title'),
        message,
      })
      throw new Error(message)
    }
    const data = await response.json()
    const { scanType: apiScanType, cellCode: apiCellCode, pickOrder, orderInfo, lines, summary, pendingCloseOrder } = data.data

    // 设置扫描类型
    setScanType(apiScanType as ScanType)
    setCellCode(apiCellCode || null)

    // 根据扫描类型初始化对应模块
    if (apiScanType === 'ORDER' && orderInfo) {
      // 订单模式
      const pickOrderBasic: PickOrderInfo = {
        id: pickOrder.id,
        taskNumber: pickOrder.taskNumber,
        taskType: pickOrder.taskType,
        status: pickOrder.status,
        orderBusinessType: pickOrder.orderBusinessType,
        totalLines: 0,
        totalQty: 0,
        totalOrders: 1,
        pickedQty: 0,
        packedQty: 0,
        warehouseId: pickOrder.warehouseId,
        warehouseName: pickOrder.warehouseName,
      }
      setPickOrder(pickOrderBasic, [], null)

      // 初始化订单模块状态
      const initialState = orderModule.getInitialState({
        orderId: orderInfo.orderId,
        orderNumber: orderInfo.orderNumber,
        totalExpected: orderInfo.totalExpected,
        totalPacked: orderInfo.totalPacked,
        isComplete: orderInfo.isComplete,
        lines: orderInfo.lines,
      })
      // 如果有待关箱订单，设置到状态中
      if (pendingCloseOrder) {
        initialState.pendingCloseOrder = pendingCloseOrder
      }
      setModuleState(initialState)

      // 自动开始打包
      if (pickOrder.status !== 'PACKING') {
        await fetch(`/api/v1/packing/${pickOrder.id}/start`, { method: 'POST' })
      }

      if (pendingCloseOrder) {
        toast.info(t('messages.orderPackedNeedClose', { orderNumber: pendingCloseOrder.orderNumber }))
        setOperationNotice({
          type: 'warning',
          title: t('notices.pendingClose.title'),
          message: t('notices.pendingClose.message', { orderNumber: pendingCloseOrder.orderNumber }),
        })
        triggerFocusMaterial()
      } else {
        triggerFocusSku()
      }
    } else {
      // 拣货单模式
      const pickOrderInfo: PickOrderInfo = {
        id: pickOrder.id,
        taskNumber: pickOrder.taskNumber,
        taskType: pickOrder.taskType,
        status: pickOrder.status,
        orderBusinessType: pickOrder.orderBusinessType,
        totalLines: pickOrder.totalLines,
        totalQty: pickOrder.totalQty,
        totalOrders: pickOrder.totalOrders,
        pickedQty: pickOrder.pickedQty,
        packedQty: pickOrder.packedQty,
        warehouseId: pickOrder.warehouseId,
        warehouseName: pickOrder.warehouseName,
      }

      const lineInfos: PickOrderLineInfo[] = lines.map((line: Record<string, unknown>) => ({
        id: line.id as string,
        lineNumber: line.lineNumber as number,
        skuId: line.skuId as string,
        skuCode: line.skuCode as string,
        skuName: line.skuName as string | null,
        barcode: line.barcode as string | null,
        locationCode: line.locationCode as string | null,
        expectedQty: line.expectedQty as number,
        pickedQty: line.pickedQty as number,
        packedQty: line.packedQty as number,
        status: line.status as string,
        orderId: line.orderId as string,
        orderNumber: line.orderNumber as string,
        orderType: line.orderType as string,
        channel: line.channel as string | null,
        batchNumber: line.batchNumber as string | null,
        expiryDate: line.expiryDate as string | null,
        isSerialManaged: line.isSerialManaged as boolean,
        isBatchManaged: line.isBatchManaged as boolean,
        isExpiryManaged: line.isExpiryManaged as boolean,
        isSelfPackaged: line.isSelfPackaged as boolean,
      }))

      const summaryInfo: OrderSummary = {
        orderType: summary.orderType,
        channel: summary.channel,
        skuCode: summary.skuCode,
        totalQty: summary.totalQty,
        unpackedQty: summary.unpackedQty,
      }

      setPickOrder(pickOrderInfo, lineInfos, summaryInfo)

      // 初始化拣货单模块状态
      const initialState = pickOrderModule.getInitialState()
      restorePickOrderReviewState(pickOrder.taskType, lineInfos, pickOrder.status, initialState)
      if (pendingCloseOrder) {
        initialState.pendingCloseOrder = pendingCloseOrder
        if (isSingleMultiHotPickOrderTaskType(pickOrder.taskType)) {
          initialState.pendingCompletePickOrder = true
          initialState.pendingCloseOrder = null
          initialState.reviewingOrder = null
          initialState.completedReviewOrder = pendingCloseOrder
        }
        if (!isSingleMultiHotPickOrderTaskType(pickOrder.taskType)) {
          toast.info(t('messages.orderPackedNeedClose', { orderNumber: pendingCloseOrder.orderNumber }))
          setOperationNotice({
            type: 'warning',
            title: t('notices.pendingClose.title'),
            message: t('notices.pendingClose.message', { orderNumber: pendingCloseOrder.orderNumber }),
          })
        }
      }
      setModuleState(initialState)

      // 自动开始打包
      if (pickOrder.status !== 'PACKING') {
        await fetch(`/api/v1/packing/${pickOrder.id}/start`, { method: 'POST' })
      }

      if (initialState.pendingCompletePickOrder) {
        triggerFocusMaterial()
      } else if (!pendingCloseOrder) {
        triggerFocusSku()
      } else {
        triggerFocusMaterial()
      }
    }
  }, [t, setPickOrder, triggerFocusSku, pickOrderModule, orderModule, currentPickOrder, setScanType, setCellCode, triggerFocusMaterial])

  // 扫描 SKU - 委托给对应模块处理
  const handleSkuScanned = useCallback(async (barcode: string, serialNumbers: string[] = []) => {
    if (!currentPickOrder || !scanType || !moduleState) return

    const context = buildModuleContext()
    if (!context) return

    let result
    if (scanType === 'ORDER') {
      const handlers = orderModule.createHandlers()
      result = await handlers.onSkuScanned(
        barcode,
        context,
        moduleState as OrderModuleState,
        (state) => setModuleState(state),
        serialNumbers
      )
    } else {
      const handlers = pickOrderModule.createHandlers(updateLinePackedQty, updatePickOrderTotals)
      result = await handlers.onSkuScanned(
        barcode,
        context,
        moduleState as PickOrderModuleState,
        (state) => setModuleState(state),
        serialNumbers
      )
    }

    // 检查是否需要序列号
    if (!result.success && result.requireSerialNumbers) {
      setOperationNotice({
        type: 'warning',
        title: t('notices.serialRequired.title'),
        message: result.message || t('notices.serialRequired.message'),
      })
      // 打开序列号扫描对话框
      setModuleState({
        ...moduleState,
        serialNumberDialog: {
          open: true,
          skuCode: barcode,
          skuName: null, // 可以从API返回中获取
          barcode,
          requiredQuantity: result.requiredQuantity || 1,
        },
      } as ModuleState)
      return
    }

    if (!result.success) {
      setOperationNotice({
        type: 'error',
        title: t('notices.scanFailed.title'),
        message: result.message || t('notices.scanFailed.message'),
      })
      throw new Error(result.message)
    }

    if (result.message) {
      toast.success(result.message)
      setOperationNotice(null)
    }

    if (
      scanType === 'PICK_ORDER'
      && result.orderId
      && result.orderNumber
      && !isFixedComboPickOrderTaskType(currentPickOrder.taskType)
      && !isSingleMultiHotPickOrderTaskType(currentPickOrder.taskType)
    ) {
      setSelectedOrder(buildSelectedOrderFromCurrentLines(result.orderId, result.orderNumber))
    }

    if (result.labelData || result.labelDataList) {
      const labels = result.labelDataList
        ? result.labelDataList as LabelData[]
        : result.labelData
          ? [result.labelData as LabelData]
          : []
      if (labels.length > 0) {
        setLabelDataList(labels)
      }
    }

    if (result.shouldClearPickOrder) {
      clearPickOrder()
      setScanType(null)
      setModuleState(null)
      setCellCode(null)
      triggerFocusTaskNumber()
      return
    }

    if (result.completedPickOrder) {
      markPickOrderCompleted()
      setOperationNotice({
        type: 'success',
        title: t('completedPickOrderReadyForNext'),
        message: t('completedPickOrderReadyForNextDesc'),
      })
      return
    }

    if (result.isOrderComplete) {
      toast.info(t('messages.orderPackedNeedClose', { orderNumber: result.orderNumber || '' }))
      setOperationNotice({
        type: 'warning',
        title: t('notices.orderPacked.title'),
        message: t('notices.orderPacked.message', { orderNumber: result.orderNumber || '' }),
      })
    }
  }, [t, currentPickOrder, scanType, moduleState, buildModuleContext, orderModule, pickOrderModule, updateLinePackedQty, updatePickOrderTotals, clearPickOrder, markPickOrderCompleted, triggerFocusTaskNumber, setSelectedOrder, buildSelectedOrderFromCurrentLines])

  // 关箱 - 委托给对应模块处理
  const handleCloseBox = useCallback(async (payload?: { weight?: number }) => {
    if (!currentPickOrder || !scanType || !moduleState) return

    const context = buildModuleContext()
    if (!context) return

    setIsSubmittingLocal(true)
    setIsSubmitting(true)

    try {
      let result
      if (scanType === 'ORDER') {
        const handlers = orderModule.createHandlers()
        result = await handlers.onCloseBox(
          context,
          moduleState as OrderModuleState,
          (state) => setModuleState(state),
          payload
        )
      } else {
        const handlers = pickOrderModule.createHandlers(updateLinePackedQty, updatePickOrderTotals)
        result = await handlers.onCloseBox(
          context,
          moduleState as PickOrderModuleState,
          (state) => setModuleState(state),
          payload
        )
      }

      if (!result.success) {
        toast.error(result.message)
        setOperationNotice({
          type: 'error',
          title: t('notices.submitFailed.title'),
          message: result.message || t('notices.submitFailed.message'),
        })
        return
      }

      setOperationNotice(null)

      // 设置标签数据
      const labels = result.labelDataList
        ? result.labelDataList as LabelData[]
        : result.labelData
          ? [result.labelData as LabelData]
          : []
      if (labels.length > 0) {
        setLabelDataList(labels)
      }

      if (result.videoWindows && result.videoWindows.length > 0 && isVideoFeatureEnabled) {
        if (!isVideoServiceConnected) {
          toast.warning(t('video.serviceUnavailableSkip'))
          setOperationNotice({
            type: 'warning',
            title: t('video.serviceDisconnected'),
            message: t('video.generationSkipped'),
          })
        } else {
          void triggerPackVideoGeneration(result.videoWindows).then((summary) => {
            if (summary.failed > 0) {
              toast.warning(t('video.generationFailedToast', { count: summary.failed }))
              setOperationNotice({
                type: 'warning',
                title: t('video.generationFailedTitle'),
                message: t('video.generationFailedMessage', { count: summary.failed }),
              })
            }
          }).catch(() => {
            toast.warning(t('video.submitFailedToast'))
            setOperationNotice({
              type: 'warning',
              title: t('video.submitFailedTitle'),
              message: t('video.submitFailedMessage'),
            })
          })
        }
      }

      if (result.completedPickOrder && !result.shouldClearPickOrder) {
        keepCompletedPickOrderVisible()
      }

      // 拣货单全部完成，清除状态回到初始页面
      if (result.shouldClearPickOrder) {
        clearPickOrder()
        setScanType(null)
        setModuleState(null)
        setCellCode(null)
        triggerFocusTaskNumber()
        return
      }

      // 拣货单模式需要重新加载
      if (result.shouldReload) {
        await handlePickOrderLoaded(currentPickOrder.taskNumber)
      } else if (result.completedOrder) {
        // 订单模式完成后保留订单信息显示，等待扫描下一单
        // 不调用 clearPickOrder()，保持右侧订单明细可见
        setModuleState({
          ...(moduleState as OrderModuleState),
          isComplete: true,
          pendingCloseOrder: null,
        })
      }
    } finally {
      setIsSubmittingLocal(false)
      setIsSubmitting(false)
    }
  }, [t, currentPickOrder, scanType, moduleState, buildModuleContext, orderModule, pickOrderModule, updateLinePackedQty, updatePickOrderTotals, setIsSubmitting, handlePickOrderLoaded, clearPickOrder, triggerFocusTaskNumber, keepCompletedPickOrderVisible, isVideoFeatureEnabled, isVideoServiceConnected])

  // 序列号扫描完成
  const handleSerialScanConfirm = useCallback((scannedSerials: string[]) => {
    setSerialNumbers(scannedSerials)
    setShowSerialDialog(false)
  }, [setSerialNumbers, setShowSerialDialog])

  // 渲染模块内容区域
  const renderModuleContent = () => {
    if (!currentPickOrder || !scanType || !moduleState) return null

    if (scanType === 'ORDER') {
      return orderModule.renderContent({
        context: buildModuleContext()!,
        moduleState: moduleState as OrderModuleState,
        setModuleState: (state: OrderModuleState) => setModuleState(state),
      })
    }

    return pickOrderModule.renderContent({
      context: buildModuleContext()!,
      moduleState: moduleState as PickOrderModuleState,
      setModuleState: (state: PickOrderModuleState) => setModuleState(state),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { label: tMenuGroup('outbound'), href: '/orders' },
            { label: t('title') },
          ]}
        />
        <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isVideoServiceChecking
                ? 'bg-muted-foreground/50'
                : isVideoServiceConnected
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
            }`}
          />
          <span className="text-muted-foreground">{t('video.label')}</span>
          <span className="text-muted-foreground">
            {isVideoServiceChecking ? t('video.checking') : isVideoServiceConnected ? t('video.connected') : t('video.disconnected')}
          </span>
          <Switch
            checked={isVideoFeatureEnabled}
            onCheckedChange={handleVideoFeatureSwitch}
            disabled={!isVideoServiceConnected}
            className="scale-90"
            aria-label={t('video.switchAriaLabel')}
          />
          <span className="text-muted-foreground">
            {isVideoFeatureEnabled ? t('video.enabled') : t('video.disabled')}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={isVideoServiceChecking}
            onClick={() => { void detectVideoServiceConnection(true) }}
          >
            {t('video.check')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧扫描区 - 根据模式显示不同面板 */}
        <div className="lg:col-span-1 space-y-4">
          {scanType === 'ORDER' ? (
            <OrderPackingScanPanel
              onOrderLoaded={handlePickOrderLoaded}
              onSkuScanned={handleSkuScanned}
              onCloseBox={handleCloseBox}
              moduleState={moduleState as OrderModuleState | null}
              isSubmitting={isSubmitting}
              initialOrderNumber={(moduleState as OrderModuleState | null)?.orderNumber}
              cellCode={cellCode}
              onOperationNotice={setOperationNotice}
            />
          ) : (
            <PickOrderPackingScanPanel
              onPickOrderLoaded={handlePickOrderLoaded}
              onSkuScanned={handleSkuScanned}
              onCloseBox={handleCloseBox}
              onNextTarget={handleNextPackingTarget}
              moduleState={moduleState as PickOrderModuleState | null}
              isSubmitting={isSubmitting}
              onOperationNotice={setOperationNotice}
            />
          )}
          <OperationNoticeBanner
            notice={operationNotice}
            onClose={() => setOperationNotice(null)}
          />
        </div>

        {/* 右侧详情区 */}
        {renderModuleContent()}
      </div>

      {/* 序列号扫描弹窗 - 打包专用 */}
      {moduleState && 'serialNumberDialog' in moduleState && moduleState.serialNumberDialog?.open && (
        <SerialNumberScanDialog
          open={moduleState.serialNumberDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              // 对话框关闭时，清除状态并聚焦到 SKU 输入框
              // 使用函数式更新，确保基于最新状态修改
              setModuleState((prevState) => ({
                ...prevState,
                serialNumberDialog: null,
              } as ModuleState))
              // 聚焦到 SKU 输入框，让用户可以重新扫描
              triggerFocusSku()
            }
          }}
          skuCode={moduleState.serialNumberDialog.skuCode}
          skuName={moduleState.serialNumberDialog.skuName}
          requiredQuantity={moduleState.serialNumberDialog.requiredQuantity}
          onConfirm={async (serialNumbers) => {
            const barcode = moduleState.serialNumberDialog!.barcode

            // 重新调用扫描，这次带上序列号
            try {
              await handleSkuScanned(barcode, serialNumbers)
              // 扫描成功后，关闭对话框，聚焦逻辑已在模块内部处理
              // 使用函数式更新，确保基于最新状态修改，避免覆盖 pendingCloseOrder
              setModuleState((prevState) => ({
                ...prevState,
                serialNumberDialog: null,
              } as ModuleState))
            } catch (error) {
              // 显示错误消息
              const errorMessage = error instanceof Error ? error.message : t('errors.serialScanFailed')
              toast.error(errorMessage)
              setOperationNotice({
                type: 'error',
                title: t('notices.serialScanFailed.title'),
                message: errorMessage,
              })

              // 保持对话框打开，让用户可以重新扫描
              // 不关闭对话框，用户可以修改序列号后重试
              console.error(t('logs.serialScanFailed'), error)
            }
          }}
        />
      )}

      {/* 序列号扫描弹窗 - 收货复用 */}
      {currentItem && currentItem.sku.isSerialManaged && (
        <SerialScanDialog
          open={showSerialDialog}
          skuCode={currentItem.sku.skuCode}
          skuName={currentItem.sku.skuName || ''}
          requiredCount={quantity}
          initialSerialNumbers={serialNumbers}
          onConfirm={handleSerialScanConfirm}
          onCancel={() => setShowSerialDialog(false)}
        />
      )}

      {/* 发货标签打印 */}
      <ShipmentLabelPrint
        labelData={labelDataList}
        onPrintComplete={() => setLabelDataList(null)}
      />
    </div>
  )
}
