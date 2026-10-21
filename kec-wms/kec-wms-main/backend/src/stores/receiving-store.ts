import { create } from 'zustand'

// 收货业务模式类型
export type ReceivingBusinessMode = 'sku' | 'container' | null

// 容器信息类型定义
export interface ContainerInfo {
  id: string
  containerCode: string
  containerType: string
  usage: string
  workStatus: string
  enabledStatus: string
  warehouseId: string
}

// 容器明细项类型定义
export interface ContainerItemInfo {
  id: string
  skuId: string
  skuCode: string
  skuName: string | null
  quantity: number
  batchNumber: string | null
  lotNumber: string | null
  expiryDate: string | null
  productionDate: string | null
  qualityType: string
  receivedAt: string
  asnId: string
  asnLineId: string | null
}

// 容器明细汇总
export interface ContainerItemsSummary {
  totalQuantity: number
  skuCount: number
  itemCount: number
}

// ASN 类型定义
export interface AsnInfo {
  id: string
  asnNumber: string
  externalNumber: string | null
  status: string
  clientName: string | null
  warehouseName: string | null
  warehouseId: string
  createdAt: string
  totalExpectedQty: number
  totalReceivedQty: number
  totalExpectedLines: number
  totalReceivedLines: number
}

// ASN 行项目类型定义
export interface AsnLineInfo {
  id: string
  lineNumber: number
  skuId: string
  skuCode: string
  skuName: string
  barcode: string | null
  expectedQty: number
  receivedQty: number
  receivedGoodQty: number
  receivedDamagedQty: number
  status: string
  batchNumber: string | null
  expiryDate: string | null
}

// SKU 信息类型定义
export interface SkuInfo {
  id: string
  skuCode: string
  skuName: string
  barcode: string | null
  isFirstReceiving: boolean
  isSelfPackaged: boolean
  isBatchManaged: boolean
  isSerialManaged: boolean
  isExpiryManaged: boolean
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  weightKg: number | null
}

// 当前收货项
export interface CurrentReceivingItem {
  asnLineId: string
  sku: SkuInfo
  maxQty: number // 最大可收数量 = expectedQty - receivedQty
}

// 可用批次行信息
export interface AvailableBatchLine {
  id: string
  lineNumber: number
  batchNumber: string | null
  expiryDate: string | null
  expectedQty: number
  receivedQty: number
  remainingQty: number
}

// 收货状态
interface ReceivingState {
  // ASN 相关
  currentAsn: AsnInfo | null
  asnLines: AsnLineInfo[]

  // 收货模式相关
  receivingBusinessMode: ReceivingBusinessMode
  showModeSelectionDialog: boolean
  currentContainer: ContainerInfo | null
  containerItems: ContainerItemInfo[]
  containerItemsSummary: ContainerItemsSummary | null

  // 当前收货项
  currentItem: CurrentReceivingItem | null
  availableBatchLines: AvailableBatchLine[]
  quantity: number
  qualityStatus: 'GOOD' | 'DAMAGED'
  damageReason: string | null
  batchNumber: string | null
  expiryDate: Date | null
  serialNumbers: string[]

  // UI 状态
  isLoading: boolean
  isSubmitting: boolean
  showFirstReceivingDialog: boolean

  // 操作方法
  setAsn: (asn: AsnInfo, lines: AsnLineInfo[]) => void
  clearAsn: () => void
  setCurrentItem: (item: CurrentReceivingItem | null) => void
  setAvailableBatchLines: (lines: AvailableBatchLine[]) => void
  selectBatchLine: (lineId: string) => void
  setQuantity: (qty: number) => void
  incrementQuantity: (amount: number) => void
  setQualityStatus: (status: 'GOOD' | 'DAMAGED') => void
  setDamageReason: (reason: string | null) => void
  setBatchNumber: (batch: string | null) => void
  setExpiryDate: (date: Date | null) => void
  setSerialNumbers: (serials: string[]) => void
  addSerialNumber: (serial: string) => void
  removeSerialNumber: (serial: string) => void
  setIsLoading: (loading: boolean) => void
  setIsSubmitting: (submitting: boolean) => void
  setShowFirstReceivingDialog: (show: boolean) => void
  resetCurrentItem: () => void
  updateAsnLine: (lineId: string, updates: Partial<AsnLineInfo>) => void
  updateAsnTotals: (receivedQty: number, receivedLines: number) => void
  updateAsnStatus: (status: string) => void
  // 收货模式相关方法
  setReceivingBusinessMode: (mode: ReceivingBusinessMode) => void
  setShowModeSelectionDialog: (show: boolean) => void
  setCurrentContainer: (container: ContainerInfo | null) => void
  setContainerItems: (items: ContainerItemInfo[], summary: ContainerItemsSummary | null) => void
  clearCurrentContainer: () => void
}

