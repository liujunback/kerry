import { create } from 'zustand'

// 业务模式类型
export type PackingBusinessMode = 'STANDARD' | 'RETURN_WAREHOUSE' | 'SCRAP'

// 拣货单信息
export interface PickOrderInfo {
  id: string
  taskNumber: string
  taskType: string
  status: string
  orderBusinessType: PackingBusinessMode
  totalLines: number
  totalQty: number
  totalOrders: number
  pickedQty: number
  packedQty: number
  warehouseId: string
  warehouseName: string
}

// 拣货单行项目
export interface PickOrderLineInfo {
  id: string
  lineNumber: number
  skuId: string
  skuCode: string
  skuName: string | null
  barcode: string | null
  locationCode: string | null
  expectedQty: number
  pickedQty: number
  packedQty: number
  status: string
  orderId: string
  orderNumber: string
  orderType: string
  channel: string | null
  batchNumber: string | null
  expiryDate: string | null
  isSerialManaged: boolean
  isBatchManaged: boolean
  isExpiryManaged: boolean
  isSelfPackaged: boolean
}

// 当前扫描项
export interface CurrentPackingItem {
  lineId: string
  sku: {
    id: string
    skuCode: string
    skuName: string | null
    barcode: string | null
    isSerialManaged: boolean
    isBatchManaged: boolean
    isExpiryManaged: boolean
  }
  maxQty: number
  batchNumber: string | null
  expiryDate: string | null
}

// 包材使用记录
export interface PackagingMaterialUsageItem {
  materialId: string
  materialCode: string
  materialName: string
  quantity: number
}

// 包材选项（下拉列表用）
export interface PackagingMaterialOption {
  id: string
  materialCode: string
  materialName: string
  materialType: string
}

// 订单汇总信息
export interface OrderSummary {
  orderType: string
  channel: string | null
  skuCode: string
  totalQty: number
  unpackedQty: number
}

// 选中的订单信息
export interface SelectedOrderInfo {
  orderId: string
  orderNumber: string
  totalExpected: number
  totalPacked: number
  isComplete: boolean
  lines: {
    lineId: string
    skuCode: string
    skuName: string | null
    expectedQty: number
    packedQty: number
  }[]
}

// Store 状态
interface PackingState {
  // 拣货单相关
  currentPickOrder: PickOrderInfo | null
  pickOrderLines: PickOrderLineInfo[]
  orderSummary: OrderSummary | null

  // 选中的订单（扫描订单号时）
  selectedOrder: SelectedOrderInfo | null

  // 当前打包项
  currentItem: CurrentPackingItem | null
  quantity: number
  serialNumbers: string[]

  // 包材相关
  packagingMaterials: PackagingMaterialUsageItem[]
  materialOptions: PackagingMaterialOption[]  // 包材选项列表
  isMaterialOptionsLoaded: boolean  // 是否已加载包材选项

  // UI 状态
  isLoading: boolean
  isSubmitting: boolean
  showSerialDialog: boolean
  showPackagingDialog: boolean
  showCompleteDialog: boolean
  shouldFocusSku: boolean  // 触发聚焦SKU输入框
  shouldFocusMaterial: boolean  // 触发聚焦包材输入框
  shouldFocusTaskNumber: boolean  // 触发聚焦单号输入框

  // 操作方法
  setPickOrder: (order: PickOrderInfo, lines: PickOrderLineInfo[], summary: OrderSummary | null) => void
  clearPickOrder: () => void
  setCurrentItem: (item: CurrentPackingItem | null) => void
  setQuantity: (qty: number) => void
  incrementQuantity: (amount: number) => void
  setSerialNumbers: (serials: string[]) => void
  addSerialNumber: (serial: string) => void
  removeSerialNumber: (serial: string) => void
  addPackagingMaterial: (material: PackagingMaterialUsageItem) => void
  removePackagingMaterial: (materialId: string) => void
  updatePackagingMaterialQty: (materialId: string, qty: number) => void
  clearPackagingMaterials: () => void
  setIsLoading: (loading: boolean) => void
  setIsSubmitting: (submitting: boolean) => void
  setShowSerialDialog: (show: boolean) => void
  setShowPackagingDialog: (show: boolean) => void
  setShowCompleteDialog: (show: boolean) => void
  resetCurrentItem: () => void
  updateLinePackedQty: (lineId: string, packedQty: number) => void
  updatePickOrderTotals: (packedQty: number) => void
  markPickOrderCompleted: () => void
  setSelectedOrder: (order: SelectedOrderInfo | null) => void
  clearSelectedOrder: () => void
  triggerFocusSku: () => void
  clearFocusSku: () => void
  triggerFocusMaterial: () => void
  clearFocusMaterial: () => void
  triggerFocusTaskNumber: () => void
  clearFocusTaskNumber: () => void
  loadMaterialOptions: () => Promise<void>  // 加载包材选项
}

