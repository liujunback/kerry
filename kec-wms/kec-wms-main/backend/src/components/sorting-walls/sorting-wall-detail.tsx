'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Pencil, ArrowLeft, Grid3x3, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortingWallStatusBadge } from './sorting-wall-status-badge'

interface SortingCell {
  id: string
  cellCode: string
  cellPosition: string
  rowNumber: number
  columnNumber: number
  status: string
  isActive: boolean
}

interface Allocation {
  id: string
  cellCode: string
  orderNumber: string
  expectedQty: number
  sortedQty: number
  status: string
  allocatedAt: string
  completedAt: string | null
  order: {
    id: string
    orderNumber: string
    status: string
    referenceNumber: string | null
  }
  sortingTask: {
    id: string
    taskNumber: string
    status: string
  }
}

interface TaskLine {
  id: string
  sortingTaskId: string
  orderId: string
  orderNumber: string
  cellCode: string
  expectedQty: number
  sortedQty: number
  status: string
  sku: {
    id: string
    skuCode: string
    skuName: string
  }
}

interface SortingWall {
  id: string
  wallCode: string
  wallName: string
  workstationCode: string | null
  horizontalCells: number
  verticalCells: number
  totalCells: number
  isActive: boolean
  sortStatus: string
  locationCode: string
  remarks: string | null
  createdAt: string
  updatedAt: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  cells: SortingCell[]
}

interface SortingWallDetailProps {
  sortingWall: SortingWall
  allocations: Allocation[]
  taskLines: TaskLine[]
}

