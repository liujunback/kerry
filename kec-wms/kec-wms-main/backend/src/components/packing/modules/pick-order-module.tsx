'use client'

import { toast } from 'sonner'
import type {
  PackingModule,
  PackingModuleContext,
  SkuScanResult,
  CloseBoxResult,
  CloseBoxPayload,
} from './types'
import { PickOrderHeaderCard } from '../pick-order-header-card'
import { PackingDetailPanel } from '../packing-detail-panel'
import { getPickOrderPackingStrategy } from './pick-order-strategies'

export interface PickOrderModuleState {
  pendingCloseOrder: { orderId: string; orderNumber: string } | null
  pendingCompletePickOrder: boolean
  reviewingOrder: { orderId: string; orderNumber: string } | null
  completedReviewOrder: { orderId: string; orderNumber: string } | null
  serialNumberDialog: {
    open: boolean
    skuCode: string
    skuName: string | null
    barcode: string
    requiredQuantity: number
  } | null
}

async function completePickOrder(
  context: PackingModuleContext,
  payload?: CloseBoxPayload
): Promise<CloseBoxResult> {
  const response = await fetch(`/api/v1/packing/${context.pickOrderId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packagingMaterials: context.packagingMaterials.map((m) => ({
        materialId: m.materialId,
        quantity: m.quantity,
      })),
      weight: payload?.weight,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, message: error.message || context.t('errors.submitPickOrderPackingFailed') }
  }

  const data = await response.json()
  return {
    success: true,
    labelData: data.data?.labelData,
    labelDataList: data.data?.labelDataList,
    videoWindows: data.data?.videoWindows,
    shouldClearPickOrder: true,
  }
}

async function onSkuScanned(
  barcode: string,
  context: PackingModuleContext,
  moduleState: PickOrderModuleState,
  setModuleState: (state: PickOrderModuleState) => void,
  updateLinePackedQty: (lineId: string, packedQty: number) => void,
  updatePickOrderTotals: (packedQty: number) => void,
  serialNumbers: string[] = []
): Promise<SkuScanResult> {
  if (moduleState.pendingCompletePickOrder) {
    return {
      success: false,
      message: context.t('errors.pickOrderReadySubmitFirst'),
    }
  }

  if (moduleState.pendingCloseOrder) {
    return {
      success: false,
      message: context.t('errors.orderNotClosed', { orderNumber: moduleState.pendingCloseOrder.orderNumber }),
    }
  }

  const strategy = getPickOrderPackingStrategy(context.taskType)
  const scanOrderId = strategy.getScanOrderId(moduleState)
  const response = await fetch(`/api/v1/packing/${context.pickOrderId}/scan-sku`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      barcode,
      quantity: 1,
      serialNumbers,
      ...(scanOrderId ? { orderId: scanOrderId } : {}),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    if (error.message && error.message.includes('需要扫描')) {
      const match = error.message.match(/需要扫描 (\d+) 个序列号/)
      const requiredQuantity = match ? parseInt(match[1]) : 1

      return {
        success: false,
        message: error.message,
        requireSerialNumbers: true,
        requiredQuantity,
      }
    }

    const message = scanOrderId && error.message === '该SKU已全部打包完成'
      ? context.t('errors.reviewOrderSkuComplete')
      : error.message || context.t('errors.skuNotInPickOrder')

    return {
      success: false,
      message,
    }
  }

  const data = await response.json()
  const result = data.data

  if (!result.validatedOnly && result.lineId) {
    updateLinePackedQty(result.lineId, result.packedQty)
    updatePickOrderTotals(1)
  }

  return strategy.handleSkuScanned({
    context,
    moduleState,
    setModuleState,
    scanResult: result,
    completePickOrder,
  })
}

async function onCloseBox(
  context: PackingModuleContext,
  moduleState: PickOrderModuleState,
  setModuleState: (state: PickOrderModuleState) => void,
  payload?: CloseBoxPayload
): Promise<CloseBoxResult> {
  const strategy = getPickOrderPackingStrategy(context.taskType)
  const validationMessage = strategy.validateBeforeSubmit({ context, moduleState, payload })
  if (validationMessage) {
    return { success: false, message: validationMessage }
  }

  if (strategy.submitMode === 'PICK_ORDER') {
    const result = await completePickOrder(context, payload)
    if (!result.success) {
      return result
    }

    setModuleState({
      ...moduleState,
      pendingCompletePickOrder: false,
      pendingCloseOrder: null,
      reviewingOrder: null,
      completedReviewOrder: null,
    })
    context.clearPackagingMaterials()

    toast.success(context.t('messages.pickOrderPacked', { taskNumber: context.taskNumber }))
    return {
      ...result,
      completedPickOrder: true,
      shouldClearPickOrder: strategy.clearPickOrderAfterSubmit,
    }
  }

  const pendingCloseOrder = moduleState.pendingCloseOrder
  if (!pendingCloseOrder) {
    return { success: false, message: context.t('errors.noPendingCloseOrder') }
  }

  const response = await fetch(`/api/v1/packing/${context.pickOrderId}/complete-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: pendingCloseOrder.orderId,
      packagingMaterials: context.packagingMaterials.map((m) => ({
        materialId: m.materialId,
        quantity: m.quantity,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, message: error.message || context.t('errors.closeBoxFailed') }
  }

  const data = await response.json()
  const orderNumber = pendingCloseOrder.orderNumber
  const isPickOrderComplete = data.data?.isPickOrderComplete

  setModuleState({
    ...moduleState,
    pendingCloseOrder: null,
    pendingCompletePickOrder: false,
    reviewingOrder: null,
    completedReviewOrder: null,
  })
  context.clearPackagingMaterials()

  toast.success(context.t('messages.orderClosed', { orderNumber }))

  if (isPickOrderComplete) {
    toast.info(context.t('messages.pickOrderAllPacked'))
    return {
      success: true,
      labelData: data.data?.labelData,
      videoWindows: data.data?.videoWindow ? [data.data.videoWindow] : [],
      shouldClearPickOrder: true,
    }
  }

  context.triggerFocusSku()

  return {
    success: true,
    labelData: data.data?.labelData,
    videoWindows: data.data?.videoWindow ? [data.data.videoWindow] : [],
    shouldReload: true,
  }
}

function PickOrderScanInfo() {
  return null
}

function PickOrderContent() {
  return (
    <div className="lg:col-span-2 space-y-4">
      <PickOrderHeaderCard />
      <PackingDetailPanel />
    </div>
  )
}

export function createPickOrderModule(): PackingModule & {
  getInitialState: () => PickOrderModuleState
  createHandlers: (
    updateLinePackedQty: (lineId: string, packedQty: number) => void,
    updatePickOrderTotals: (packedQty: number) => void
  ) => {
    onSkuScanned: (barcode: string, context: PackingModuleContext, moduleState: PickOrderModuleState, setModuleState: (state: PickOrderModuleState) => void, serialNumbers?: string[]) => Promise<SkuScanResult>
    onCloseBox: (context: PackingModuleContext, moduleState: PickOrderModuleState, setModuleState: (state: PickOrderModuleState) => void, payload?: CloseBoxPayload) => Promise<CloseBoxResult>
  }
} {
  return {
    type: 'PICK_ORDER',
    displayName: 'PICK_ORDER',

    getInitialState: () => ({
      pendingCloseOrder: null,
      pendingCompletePickOrder: false,
      reviewingOrder: null,
      completedReviewOrder: null,
      serialNumberDialog: null,
    }),

    createHandlers: (updateLinePackedQty, updatePickOrderTotals) => ({
      onSkuScanned: (barcode, context, moduleState, setModuleState, serialNumbers = []) =>
        onSkuScanned(barcode, context, moduleState, setModuleState, updateLinePackedQty, updatePickOrderTotals, serialNumbers),
      onCloseBox: (context, moduleState, setModuleState, payload) =>
        onCloseBox(context, moduleState, setModuleState, payload),
    }),

    onSkuScanned: async (_barcode, context) => ({ success: false, message: context.t('errors.useCreateHandlers') }),
    onCloseBox: async (context) => ({ success: false, message: context.t('errors.useCreateHandlers') }),

    renderContent: () => <PickOrderContent />,
    renderScanInfo: () => (
      <PickOrderScanInfo />
    ),
  }
}

export const pickOrderModule = createPickOrderModule()