export const usePackingStore = create<PackingState>((set, get) => ({
  // 初始状态
  currentPickOrder: null,
  pickOrderLines: [],
  orderSummary: null,
  selectedOrder: null,
  currentItem: null,
  quantity: 1,
  serialNumbers: [],
  packagingMaterials: [],
  materialOptions: [],
  isMaterialOptionsLoaded: false,
  isLoading: false,
  isSubmitting: false,
  showSerialDialog: false,
  showPackagingDialog: false,
  showCompleteDialog: false,
  shouldFocusSku: false,
  shouldFocusMaterial: false,
  shouldFocusTaskNumber: false,

  // 设置拣货单
  setPickOrder: (order, lines, summary) => set({
    currentPickOrder: order,
    pickOrderLines: lines,
    orderSummary: summary,
    selectedOrder: null,
    currentItem: null,
    quantity: 1,
    serialNumbers: [],
    packagingMaterials: [],
  }),

  // 清除拣货单
  clearPickOrder: () => set({
    currentPickOrder: null,
    pickOrderLines: [],
    orderSummary: null,
    selectedOrder: null,
    currentItem: null,
    quantity: 1,
    serialNumbers: [],
    packagingMaterials: [],
  }),

  // 设置当前打包项
  setCurrentItem: (item) => set({
    currentItem: item,
    quantity: 1,
    serialNumbers: [],
  }),

  // 设置数量
  setQuantity: (qty) => {
    const { currentItem } = get()
    if (currentItem) {
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

  // 添加包材
  addPackagingMaterial: (material) => {
    const { packagingMaterials } = get()
    const existing = packagingMaterials.find(m => m.materialId === material.materialId)
    if (existing) {
      set({
        packagingMaterials: packagingMaterials.map(m =>
          m.materialId === material.materialId
            ? { ...m, quantity: m.quantity + material.quantity }
            : m
        ),
      })
    } else {
      set({ packagingMaterials: [...packagingMaterials, material] })
    }
  },

  // 移除包材
  removePackagingMaterial: (materialId) => {
    const { packagingMaterials } = get()
    set({ packagingMaterials: packagingMaterials.filter(m => m.materialId !== materialId) })
  },

  // 更新包材数量
  updatePackagingMaterialQty: (materialId, qty) => {
    const { packagingMaterials } = get()
    if (qty <= 0) {
      set({ packagingMaterials: packagingMaterials.filter(m => m.materialId !== materialId) })
    } else {
      set({
        packagingMaterials: packagingMaterials.map(m =>
          m.materialId === materialId ? { ...m, quantity: qty } : m
        ),
      })
    }
  },

  // 清除包材
  clearPackagingMaterials: () => set({ packagingMaterials: [] }),

  // 设置加载状态
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 设置提交状态
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),

  // 设置序列号弹窗显示状态
  setShowSerialDialog: (show) => set({ showSerialDialog: show }),

  // 设置包材弹窗显示状态
  setShowPackagingDialog: (show) => set({ showPackagingDialog: show }),

  // 设置完成确认弹窗显示状态
  setShowCompleteDialog: (show) => set({ showCompleteDialog: show }),

  // 重置当前打包项
  resetCurrentItem: () => set({
    currentItem: null,
    quantity: 1,
    serialNumbers: [],
  }),

  // 更新行项目已打包数量
  updateLinePackedQty: (lineId, packedQty) => {
    const { pickOrderLines } = get()
    set({
      pickOrderLines: pickOrderLines.map(line =>
        line.id === lineId ? { ...line, packedQty } : line
      ),
    })
  },

  // 更新拣货单汇总数据
  updatePickOrderTotals: (packedQty) => {
    const { currentPickOrder } = get()
    if (currentPickOrder) {
      set({
        currentPickOrder: {
          ...currentPickOrder,
          packedQty: currentPickOrder.packedQty + packedQty,
        },
      })
    }
  },

  markPickOrderCompleted: () => {
    const { currentPickOrder, pickOrderLines, orderSummary } = get()
    if (!currentPickOrder) return

    const completedLines = pickOrderLines.map((line) => ({
      ...line,
      packedQty: line.expectedQty,
    }))

    set({
      currentPickOrder: {
        ...currentPickOrder,
        status: 'COMPLETED',
        packedQty: currentPickOrder.totalQty,
      },
      pickOrderLines: completedLines,
      orderSummary: orderSummary
        ? {
            ...orderSummary,
            unpackedQty: 0,
          }
        : orderSummary,
      packagingMaterials: [],
      currentItem: null,
      quantity: 1,
      serialNumbers: [],
    })
  },

  // 设置选中的订单
  setSelectedOrder: (order) => set({ selectedOrder: order }),

  // 清除选中的订单
  clearSelectedOrder: () => set({ selectedOrder: null }),

  // 触发聚焦SKU输入框
  triggerFocusSku: () => set({ shouldFocusSku: true }),

  // 清除聚焦状态
  clearFocusSku: () => set({ shouldFocusSku: false }),

  // 触发聚焦包材输入框
  triggerFocusMaterial: () => set({ shouldFocusMaterial: true }),

  // 清除包材聚焦状态
  clearFocusMaterial: () => set({ shouldFocusMaterial: false }),

  // 触发聚焦单号输入框
  triggerFocusTaskNumber: () => set({ shouldFocusTaskNumber: true }),

  // 清除单号聚焦状态
  clearFocusTaskNumber: () => set({ shouldFocusTaskNumber: false }),

  // 加载包材选项（只加载一次）
  loadMaterialOptions: async () => {
    const { isMaterialOptionsLoaded } = get()
    if (isMaterialOptionsLoaded) return

    // 立即设置标志，防止并发请求
    set({ isMaterialOptionsLoaded: true })

    try {
      const response = await fetch('/api/v1/packaging-materials?isActive=true&pageSize=100')
      if (response.ok) {
        const data = await response.json()
        set({ materialOptions: data.data || [] })
      }
    } catch (error) {
      console.error('加载包材失败:', error)
      // 加载失败时重置标志，允许重试
      set({ isMaterialOptionsLoaded: false })
    }
  },
}))
