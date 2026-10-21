'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SortingCell } from '@/components/sorting/sorting-cell'
import { SortingCellDetailDialog } from '@/components/sorting/sorting-cell-detail-dialog'
import { type SortingWallInfo, type CellAllocation } from '@/stores/sorting-store'
import { Grid3X3 } from 'lucide-react'

interface SortingWallGridProps {
  wall: SortingWallInfo | null
  cellAllocations: CellAllocation[]
  flashingCell: string | null
  sortingTaskId?: string
}

// 生成格口位置（A1, A2, ..., B1, B2, ...）
function generateCellPositions(horizontal: number, vertical: number): string[] {
  const positions: string[] = []
  for (let row = 0; row < vertical; row++) {
    const rowLetter = String.fromCharCode(65 + row)
    for (let col = 1; col <= horizontal; col++) {
      positions.push(`${rowLetter}${col}`)
    }
  }
  return positions
}

export function SortingWallGrid({
  wall,
  cellAllocations,
  flashingCell,
  sortingTaskId,
}: SortingWallGridProps) {
  const t = useTranslations('sorting')
  const [selectedCell, setSelectedCell] = useState<string | null>(null)

  if (!wall) {
    return (
      <Card className="h-full min-h-[400px]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Grid3X3 className="h-5 w-5" />
            {t('wallGrid')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <Grid3X3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>{t('selectWallToView')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cellPositions = generateCellPositions(wall.horizontalCells, wall.verticalCells)
  const allocationMap = new Map(cellAllocations.map((a) => [a.cellCode, a]))

  // 计算统计信息
  const completedCells = cellAllocations.filter((a) => a.status === 'COMPLETED' || a.status === 'RELEASED').length
  const sortingCells = cellAllocations.filter((a) => a.status === 'SORTING').length
  const totalSorted = cellAllocations.reduce((sum, a) => sum + a.sortedQty, 0)
  const totalExpected = cellAllocations.reduce((sum, a) => sum + a.expectedQty, 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Grid3X3 className="h-5 w-5" />
            {wall.wallName} ({wall.wallCode})
          </CardTitle>
          {cellAllocations.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {t('progress')}: {totalSorted}/{totalExpected} |
              {t('cells')}: {completedCells}/{cellAllocations.length} {t('completed')}
              {sortingCells > 0 && ` | ${sortingCells} ${t('sorting')}`}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${wall.horizontalCells}, minmax(0, 1fr))`,
          }}
        >
          {cellPositions.map((cellPosition) => {
            const allocation = allocationMap.get(cellPosition)
            return (
              <SortingCell
                key={cellPosition}
                cellCode={cellPosition}
                allocation={allocation}
                isFlashing={flashingCell === cellPosition}
                onClick={sortingTaskId ? () => setSelectedCell(cellPosition) : undefined}
              />
            )
          })}
        </div>
      </CardContent>

      {sortingTaskId && selectedCell && (
        <SortingCellDetailDialog
          open={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          sortingTaskId={sortingTaskId}
          cellCode={selectedCell}
          allocation={allocationMap.get(selectedCell)}
        />
      )}
    </Card>
  )
}
