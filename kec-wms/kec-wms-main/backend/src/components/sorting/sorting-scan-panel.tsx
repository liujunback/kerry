'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, ScanLine, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useSortingStore, type SortingWallInfo, type SortingTaskInfo } from '@/stores/sorting-store'

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

interface SortingScanPanelProps {
  walls: WallOption[]
  loadingWalls: boolean
  currentWall: SortingWallInfo | null
  currentTask: SortingTaskInfo | null
  onWallSelect: (wallId: string) => void
  onClearWall: () => void
  onStartTask: (scanCode: string) => Promise<void>
  onScanSku: (barcode: string) => Promise<void>
  isLoading: boolean
  lastError?: string | null
}

export function SortingScanPanel({
  walls,
  loadingWalls,
  currentWall,
  currentTask,
  onWallSelect,
  onClearWall,
  onStartTask,
  onScanSku,
  isLoading,
  lastError,
}: SortingScanPanelProps) {
  const t = useTranslations('sorting')
  const { lastScanResult } = useSortingStore()

  const [wallInput, setWallInput] = useState('')
  const [scanInput, setScanInput] = useState('')
  const wallInputRef = useRef<HTMLInputElement>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // 页面加载后聚焦到播种墙输入框
  useEffect(() => {
    if (!loadingWalls && !currentWall) {
      wallInputRef.current?.focus()
    }
  }, [loadingWalls, currentWall])

  // 选择播种墙后聚焦到扫描框
  useEffect(() => {
    if (currentWall && !currentTask) {
      setTimeout(() => scanInputRef.current?.focus(), 100)
    }
  }, [currentWall, currentTask])

  // 播种墙扫描/选择
  const handleWallSubmit = useCallback(() => {
    if (!wallInput.trim()) return

    const input = wallInput.trim().toUpperCase()
    // 根据编码或名称查找播种墙
    const matchedWalls = walls.filter(
      (w) => w.wallCode.toUpperCase() === input || w.wallName.toUpperCase() === input
    )

    if (matchedWalls.length === 0) {
      toast.error('未找到该播种墙')
      wallInputRef.current?.select()
    } else if (matchedWalls.length === 1) {
      // 只匹配到一个，直接使用
      const wall = matchedWalls[0]
      onWallSelect(wall.id)
      setWallInput('')
      toast.success(`已选择播种墙: ${wall.wallName} (${wall.warehouseName})`)
    } else {
      // 匹配到多个（不同仓库有相同编码）
      const wallList = matchedWalls.map((w) => `${w.wallName} - ${w.warehouseName}`).join(', ')
      toast.error(`找到多个播种墙: ${wallList}，请扫描完整编码或联系管理员`)
      wallInputRef.current?.select()
    }
  }, [wallInput, walls, onWallSelect])

  // 扫描提交（拣货单或商品）
  const handleScanSubmit = useCallback(async () => {
    if (!scanInput.trim()) return

    try {
      if (!currentTask) {
        await onStartTask(scanInput.trim())
      } else {
        await onScanSku(scanInput.trim())
      }
      setScanInput('')
      setTimeout(() => scanInputRef.current?.focus(), 50)
    } catch (error) {
      const message = error instanceof Error ? error.message : '扫描失败'
      toast.error(message)
      // 报错后清空输入框并聚焦
      setScanInput('')
      setTimeout(() => scanInputRef.current?.focus(), 50)
    }
  }, [scanInput, currentTask, onStartTask, onScanSku])

  const progress = currentTask
    ? Math.round((currentTask.completedItems / currentTask.totalItems) * 100)
    : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanLine className="h-5 w-5" />
          {t('scanPanel')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 播种墙选择/扫描 */}
        <div className="space-y-2">
          <Label>{t('selectWall')}</Label>
          {loadingWalls ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('loadingWalls')}</span>
            </div>
          ) : currentWall ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded-md text-sm">
                <span className="font-medium">{currentWall.wallName}</span>
                <span className="text-muted-foreground ml-2">
                  ({currentWall.horizontalCells}×{currentWall.verticalCells})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearWall}
                title={t('clearWall')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                ref={wallInputRef}
                value={wallInput}
                onChange={(e) => setWallInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWallSubmit()}
                placeholder={t('scanWallPlaceholder')}
                disabled={!!currentTask}
              />
              <Button
                onClick={handleWallSubmit}
                disabled={!wallInput.trim() || !!currentTask}
              >
                {t('confirm')}
              </Button>
            </div>
          )}
        </div>

        {/* 扫描输入框 - 选择播种墙后显示 */}
        {currentWall && (
          <div className="space-y-2">
            <Label>
              {currentTask ? t('scanSku') : t('scanPickOrder')}
            </Label>
            <div className="flex gap-2">
              <Input
                ref={scanInputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                placeholder={currentTask ? t('scanSkuPlaceholder') : t('scanPickOrderPlaceholder')}
                disabled={isLoading}
              />
              <Button
                onClick={handleScanSubmit}
                disabled={isLoading || !scanInput.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('confirm')
                )}
              </Button>
            </div>
            {!currentTask && (
              <p className="text-xs text-muted-foreground">
                {t('scanPickOrderHint')}
              </p>
            )}
          </div>
        )}

        {/* 任务信息 */}
        {currentTask && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('pickOrderNumber')}：</span>
                <span className="font-medium">{currentTask.pickOrderNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('taskNumber')}：</span>
                <span className="font-medium">{currentTask.taskNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('totalOrders')}：</span>
                <span className="font-medium">{currentTask.totalOrders}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('totalItems')}：</span>
                <span className="font-medium">{currentTask.totalItems}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('progress')}</span>
                <span className="font-medium">
                  {currentTask.completedItems}/{currentTask.totalItems} ({progress}%)
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {/* 最近扫描结果 */}
        {lastScanResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
              <span>✓</span>
              <span>{t('sortedTo')} {lastScanResult.cellCode}</span>
            </div>
            <div className="text-sm text-green-600 space-y-0.5">
              <div>SKU: {lastScanResult.skuCode}</div>
              <div>{t('orderNumber')}: {lastScanResult.orderNumber}</div>
              <div>
                {t('cellProgress')}: {lastScanResult.sortedQty}/{lastScanResult.expectedQty}
                {lastScanResult.isComplete && ` (${t('completed')})`}
              </div>
            </div>
          </div>
        )}

        {/* 扫描错误提示（固定显示，不自动消失） */}
        {lastError && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
              <span>✗</span>
              <span>{t('scanError')}</span>
            </div>
            <div className="text-sm text-red-600 whitespace-pre-line">
              {lastError}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
