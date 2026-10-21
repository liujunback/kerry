'use client'

import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

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

interface SortingWallSelectorProps {
  walls: WallOption[]
  selectedWallId: string
  onSelect: (wallId: string) => void
  loading?: boolean
  disabled?: boolean
}

export function SortingWallSelector({
  walls,
  selectedWallId,
  onSelect,
  loading = false,
  disabled = false,
}: SortingWallSelectorProps) {
  const t = useTranslations('sorting')

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('loadingWalls')}</span>
      </div>
    )
  }

  return (
    <Select
      value={selectedWallId}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder={t('selectWall')} />
      </SelectTrigger>
      <SelectContent>
        {walls.map((wall) => (
          <SelectItem key={wall.id} value={wall.id}>
            <div className="flex items-center gap-2">
              <span>{wall.wallName}</span>
              <span className="text-xs text-muted-foreground">
                ({wall.horizontalCells}×{wall.verticalCells})
              </span>
              {wall.sortStatus === 'SORTING' && (
                <span className="text-xs text-orange-500">分拣中</span>
              )}
            </div>
          </SelectItem>
        ))}
        {walls.length === 0 && (
          <div className="py-2 px-3 text-sm text-muted-foreground">
            {t('noWallsAvailable')}
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
