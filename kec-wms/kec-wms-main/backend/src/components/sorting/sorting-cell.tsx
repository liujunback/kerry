'use client'

import { cn } from '@/lib/utils'
import { type CellAllocation } from '@/stores/sorting-store'
import { Check } from 'lucide-react'

interface SortingCellProps {
  cellCode: string
  allocation?: CellAllocation
  isFlashing: boolean
  onClick?: () => void
}

export function SortingCell({ cellCode, allocation, isFlashing, onClick }: SortingCellProps) {
  const isEmpty = !allocation
  const isCompleted = allocation?.status === 'COMPLETED' || allocation?.status === 'RELEASED'
  const isSorting = allocation?.status === 'SORTING'
  const isAllocated = allocation?.status === 'ALLOCATED'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center p-2 rounded-lg border-2 min-h-[80px] transition-all duration-200',
        onClick && 'cursor-pointer hover:ring-2 hover:ring-blue-400',
        // 空闲状态
        isEmpty && 'border-gray-200 bg-gray-50 text-gray-400',
        // 已分配但未开始
        isAllocated && 'border-blue-300 bg-blue-50 text-blue-700',
        // 分拣中
        isSorting && 'border-blue-500 bg-blue-100 text-blue-800',
        // 已完成
        isCompleted && 'border-green-500 bg-green-50 text-green-700',
        // 闪动效果 - 使用醒目的橙色
        isFlashing && 'animate-pulse border-orange-500 bg-orange-400 text-white shadow-lg scale-105 ring-4 ring-orange-500 ring-opacity-50'
      )}
    >
      {/* 格口编码 */}
      <div className={cn(
        'text-2xl font-bold',
        isFlashing && 'text-white'
      )}>
        {cellCode}
      </div>

      {/* 订单信息 */}
      {allocation && (
        <>
          <div className={cn(
            'text-xs truncate max-w-full',
            isFlashing && 'text-white'
          )}>
            {allocation.orderNumber}
          </div>
          <div className={cn(
            'text-xs font-medium',
            isFlashing && 'text-white'
          )}>
            {allocation.sortedQty}/{allocation.expectedQty}
          </div>
        </>
      )}

      {/* 空闲标识 */}
      {isEmpty && (
        <div className="text-xs">空闲</div>
      )}

      {/* 完成标识 */}
      {isCompleted && !isFlashing && (
        <div className="absolute top-1 right-1">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      )}
    </div>
  )
}
