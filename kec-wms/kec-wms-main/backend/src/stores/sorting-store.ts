import { create } from 'zustand'

// 播种墙信息
export interface SortingWallInfo {
  id: string
  wallCode: string
  wallName: string
  horizontalCells: number
  verticalCells: number
  totalCells: number
  warehouseId: string
  warehouseName: string
}

// 分拣任务信息
export interface SortingTaskInfo {
  id: string
  taskNumber: string
  pickOrderId: string
  pickOrderNumber: string
  sortingWallId: string
  status: string
  totalItems: number
  completedItems: number
  totalOrders: number
  completedOrders: number
}

// 格口分配信息
export interface CellAllocation {
  cellCode: string
  orderId: string
  orderNumber: string
  expectedQty: number
  sortedQty: number
  status: 'ALLOCATED' | 'SORTING' | 'COMPLETED' | 'RELEASED'
}

// 扫描结果
export interface ScanResult {
  cellCode: string
  orderNumber: string
  skuCode: string
  skuName: string | null
  sortedQty: number
  expectedQty: number
  isComplete: boolean
}

// Store 状态
interface SortingState {
  // 当前播种墙
  currentWall: SortingWallInfo | null
  // 当前分拣任务
  currentTask: SortingTaskInfo | null
  // 格口分配列表
  cellAllocations: CellAllocation[]
  // 最近扫描结果
  lastScanResult: ScanResult | null
  // 闪动中的格口（用于触发动画）
  flashingCell: string | null
  // UI状态
  isLoading: boolean

  // 操作方法
  setCurrentWall: (wall: SortingWallInfo | null) => void
  setCurrentTask: (task: SortingTaskInfo | null) => void
  setCellAllocations: (allocations: CellAllocation[]) => void
  updateCellAllocation: (cellCode: string, updates: Partial<CellAllocation>) => void
  setLastScanResult: (result: ScanResult | null) => void
  setFlashingCell: (cellCode: string | null) => void
  setIsLoading: (loading: boolean) => void
  clearAll: () => void
}

export const useSortingStore = create<SortingState>((set) => ({
  // 初始状态
  currentWall: null,
  currentTask: null,
  cellAllocations: [],
  lastScanResult: null,
  flashingCell: null,
  isLoading: false,

  // 设置当前播种墙
  setCurrentWall: (wall) => set({ currentWall: wall }),

  // 设置当前分拣任务
  setCurrentTask: (task) => set({ currentTask: task }),

  // 设置格口分配列表
  setCellAllocations: (allocations) => set({ cellAllocations: allocations }),

  // 更新单个格口分配
  updateCellAllocation: (cellCode, updates) => set((state) => ({
    cellAllocations: state.cellAllocations.map((cell) =>
      cell.cellCode === cellCode ? { ...cell, ...updates } : cell
    ),
  })),

  // 设置最近扫描结果
  setLastScanResult: (result) => set({ lastScanResult: result }),

  // 设置闪动格口（10秒后自动清除，给操作员足够时间看清格口位置）
  setFlashingCell: (cellCode) => {
    set({ flashingCell: cellCode })
    if (cellCode) {
      setTimeout(() => {
        set((state) => state.flashingCell === cellCode ? { flashingCell: null } : {})
      }, 10000)
    }
  },

  // 设置加载状态
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 清除所有状态
  clearAll: () => set({
    currentWall: null,
    currentTask: null,
    cellAllocations: [],
    lastScanResult: null,
    flashingCell: null,
    isLoading: false,
  }),
}))