export const useReceivingStore = create<ReceivingState>((set, get) => ({
  // 初始状态
  currentAsn: null,
  asnLines: [],
  receivingBusinessMode: null,
  showModeSelectionDialog: false,
  currentContainer: null,
  containerItems: [],
  containerItemsSummary: null,
  currentItem: null,
  availableBatchLines: [],
  quantity: 0,
  qualityStatus: 'GOOD',
  damageReason: null,
  batchNumber: null,
  expiryDate: null,
  serialNumbers: [],
  isLoading: false,
  isSubmitting: false,
  showFirstReceivingDialog: false,

  // 设置 ASN
  setAsn: (asn, lines) => set({
    currentAsn: asn,
    asnLines: lines,
    currentItem: null,
    quantity: 0,
    qualityStatus: 'GOOD',
    damageReason: null,
    batchNumber: null,
    expiryDate: null,
    serialNumbers: [],
    // 重置收货模式，显示模式选择弹窗
    receivingBusinessMode: null,
    showModeSelectionDialog: true,
    currentContainer: null,
    containerItems: [],
    containerItemsSummary: null,
  }),

  // 清除 ASN
  clearAsn: () => set({
    currentAsn: null,
    asnLines: [],
    currentItem: null,
    quantity: 0,
    qualityStatus: 'GOOD',
    damageReason: null,
    batchNumber: null,
    expiryDate: null,
    serialNumbers: [],
    // 清除收货模式相关状态
    receivingBusinessMode: null,
    showModeSelectionDialog: false,
    currentContainer: null,
    containerItems: [],
    containerItemsSummary: null,
  }),

  // 设置当前收货项
  setCurrentItem: (item) => set({
    currentItem: item,
    availableBatchLines: [],
    quantity: 0,
    qualityStatus: 'GOOD',
    damageReason: null,
    batchNumber: null,
    expiryDate: null,
    serialNumbers: [],
  }),

  // 设置可用批次行
  setAvailableBatchLines: (lines) => set({ availableBatchLines: lines }),

  // 选择批次行
  selectBatchLine: (lineId) => {
    const { availableBatchLines, currentItem } = get()
    const selectedLine = availableBatchLines.find(line => line.id === lineId)
    if (selectedLine && currentItem) {
      set({
        currentItem: {
          ...currentItem,
          asnLineId: selectedLine.id,
          maxQty: selectedLine.remainingQty,
        },
        batchNumber: selectedLine.batchNumber,
        expiryDate: selectedLine.expiryDate ? new Date(selectedLine.expiryDate) : null,
        quantity: 0,
      })
    }
  },

  // 设置数量
  setQuantity: (qty) => {
    const { currentItem } = get()
    if (currentItem) {
      // 确保数量不超过最大可收数量
      const validQty = Math.min(Math.max(0, qty), currentItem.maxQty)
      set({ quantity: validQty })
    } else {
      set({ quantity: Math.max(0, qty) })
    }
  },

  // 增加数量
  incrementQuantity: (amount) => {
    const { quantity, currentItem } = get()
    const newQty = quantity + amount
    if (currentItem) {
      const validQty = Math.min(Math.max(0, newQty), currentItem.maxQty)
      set({ quantity: validQty })
    } else {
      set({ quantity: Math.max(0, newQty) })
    }
  },

  // 设置质量状态
  setQualityStatus: (status) => set({
    qualityStatus: status,
    damageReason: status === 'GOOD' ? null : get().damageReason,
  }),

  // 设置损坏原因
  setDamageReason: (reason) => set({ damageReason: reason }),

  // 设置批次号
  setBatchNumber: (batch) => set({ batchNumber: batch }),

  // 设置有效期
  setExpiryDate: (date) => set({ expiryDate: date }),

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

  // 设置加载状态
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 设置提交状态
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),

  // 设置首次收货弹窗显示状态
  setShowFirstReceivingDialog: (show) => set({ showFirstReceivingDialog: show }),

  // 重置当前收货项
  resetCurrentItem: () => set({
    currentItem: null,
    availableBatchLines: [],
    quantity: 0,
    qualityStatus: 'GOOD',
    damageReason: null,
    batchNumber: null,
    expiryDate: null,
    serialNumbers: [],
  }),

  // 更新 ASN 行项目
  updateAsnLine: (lineId, updates) => {
    const { asnLines } = get()
    set({
      asnLines: asnLines.map(line =>
        line.id === lineId ? { ...line, ...updates } : line
      ),
    })
  },

  // 更新 ASN 汇总数据
  updateAsnTotals: (receivedQty, receivedLines) => {
    const { currentAsn } = get()
    if (currentAsn) {
      set({
        currentAsn: {
          ...currentAsn,
          totalReceivedQty: currentAsn.totalReceivedQty + receivedQty,
          totalReceivedLines: receivedLines,
        },
      })
    }
  },

  // 更新 ASN 状态
  updateAsnStatus: (status) => {
    const { currentAsn } = get()
    if (currentAsn) {
      set({
        currentAsn: {
          ...currentAsn,
          status,
        },
      })
    }
  },

  // 设置收货业务模式（切换模式时重置所有数据）
  setReceivingBusinessMode: (mode) => {
    const { receivingBusinessMode } = get()
    // 如果模式发生变化，重置所有数据
    if (receivingBusinessMode !== mode) {
      set({
        receivingBusinessMode: mode,
        currentAsn: null,
        asnLines: [],
        currentItem: null,
        quantity: 1,
        qualityStatus: 'GOOD',
        damageReason: null,
        batchNumber: null,
        expiryDate: null,
        serialNumbers: [],
        showModeSelectionDialog: false,
        currentContainer: null,
        containerItems: [],
        containerItemsSummary: null,
        isLoading: false,
        isSubmitting: false,
        showFirstReceivingDialog: false,
      })
    } else {
      set({ receivingBusinessMode: mode })
    }
  },

  // 设置模式选择弹窗显示状态
  setShowModeSelectionDialog: (show) => set({ showModeSelectionDialog: show }),

  // 设置当前容器
  setCurrentContainer: (container) => set({ currentContainer: container }),

  // 设置容器明细
  setContainerItems: (items, summary) => set({ containerItems: items, containerItemsSummary: summary }),

  // 清除当前容器
  clearCurrentContainer: () => set({ currentContainer: null, containerItems: [], containerItemsSummary: null }),
}))
