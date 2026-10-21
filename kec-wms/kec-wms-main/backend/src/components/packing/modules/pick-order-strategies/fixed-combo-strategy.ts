'use client'

import type { PickOrderPackingStrategy } from './types'

function parsePositiveWeight(weightInput: string) {
  const weight = weightInput.trim() ? Number(weightInput) : undefined
  return weight && !Number.isNaN(weight) && weight > 0 ? weight : undefined
}

export const fixedComboPickOrderStrategy: PickOrderPackingStrategy = {
  type: 'FIXED_COMBO',
  submitMode: 'PICK_ORDER',
  requiresWeight: true,
  showsFixedComboSummary: true,
  clearPickOrderAfterSubmit: false,
  getScanOrderId: (moduleState) => moduleState.reviewingOrder?.orderId,
  getFlowDescription: (t) => t('strategy.fixedCombo.flowDescription'),
  getInstruction: (t) => t('strategy.fixedCombo.instruction'),
  getSubmitReadyTitle: (moduleState, t) => (
    moduleState.completedReviewOrder
      ? t('strategy.fixedCombo.reviewedOrderTitle', { orderNumber: moduleState.completedReviewOrder.orderNumber })
      : t('strategy.fixedCombo.reviewedGroupTitle')
  ),
  getSubmitReadyDescription: (t) => t('strategy.fixedCombo.submitReadyDescription'),
  getSubmitDisabledReason: ({ moduleState, hasPackagingMaterials, fixedComboConsistent, weightInput, t }) => {
    if (!fixedComboConsistent) return t('errors.comboInconsistent')
    if (!moduleState?.pendingCompletePickOrder) return t('errors.fixedComboNotReady')
    if (!hasPackagingMaterials) return t('errors.selectMaterial')
    if (!parsePositiveWeight(weightInput)) return t('errors.invalidWeight')
    return null
  },
  buildSubmitPayload: (weightInput) => ({ weight: parsePositiveWeight(weightInput) }),
  validateBeforeSubmit: ({ context, moduleState, payload }) => {
    if (!moduleState.pendingCompletePickOrder) return context.t('errors.fixedComboNotReady')
    if (context.packagingMaterials.length === 0) return context.t('errors.selectMaterial')
    if (!payload?.weight || Number.isNaN(payload.weight) || payload.weight <= 0) return context.t('errors.packageWeightRequired')
    return null
  },
  handleSkuScanned: async ({ context, moduleState, setModuleState, scanResult }) => {
    if (scanResult.isOrderComplete) {
      setModuleState({
        ...moduleState,
        pendingCompletePickOrder: true,
        pendingCloseOrder: null,
        reviewingOrder: null,
        completedReviewOrder: scanResult.orderId && scanResult.orderNumber
          ? {
              orderId: scanResult.orderId,
              orderNumber: scanResult.orderNumber,
            }
          : null,
        serialNumberDialog: null,
      })
      context.triggerFocusMaterial()

      return {
        success: true,
        message: context.t('messages.fixedComboReviewed', { orderNumber: scanResult.orderNumber || '' }),
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
      pendingCompletePickOrder: false,
      pendingCloseOrder: null,
      completedReviewOrder: null,
      serialNumberDialog: null,
    })
    context.triggerFocusSku()
    return {
      success: true,
      message: reviewingOrder
        ? context.t('messages.fixedComboReviewing', {
            orderNumber: reviewingOrder.orderNumber,
            skuCode: scanResult.skuCode,
          })
        : context.t('messages.skuScanned', { skuCode: scanResult.skuCode }),
    }
  },
}
