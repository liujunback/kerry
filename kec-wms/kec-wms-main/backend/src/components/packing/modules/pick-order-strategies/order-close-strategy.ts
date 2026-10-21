'use client'

import type { PickOrderPackingStrategy } from './types'

type OrderCloseStrategyType = 'ORDER_CLOSE' | 'SINGLE_ONE_NORMAL'

export function createOrderClosePickOrderStrategy(type: OrderCloseStrategyType): PickOrderPackingStrategy {
  return {
    type,
    submitMode: 'ORDER',
    requiresWeight: false,
    showsFixedComboSummary: false,
    clearPickOrderAfterSubmit: false,
    getScanOrderId: () => undefined,
    getFlowDescription: () => null,
    getInstruction: () => null,
    getSubmitReadyTitle: (_moduleState, t) => t('strategy.orderClose.submitReadyTitle'),
    getSubmitReadyDescription: (t) => t('strategy.orderClose.submitReadyDescription'),
    getSubmitDisabledReason: ({ moduleState, hasPackagingMaterials, t }) => {
      if (!moduleState?.pendingCloseOrder) return t('errors.noPendingCloseOrder')
      if (!hasPackagingMaterials) return t('errors.selectMaterial')
      return null
    },
    buildSubmitPayload: () => undefined,
    validateBeforeSubmit: ({ context, moduleState }) => {
      if (!moduleState.pendingCloseOrder) return context.t('errors.noPendingCloseOrder')
      if (context.packagingMaterials.length === 0) return context.t('errors.selectMaterial')
      return null
    },
    handleSkuScanned: async ({ context, moduleState, setModuleState, scanResult }) => {
      if (scanResult.isOrderComplete) {
        setModuleState({
          ...moduleState,
          pendingCloseOrder: scanResult.orderId && scanResult.orderNumber
            ? {
                orderId: scanResult.orderId,
                orderNumber: scanResult.orderNumber,
              }
            : null,
          pendingCompletePickOrder: false,
          reviewingOrder: null,
          completedReviewOrder: null,
          serialNumberDialog: null,
        })
        context.triggerFocusMaterial()
        return {
          success: true,
          message: context.t('messages.skuPacked', { skuCode: scanResult.skuCode }),
          isOrderComplete: true,
          orderId: scanResult.orderId,
          orderNumber: scanResult.orderNumber,
        }
      }

      context.triggerFocusSku()

      return {
        success: true,
        message: context.t('messages.skuPacked', { skuCode: scanResult.skuCode }),
      }
    },
  }
}

export const orderClosePickOrderStrategy = createOrderClosePickOrderStrategy('ORDER_CLOSE')
