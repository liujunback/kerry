'use client'

import type { PickOrderPackingStrategy } from './types'

export const singleMultiHotPickOrderStrategy: PickOrderPackingStrategy = {
  type: 'SINGLE_MULTI_HOT',
  submitMode: 'PICK_ORDER',
  requiresWeight: false,
  showsFixedComboSummary: true,
  showsReviewSummary: true,
  clearPickOrderAfterSubmit: false,
  getScanOrderId: (moduleState) => moduleState.reviewingOrder?.orderId,
  getFlowDescription: (t) => t('strategy.singleMultiHot.flowDescription'),
  getInstruction: (t) => t('strategy.singleMultiHot.instruction'),
  getSubmitReadyTitle: (moduleState, t) => (
    moduleState.completedReviewOrder
      ? t('strategy.singleMultiHot.reviewedOrderTitle', { orderNumber: moduleState.completedReviewOrder.orderNumber })
      : t('strategy.singleMultiHot.reviewedGroupTitle')
  ),
  getSubmitReadyDescription: (t) => t('strategy.singleMultiHot.submitReadyDescription'),
  getSubmitDisabledReason: ({ moduleState, hasPackagingMaterials, fixedComboConsistent, t }) => {
    if (!fixedComboConsistent) return t('errors.singleMultiHotQuantityInconsistent')
    if (!moduleState?.pendingCompletePickOrder) return t('errors.singleMultiHotNotReady')
    if (!hasPackagingMaterials) return t('errors.selectMaterial')
    return null
  },
  buildSubmitPayload: () => undefined,
  validateBeforeSubmit: ({ context, moduleState }) => {
    if (!moduleState.pendingCompletePickOrder) return context.t('errors.singleMultiHotNotReady')
    if (context.packagingMaterials.length === 0) return context.t('errors.selectMaterial')
    return null
  },
  handleSkuScanned: async ({ context, moduleState, setModuleState, scanResult }) => {
    if (scanResult.isOrderComplete) {
      const reviewedOrder = scanResult.orderId && scanResult.orderNumber
        ? {
            orderId: scanResult.orderId,
            orderNumber: scanResult.orderNumber,
          }
        : moduleState.reviewingOrder

      setModuleState({
        ...moduleState,
        pendingCompletePickOrder: true,
        pendingCloseOrder: null,
        reviewingOrder: null,
        completedReviewOrder: reviewedOrder,
        serialNumberDialog: null,
      })
      context.triggerFocusMaterial()

      return {
        success: true,
        message: reviewedOrder
          ? context.t('messages.singleMultiHotReviewed', { orderNumber: reviewedOrder.orderNumber })
          : context.t('messages.skuPacked', { skuCode: scanResult.skuCode }),
      }
    }

    const reviewingOrder = moduleState.reviewingOrder || (
      scanResult.orderId && scanResult.orderNumber
        ? {
            orderId: scanResult.orderId,
            orderNumber: scanResult.orderNumber,
          }
        : null
    )

    setModuleState({
      ...moduleState,
      reviewingOrder,
      pendingCloseOrder: null,
      pendingCompletePickOrder: false,
      completedReviewOrder: null,
      serialNumberDialog: null,
    })
    context.triggerFocusSku()

    return {
      success: true,
      message: reviewingOrder
        ? context.t('messages.singleMultiHotReviewing', {
            orderNumber: reviewingOrder.orderNumber,
            skuCode: scanResult.skuCode,
          })
        : context.t('messages.skuScanned', { skuCode: scanResult.skuCode }),
    }
  },
}
