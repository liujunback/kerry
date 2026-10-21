'use client'

import type { PickOrderPackingStrategy } from './types'

export const singleOnePickOrderStrategy: PickOrderPackingStrategy = {
  type: 'SINGLE_ONE',
  submitMode: 'PICK_ORDER',
  requiresWeight: false,
  showsFixedComboSummary: false,
  clearPickOrderAfterSubmit: false,
  getScanOrderId: () => undefined,
  getFlowDescription: (t) => t('strategy.singleOne.flowDescription'),
  getInstruction: () => null,
  getSubmitReadyTitle: (_moduleState, t) => t('strategy.singleOne.submitReadyTitle'),
  getSubmitReadyDescription: (t) => t('strategy.singleOne.submitReadyDescription'),
  getSubmitDisabledReason: ({ moduleState, hasPackagingMaterials, t }) => {
    if (!moduleState?.pendingCompletePickOrder) return t('errors.pickOrderNotReadyToSubmit')
    if (!hasPackagingMaterials) return t('errors.selectMaterial')
    return null
  },
  buildSubmitPayload: () => undefined,
  validateBeforeSubmit: ({ context, moduleState }) => {
    if (!moduleState.pendingCompletePickOrder) return context.t('errors.pickOrderNotReadyToSubmit')
    if (context.packagingMaterials.length === 0) return context.t('errors.selectMaterial')
    return null
  },
  handleSkuScanned: async ({ context, moduleState, setModuleState, scanResult, completePickOrder }) => {
    if (scanResult.isSelfPackaged) {
      const completeResult = await completePickOrder(context)
      if (!completeResult.success) {
        return {
          success: false,
          message: completeResult.message || context.t('errors.completePickOrderFailed'),
        }
      }

      return {
        success: true,
        message: context.t('messages.oneClickPacked', { taskNumber: context.taskNumber }),
        completedPickOrder: true,
        shouldClearPickOrder: false,
        labelData: completeResult.labelData,
        labelDataList: completeResult.labelDataList,
      }
    }

    setModuleState({
      ...moduleState,
      pendingCompletePickOrder: true,
      pendingCloseOrder: null,
      reviewingOrder: null,
      completedReviewOrder: null,
      serialNumberDialog: null,
    })
    context.triggerFocusMaterial()

    return {
      success: true,
      message: context.t('messages.skuValidatedSelectMaterial'),
    }
  },
}
