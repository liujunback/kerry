'use client'

import type {
  CloseBoxPayload,
  CloseBoxResult,
  PackingModuleContext,
  PackingTranslator,
  SkuScanResult,
} from '../types'
import type { PickOrderModuleState } from '../pick-order-module'

export interface PickOrderScanApiResult {
  validatedOnly?: boolean
  lineId?: string
  skuCode: string
  skuName?: string | null
  isSelfPackaged?: boolean
  isOrderComplete?: boolean
  isPickOrderComplete?: boolean
  orderId?: string
  orderNumber?: string
  packedQty?: number
}

export interface PickOrderStrategySubmitContext {
  context: PackingModuleContext
  moduleState: PickOrderModuleState
  payload?: CloseBoxPayload
}

export interface PickOrderStrategyUiContext {
  moduleState: PickOrderModuleState | null
  hasPackagingMaterials: boolean
  fixedComboConsistent: boolean
  weightInput: string
  t: PackingTranslator
}

export interface PickOrderStrategyScanContext {
  context: PackingModuleContext
  moduleState: PickOrderModuleState
  setModuleState: (state: PickOrderModuleState) => void
  scanResult: PickOrderScanApiResult
  completePickOrder: (context: PackingModuleContext, payload?: CloseBoxPayload) => Promise<CloseBoxResult>
}

export interface PickOrderPackingStrategy {
  type: 'SINGLE_ONE' | 'SINGLE_ONE_NORMAL' | 'SINGLE_MULTI_HOT' | 'FIXED_COMBO' | 'ORDER_CLOSE'
  submitMode: 'PICK_ORDER' | 'ORDER'
  requiresWeight: boolean
  showsFixedComboSummary: boolean
  showsReviewSummary?: boolean
  clearPickOrderAfterSubmit: boolean
  getScanOrderId: (moduleState: PickOrderModuleState) => string | undefined
  getFlowDescription: (t: PackingTranslator) => string | null
  getInstruction: (t: PackingTranslator) => string | null
  getSubmitReadyTitle: (moduleState: PickOrderModuleState, t: PackingTranslator) => string
  getSubmitReadyDescription: (t: PackingTranslator) => string
  getSubmitDisabledReason: (context: PickOrderStrategyUiContext) => string | null
  buildSubmitPayload: (weightInput: string) => CloseBoxPayload | undefined
  validateBeforeSubmit: (context: PickOrderStrategySubmitContext) => string | null
  handleSkuScanned: (context: PickOrderStrategyScanContext) => Promise<SkuScanResult>
}
