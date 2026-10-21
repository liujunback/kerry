import { ReactNode } from 'react'

export type PackingTranslator = (key: string, values?: Record<string, string | number>) => string

export type ScanType = 'PICK_ORDER' | 'ORDER'

export interface PackingModuleContext {
  pickOrderId: string
  taskNumber: string
  taskType: string
  warehouseId: string
  warehouseName: string
  orderBusinessType: string
  packagingMaterials: Array<{ materialId: string; materialCode: string; materialName: string; quantity: number }>
  isLoading: boolean
  isSubmitting: boolean
  setIsLoading: (loading: boolean) => void
  setIsSubmitting: (submitting: boolean) => void
  triggerFocusSku: () => void
  triggerFocusMaterial: () => void
  clearPackagingMaterials: () => void
  t: PackingTranslator
}

export interface PackingModule {
  type: ScanType
  displayName: string
  onSkuScanned: (barcode: string, context: PackingModuleContext) => Promise<SkuScanResult>
  onCloseBox: (context: PackingModuleContext, payload?: CloseBoxPayload) => Promise<CloseBoxResult>
  renderContent: (props: ModuleContentProps) => ReactNode
  renderScanInfo?: (props: ModuleScanInfoProps) => ReactNode
}

export interface SkuScanResult {
  success: boolean
  message?: string
  isOrderComplete?: boolean
  isPickOrderComplete?: boolean
  completedPickOrder?: boolean
  shouldClearPickOrder?: boolean
  orderId?: string
  orderNumber?: string
  labelData?: unknown
  labelDataList?: unknown[]
  updatedData?: Record<string, unknown>
  requireSerialNumbers?: boolean
  requiredQuantity?: number
  validatedOnly?: boolean
  isSelfPackaged?: boolean
}

export interface CloseBoxResult {
  success: boolean
  message?: string
  labelData?: unknown
  labelDataList?: unknown[]
  videoWindows?: PackingVideoWindow[]
  shouldReload?: boolean
  shouldClearPickOrder?: boolean
  completedPickOrder?: boolean
  completedOrder?: {
    orderId: string
    orderNumber: string
    totalExpected: number
    totalPacked: number
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModuleContentProps<T = any> {
  context: PackingModuleContext
  moduleState: T
  setModuleState: (state: T) => void
}

export interface CloseBoxPayload {
  weight?: number
}

export interface PackingVideoWindow {
  orderId: string
  startTime: string
  endTime: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModuleScanInfoProps<T = any> {
  moduleState: T
}
