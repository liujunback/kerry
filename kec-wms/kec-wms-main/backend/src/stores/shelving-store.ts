import { create } from 'zustand'

// 容器信息类型定义
export interface ContainerInfo {
  id: string
  containerCode: string
  containerType: string
  workStatus: string
  warehouseId: string
}

// 容器物品类型定义
export interface ContainerItemInfo {
  id: string
  skuId: string
  skuCode: string
  skuName: string | null
  barcode: string | null
  quantity: number
  availableQty: number
  batchNumber: string | null
  qualityStatus: string
  isSerialManaged: boolean
  serialNumbers: string[]
}

// 货位信息类型定义
export interface LocationInfo {
  id: string
  locationCode: string
  zoneId: string
  zoneName: string | null
  zoneQualityType?: string
  locationType: string | null
  isReceivable: boolean
  status: string
}

// SKU信息类型定义
export interface SkuInfo {
  id: string
  skuCode: string
  skuName: string | null
  barcode: string | null
  isSerialManaged: boolean
}

// 上架记录类型定义
export interface ShelvingRecord {
  id: string
  skuCode: string
  skuName: string | null
  locationCode: string
  quantity: number
  serialNumbers: string[]
  createdAt: string
}

// 上架状态
interface ShelvingState {
  // 容器相关
  currentContainer: ContainerInfo | null
  containerItems: ContainerItemInfo[]

  // 货位相关
  currentLocation: LocationInfo | null

  // 当前上架项
  currentSku: SkuInfo | null
  quantity: number
  maxQuantity: number

  // 序列号相关
  serialNumbers: string[]
  availableSerialNumbers: string[]

  // 上架记录
  shelvingRecords: ShelvingRecord[]

  // UI状态
  isLoading: boolean
  isSubmitting: boolean
  showSerialScanDialog: boolean

  // Actions
  setContainer: (container: ContainerInfo, items: ContainerItemInfo[]) => void
  clearContainer: () => void
  setLocation: (location: LocationInfo) => void
  clearLocation: () => void
  setCurrentSku: (sku: SkuInfo, maxQty: number, availableSerials?: string[]) => void
  clearCurrentSku: () => void
  setQuantity: (qty: number) => void
  incrementQuantity: (delta: number) => void
  setSerialNumbers: (serials: string[]) => void
  addSerialNumber: (serial: string) => void
  removeSerialNumber: (serial: string) => void
  setShowSerialScanDialog: (show: boolean) => void
  addShelvingRecord: (record: ShelvingRecord) => void
  resetCurrentItem: () => void
  setIsLoading: (loading: boolean) => void
  setIsSubmitting: (submitting: boolean) => void
  reset: () => void
}

const initialState = {
  currentContainer: null,
  containerItems: [],
  currentLocation: null,
  currentSku: null,
  quantity: 0,
  maxQuantity: 0,
  serialNumbers: [],
  availableSerialNumbers: [],
  shelvingRecords: [],
  isLoading: false,
  isSubmitting: false,
  showSerialScanDialog: false,
}

export const useShelvingStore = create<ShelvingState>((set, get) => ({
  ...initialState,

  // 设置容器
  setContainer: (container, items) => set({
    currentContainer: container,
    containerItems: items,
    currentLocation: null,
    currentSku: null,
    quantity: 0,
    maxQuantity: 0,
    serialNumbers: [],
    availableSerialNumbers: [],
  }),

  // 清除容器
  clearContainer: () => set({
    currentContainer: null,
    containerItems: [],
    currentLocation: null,
    currentSku: null,
    quantity: 0,
    maxQuantity: 0,
    serialNumbers: [],
    availableSerialNumbers: [],
  }),

  // 设置货位（不清除已选中的 SKU）
  setLocation: (location) => set({
    currentLocation: location,
  }),

  // 清除货位（不清除已选中的 SKU）
  clearLocation: () => set({
    currentLocation: null,
  }),

  // 设置当前SKU
  setCurrentSku: (sku, maxQty, availableSerials = []) => set({
    currentSku: sku,
    maxQuantity: maxQty,
    availableSerialNumbers: availableSerials,
    quantity: 0,
    serialNumbers: [],
  }),

  // 清除当前SKU
  clearCurrentSku: () => set({
    currentSku: null,
    quantity: 0,
    maxQuantity: 0,
    serialNumbers: [],
    availableSerialNumbers: [],
  }),

  // 设置数量
  setQuantity: (qty) => {
    const { maxQuantity } = get()
    const validQty = Math.min(Math.max(0, qty), maxQuantity)
    set({ quantity: validQty })
  },

  // 增加数量
  incrementQuantity: (delta) => {
    const { quantity, maxQuantity } = get()
    const newQty = quantity + delta
    const validQty = Math.min(Math.max(0, newQty), maxQuantity)
    set({ quantity: validQty })
  },

  // 设置序列号列表
  setSerialNumbers: (serials) => set({ serialNumbers: serials }),

  // 添加序列号
  addSerialNumber: (serial) => {
    const { serialNumbers } = get()
    if (!serialNumbers.includes(serial)) {
      set({ serialNumbers: [...serialNumbers, serial] })
    }
  },

  // 移除序列号
  removeSerialNumber: (serial) => {
    const { serialNumbers } = get()
    set({ serialNumbers: serialNumbers.filter(s => s !== serial) })
  },

  // 设置序列号扫描对话框显示状态
  setShowSerialScanDialog: (show) => set({ showSerialScanDialog: show }),

  // 添加上架记录
  addShelvingRecord: (record) => {
    const { shelvingRecords } = get()
    set({ shelvingRecords: [record, ...shelvingRecords] })
  },

  // 重置当前项（上架成功后调用）
  resetCurrentItem: () => set({
    currentSku: null,
    quantity: 1,
    maxQuantity: 0,
    serialNumbers: [],
    availableSerialNumbers: [],
  }),

  // 设置加载状态
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 设置提交状态
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),

  // 重置所有状态
  reset: () => set(initialState),
}))