export function SortingWallDetail({ sortingWall, allocations, taskLines }: SortingWallDetailProps) {
  const router = useRouter()
  const t = useTranslations('sortingWall')
  const tCommon = useTranslations('common')

  const getCellStatusColor = (status: string) => {
    switch (status) {
      case 'EMPTY': return 'bg-gray-100 border-gray-300 text-gray-700'
      case 'ALLOCATED': return 'bg-blue-100 border-blue-300 text-blue-700'
      case 'SORTING': return 'bg-yellow-100 border-yellow-300 text-yellow-700'
      case 'COMPLETED': return 'bg-green-100 border-green-300 text-green-700'
      default: return 'bg-gray-100 border-gray-300 text-gray-700'
    }
  }

  const getCellStatusText = (status: string) => {
    switch (status) {
      case 'EMPTY': return t('cellStatusEmpty')
      case 'ALLOCATED': return t('cellStatusAllocated')
      case 'SORTING': return t('cellStatusSorting')
      case 'COMPLETED': return t('cellStatusCompleted')
      default: return status
    }
  }

  const getAllocationStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ALLOCATED: 'default',
      SORTING: 'secondary',
      COMPLETED: 'outline',
      RELEASED: 'destructive',
    }
    const labels: Record<string, string> = {
      ALLOCATED: '已分配',
      SORTING: '分拣中',
      COMPLETED: '已完成',
      RELEASED: '已释放',
    }
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>
  }

  const getTaskLineStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'SORTED' ? 'outline' : 'secondary'}>
        {status === 'SORTED' ? '已分拣' : '待分拣'}
      </Badge>
    )
  }

  // 构建格口网格
  const cellGrid: (SortingCell | null)[][] = []
  for (let row = 0; row < sortingWall.verticalCells; row++) {
    cellGrid[row] = []
    for (let col = 0; col < sortingWall.horizontalCells; col++) {
      cellGrid[row][col] = sortingWall.cells.find(
        (c) => c.rowNumber === row + 1 && c.columnNumber === col + 1
      ) || null
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/sorting-walls')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon('back')}
        </Button>
        <Link href={`/sorting-walls/${sortingWall.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
        </Link>
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{sortingWall.wallName}</CardTitle>
              <CardDescription className="mt-1">
                {t('wallCode')}: {sortingWall.wallCode}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <SortingWallStatusBadge status={sortingWall.sortStatus} type="sort" />
              <SortingWallStatusBadge status={sortingWall.isActive ? 'true' : 'false'} type="active" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('warehouse')}</div>
              <div className="font-medium">
                {sortingWall.warehouse.warehouseName} ({sortingWall.warehouse.warehouseCode})
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('workstationCode')}</div>
              <div className="font-medium">{sortingWall.workstationCode || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('cellConfig')}</div>
              <div className="font-medium">
                {sortingWall.horizontalCells} × {sortingWall.verticalCells} = {sortingWall.totalCells}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tCommon('createdAt')}</div>
              <div className="font-medium">{sortingWall.createdAt}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tCommon('updatedAt')}</div>
              <div className="font-medium">{sortingWall.updatedAt}</div>
            </div>
            {sortingWall.remarks && (
              <div className="col-span-2 md:col-span-3">
                <div className="text-sm text-muted-foreground">{t('remarks')}</div>
                <div className="font-medium">{sortingWall.remarks}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab 内容 */}
      <Tabs defaultValue="cells">
        <TabsList>
          <TabsTrigger value="cells" className="gap-2">
            <Grid3x3 className="h-4 w-4" />
            {t('cellGrid')}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            {t('orderAllocations')}
            {allocations.length > 0 && (
              <Badge variant="secondary" className="ml-1">{allocations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 格口网格 Tab */}
        <TabsContent value="cells">
          <Card>
            <CardContent className="pt-6">
              {/* 图例 + 统计 同行 */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap gap-3">
                  {['EMPTY', 'ALLOCATED', 'SORTING', 'COMPLETED'].map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded border-2 ${getCellStatusColor(s)}`} />
                      <span className="text-sm text-muted-foreground">{getCellStatusText(s)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  {[
                    { label: t('totalCells'), value: sortingWall.cells.length, color: 'text-foreground' },
                    { label: getCellStatusText('EMPTY'), value: sortingWall.cells.filter((c) => c.status === 'EMPTY').length, color: 'text-muted-foreground' },
                    { label: getCellStatusText('ALLOCATED'), value: sortingWall.cells.filter((c) => c.status === 'ALLOCATED').length, color: 'text-blue-600' },
                    { label: getCellStatusText('SORTING'), value: sortingWall.cells.filter((c) => c.status === 'SORTING').length, color: 'text-yellow-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/60 border">
                      <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 格口网格 */}
              <div className="overflow-x-auto">
                <div className="inline-block">
                  <div className="space-y-1.5">
                    {cellGrid.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-1.5">
                        {row.map((cell, colIndex) => (
                          <div
                            key={colIndex}
                            className={`
                              relative flex flex-col items-center justify-center
                              w-16 h-16 rounded-lg border-2 transition-all cursor-default
                              ${cell ? getCellStatusColor(cell.status) : 'bg-gray-50 border-gray-200'}
                              ${cell && !cell.isActive ? 'opacity-40' : ''}
                            `}
                            title={cell ? `${cell.cellCode} - ${getCellStatusText(cell.status)}` : ''}
                          >
                            {cell ? (
                              <>
                                <div className="text-base font-bold leading-none">{cell.cellPosition}</div>
                                <div className="text-[10px] mt-1 opacity-70">{cell.cellCode}</div>
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground">-</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订单分配 Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {t('orderAllocations')}
              </CardTitle>
              <CardDescription>{t('orderAllocationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {allocations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  {tCommon('noData')}
                </div>
              ) : (
                allocations.map((allocation) => {
                  const lines = taskLines.filter(
                    (l) => l.sortingTaskId === allocation.sortingTask.id && l.orderId === allocation.order.id
                  )
                  return (
                    <div key={allocation.id} className="border rounded-lg overflow-hidden">
                      {/* 订单头部 */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">{t('cellCode')}: </span>
                            <span className="font-mono font-bold">{allocation.cellCode}</span>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">{t('orderNumber')}: </span>
                            <span className="font-medium">{allocation.orderNumber}</span>
                            {allocation.order.referenceNumber && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({allocation.order.referenceNumber})
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">{t('taskNumber')}: </span>
                            <span className="font-mono text-sm">{allocation.sortingTask.taskNumber}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {allocation.sortedQty}/{allocation.expectedQty}
                          </span>
                          {getAllocationStatusBadge(allocation.status)}
                        </div>
                      </div>

                      {/* SKU 明细 */}
                      {lines.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('skuCode')}</TableHead>
                              <TableHead>{t('skuName')}</TableHead>
                              <TableHead className="text-right">{t('expectedQty')}</TableHead>
                              <TableHead className="text-right">{t('sortedQty')}</TableHead>
                              <TableHead>{tCommon('status')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="font-mono">{line.sku.skuCode}</TableCell>
                                <TableCell>{line.sku.skuName}</TableCell>
                                <TableCell className="text-right">{line.expectedQty}</TableCell>
                                <TableCell className="text-right">{line.sortedQty}</TableCell>
                                <TableCell>{getTaskLineStatusBadge(line.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
