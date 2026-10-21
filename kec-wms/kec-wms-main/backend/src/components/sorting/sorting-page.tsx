'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { SortingScanPanel } from '@/components/sorting/sorting-scan-panel'
import { SortingWallGrid } from '@/components/sorting/sorting-wall-grid'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  useSortingStore,
  type SortingWallInfo,
  type SortingTaskInfo,
  type CellAllocation,
  type ScanResult,
} from '@/stores/sorting-store'

interface WallOption {
  id: string
  wallCode: string
  wallName: string
  horizontalCells: number
  verticalCells: number
  totalCells: number
  sortStatus: string
  warehouseId: string
  warehouseName: string
}

export function SortingPage() {
  const t = useTranslations('sorting')
  const tMenuGroup = useTranslations('menuGroup')
  const [walls, setWalls] = useState<WallOption[]>([])
  const [loadingWalls, setLoadingWalls] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)

  const {
    currentWall,
    currentTask,
    cellAllocations,
    flashingCell,
    isLoading,
    setCurrentWall,
    setCurrentTask,
    setCellAllocations,
    updateCellAllocation,
    setLastScanResult,
    setFlashingCell,
    setIsLoading,
    clearAll,
  } = useSortingStore()

  // 加载播种墙列表
  useEffect(() => {
    const fetchWalls = async () => {
      try {
        const res = await fetch('/api/v1/sorting/walls')
        const data = await res.json()
        if (data.success) {
          setWalls(data.data)
        }
      } catch {
        toast.error('加载播种墙列表失败')
      } finally {
        setLoadingWalls(false)
      }
    }
    fetchWalls()
  }, [])

  // 页面卸载时清空状态
  useEffect(() => {
    return () => clearAll()
  }, [clearAll])

  // 清除播种墙选择
  const handleClearWall = useCallback(() => {
    setCurrentWall(null)
    setCurrentTask(null)
    setCellAllocations([])
    setLastScanResult(null)
  }, [setCurrentWall, setCurrentTask, setCellAllocations, setLastScanResult])

  // 选择播种墙
  const handleWallSelect = useCallback(async (wallId: string) => {
    const wall = walls.find((w) => w.id === wallId)
    if (!wall) return

    const wallInfo: SortingWallInfo = {
      id: wall.id,
      wallCode: wall.wallCode,
      wallName: wall.wallName,
      horizontalCells: wall.horizontalCells,
      verticalCells: wall.verticalCells,
      totalCells: wall.totalCells,
      warehouseId: wall.warehouseId,
      warehouseName: wall.warehouseName,
    }
    setCurrentWall(wallInfo)

    // 查询该播种墙上是否有进行中的分拣任务
    try {
      const res = await fetch(`/api/v1/sorting/active-task?wallId=${wallId}`)
      const data = await res.json()

      if (data.success && data.data) {
        // 恢复进行中的任务
        const { task, cellAllocations: allocations } = data.data
        const taskInfo: SortingTaskInfo = {
          id: task.id,
          taskNumber: task.taskNumber,
          pickOrderId: task.pickOrderId,
          pickOrderNumber: task.pickOrderNumber,
          sortingWallId: task.sortingWallId,
          status: task.status,
          totalItems: task.totalItems,
          completedItems: task.completedItems,
          totalOrders: task.totalOrders,
          completedOrders: task.completedOrders,
        }
        setCurrentTask(taskInfo)
        setCellAllocations(allocations as CellAllocation[])
        toast.success(`已恢复进行中的分拣任务：${task.taskNumber}`)
      } else {
        // 没有进行中的任务，清空状态
        setCurrentTask(null)
        setCellAllocations([])
      }
    } catch (error) {
      console.error('查询进行中的任务失败:', error)
      // 查询失败时也清空状态
      setCurrentTask(null)
      setCellAllocations([])
    }
  }, [walls, setCurrentWall, setCurrentTask, setCellAllocations])

  // 开始分拣任务
  const handleStartTask = useCallback(async (scanCode: string) => {
    if (!currentWall) {
      throw new Error('请先选择播种墙')
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/sorting/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanCode,
          sortingWallId: currentWall.id,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || '开始分拣任务失败')
      }

      const { task, cellAllocations: allocations } = data.data

      const taskInfo: SortingTaskInfo = {
        id: task.id,
        taskNumber: task.taskNumber,
        pickOrderId: task.pickOrderId,
        pickOrderNumber: task.pickOrderNumber,
        sortingWallId: task.sortingWallId,
        status: task.status,
        totalItems: task.totalItems,
        completedItems: task.completedItems,
        totalOrders: task.totalOrders,
        completedOrders: task.completedOrders,
      }

      setCurrentTask(taskInfo)
      setCellAllocations(allocations as CellAllocation[])
      toast.success(`分拣任务已开始，共 ${task.totalOrders} 个订单`)
    } finally {
      setIsLoading(false)
    }
  }, [currentWall, setCurrentTask, setCellAllocations, setIsLoading])

  // 扫描商品
  const handleScanSku = useCallback(async (barcode: string) => {
    if (!currentTask) {
      throw new Error('请先开始分拣任务')
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/sorting/scan-sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sortingTaskId: currentTask.id,
          barcode,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || '扫描商品失败')
      }

      const result = data.data
      const scanResult: ScanResult = {
        cellCode: result.cellCode,
        orderNumber: result.orderNumber,
        skuCode: result.skuCode,
        skuName: result.skuName,
        sortedQty: result.sortedQty,
        expectedQty: result.expectedQty,
        isComplete: result.isComplete,
      }

      setLastScanResult(scanResult)
      setLastError(null)

      // 更新格口状态
      updateCellAllocation(result.cellCode, {
        sortedQty: result.sortedQty,
        status: result.isComplete ? 'COMPLETED' : 'SORTING',
      })

      // 更新任务进度
      if (result.taskProgress) {
        const isTaskComplete = result.taskProgress.isTaskComplete
        setCurrentTask({
          ...currentTask,
          completedItems: result.taskProgress.completedItems,
          status: isTaskComplete ? 'COMPLETED' : 'IN_PROGRESS',
        })

        // 如果任务完成，显示提示但保留格口数据（以便查看最后一个SKU放在哪个格口）
        if (isTaskComplete) {
          setTimeout(() => {
            toast.success('分拣任务已完成，可继续扫描下一个拣货单')
            setCurrentTask(null)
            // 注意：不清除格口数据，保留以便查看
          }, 5000)
        }
      }

      // 触发格口闪动
      setFlashingCell(result.cellCode)

      toast.success(`已分拣到 ${result.cellCode}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('scanError')
      setLastError(`${message}\n${t('scanErrorBarcode')}：${barcode}`)
      setFlashingCell(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [currentTask, setLastScanResult, updateCellAllocation, setCurrentTask, setFlashingCell, setIsLoading, t])

  // 完成分拣
  const handleComplete = useCallback(async () => {
    if (!currentTask) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/sorting/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sortingTaskId: currentTask.id,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || '完成分拣失败')
      }

      toast.success('分拣任务已完成，可继续扫描下一个拣货单')
      // 只清空任务状态，保留格口数据以便查看最后一个SKU放在哪个格口
      setCurrentTask(null)
      // 注意：不清除格口数据，开始新任务时会自动替换
    } catch (error) {
      const message = error instanceof Error ? error.message : '完成分拣失败'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [currentTask, setCurrentTask, setIsLoading])

  void handleComplete

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: tMenuGroup('outbound'), href: '/orders' },
          { label: t('title') },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧扫描区 */}
        <div className="lg:col-span-1">
          <SortingScanPanel
            walls={walls}
            loadingWalls={loadingWalls}
            currentWall={currentWall}
            currentTask={currentTask}
            onWallSelect={handleWallSelect}
            onClearWall={handleClearWall}
            onStartTask={handleStartTask}
            onScanSku={handleScanSku}
            isLoading={isLoading}
            lastError={lastError}
          />
        </div>

        {/* 右侧格口区 */}
        <div className="lg:col-span-2">
          <SortingWallGrid
            wall={currentWall}
            cellAllocations={cellAllocations}
            flashingCell={flashingCell}
            sortingTaskId={currentTask?.id}
          />
        </div>
      </div>
    </div>
  )
}
