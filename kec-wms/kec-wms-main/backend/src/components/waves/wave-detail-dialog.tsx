'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface OrderLine {
  id: string
  skuId: string
  skuCode: string
  skuName: string | null
  orderedQty: number
  allocatedQty: number
  pickedQty: number
}

interface WaveOrder {
  id: string
  orderNumber: string
  status: string
  totalOrderedQty: number
  totalPickedQty: number
  address?: {
    contactName: string
  }
  lines: OrderLine[]
}

interface PickOrder {
  id: string
  taskNumber: string
  status: string
  totalQty: number
  pickedQty: number
}

interface WaveDetail {
  id: string
  waveNumber: string
  waveType: string
  status: string
  priority: number
  pickStrategy: string
  totalOrders: number
  totalLines: number
  totalQty: number
  totalSkuCount: number
  pickedOrders: number
  pickedQty: number
  plannedStartAt: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  notes: string | null
  createdAt: string
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  orders: WaveOrder[]
  pickOrders: PickOrder[]
}

interface WaveDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waveId: string | null
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-500 text-white',
  RELEASED: 'bg-blue-500 text-white',
  PICKING: 'bg-purple-500 text-white',
  PICKED: 'bg-indigo-500 text-white',
  SORTING: 'bg-orange-500 text-white',
  COMPLETED: 'bg-green-500 text-white',
  CANCELLED: 'bg-red-500 text-white',
  PENDING: 'bg-yellow-500 text-white',
  ALLOCATED: 'bg-blue-500 text-white',
  IN_WAVE: 'bg-cyan-500 text-white',
}

interface SkuSummary {
  skuId: string
  skuCode: string
  skuName: string | null
  orderedQty: number
  allocatedQty: number
  pickedQty: number
  orderCount: number
}

function aggregateSkuData(orders: WaveOrder[]): SkuSummary[] {
  const skuMap = new Map<string, SkuSummary>()

  for (const order of orders) {
    for (const line of order.lines) {
      const existing = skuMap.get(line.skuId)
      if (existing) {
        existing.orderedQty += line.orderedQty
        existing.allocatedQty += line.allocatedQty
        existing.pickedQty += line.pickedQty
        existing.orderCount += 1
      } else {
        skuMap.set(line.skuId, {
          skuId: line.skuId,
          skuCode: line.skuCode,
          skuName: line.skuName,
          orderedQty: line.orderedQty,
          allocatedQty: line.allocatedQty,
          pickedQty: line.pickedQty,
          orderCount: 1,
        })
      }
    }
  }

  return Array.from(skuMap.values()).sort((a, b) => b.orderedQty - a.orderedQty)
}

export function WaveDetailDialog({
  open,
  onOpenChange,
  waveId,
}: WaveDetailDialogProps) {
  const t = useTranslations('outbound.wave')
  const tOrder = useTranslations('outbound.order')
  const tCommon = useTranslations('common')
  const tPickTask = useTranslations('outbound.pickTask')
  const [wave, setWave] = useState<WaveDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && waveId) {
      fetchWaveDetail()
    }
  }, [open, waveId])

  const fetchWaveDetail = async () => {
    if (!waveId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/waves/${waveId}`)
      const data = await res.json()
      if (data.success) {
        setWave(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch wave detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setWave(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('detail')} {wave && `- ${wave.waveNumber}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : wave ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-4 gap-4 p-4 border rounded-md bg-muted/30">
              <div>
                <div className="text-sm text-muted-foreground">{t('status')}</div>
                <Badge className={statusColors[wave.status] || 'bg-gray-500'}>
                  {t(`statuses.${wave.status}`)}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('warehouse')}</div>
                <div className="font-medium">{wave.warehouse.warehouseName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('waveType')}</div>
                <div className="font-medium">{t(`types.${wave.waveType}`)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('pickStrategy')}</div>
                <div className="font-medium">{t(`pickStrategies.${wave.pickStrategy}`)}</div>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-5 gap-4 p-4 border rounded-md">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{wave.totalOrders}</div>
                <div className="text-sm text-muted-foreground">{t('totalOrders')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{wave.totalLines}</div>
                <div className="text-sm text-muted-foreground">{t('totalLines')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{wave.totalQty}</div>
                <div className="text-sm text-muted-foreground">{t('totalQty')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{wave.pickedQty}</div>
                <div className="text-sm text-muted-foreground">{t('pickedQty')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{wave.totalSkuCount}</div>
                <div className="text-sm text-muted-foreground">{t('totalSkuCount')}</div>
              </div>
            </div>

            {/* 订单和任务列表 */}
            <Tabs defaultValue="orders" className="flex-1 flex flex-col overflow-hidden">
              <TabsList>
                <TabsTrigger value="orders">{t('orderList')} ({wave.orders.length})</TabsTrigger>
                <TabsTrigger value="sku">{t('skuSummary')} ({wave.totalSkuCount})</TabsTrigger>
                <TabsTrigger value="tasks">{t('pickTaskList')} ({wave.pickOrders.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="flex-1 overflow-auto border rounded-md mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('orderNumber')}</TableHead>
                      <TableHead>{t('consignee')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="text-right">{t('orderedQty')}</TableHead>
                      <TableHead className="text-right">{t('pickedQty')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wave.orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('noOrders')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      wave.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.address?.contactName || '-'}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[order.status] || 'bg-gray-500'}>
                              {tOrder(`statuses.${order.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{order.totalOrderedQty}</TableCell>
                          <TableCell className="text-right">{order.totalPickedQty}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="sku" className="flex-1 overflow-auto border rounded-md mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('skuCode')}</TableHead>
                      <TableHead>{t('skuName')}</TableHead>
                      <TableHead className="text-right">{t('orderCount')}</TableHead>
                      <TableHead className="text-right">{t('orderedQty')}</TableHead>
                      <TableHead className="text-right">{t('allocatedQty')}</TableHead>
                      <TableHead className="text-right">{t('pickedQty')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const skuList = aggregateSkuData(wave.orders)
                      if (skuList.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              {t('noSkuData')}
                            </TableCell>
                          </TableRow>
                        )
                      }
                      return skuList.map((sku) => (
                        <TableRow key={sku.skuId}>
                          <TableCell className="font-medium">{sku.skuCode}</TableCell>
                          <TableCell>{sku.skuName || '-'}</TableCell>
                          <TableCell className="text-right">{sku.orderCount}</TableCell>
                          <TableCell className="text-right">{sku.orderedQty}</TableCell>
                          <TableCell className="text-right">{sku.allocatedQty}</TableCell>
                          <TableCell className="text-right">{sku.pickedQty}</TableCell>
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="tasks" className="flex-1 overflow-auto border rounded-md mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tPickTask('taskNumber')}</TableHead>
                      <TableHead>{tPickTask('status')}</TableHead>
                      <TableHead className="text-right">{tPickTask('totalQty')}</TableHead>
                      <TableHead className="text-right">{tPickTask('pickedQty')}</TableHead>
                      <TableHead className="text-right">{t('progress')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wave.pickOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('noPickTasks')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      wave.pickOrders.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.taskNumber}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[task.status] || 'bg-gray-500'}>
                              {tPickTask(`statuses.${task.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{task.totalQty}</TableCell>
                          <TableCell className="text-right">{task.pickedQty}</TableCell>
                          <TableCell className="text-right">
                            {task.totalQty > 0
                              ? `${Math.round((task.pickedQty / task.totalQty) * 100)}%`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>

            {/* 时间信息 */}
            {(wave.plannedStartAt || wave.actualStartAt || wave.actualEndAt) && (
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-md text-sm">
                {wave.plannedStartAt && (
                  <div>
                    <span className="text-muted-foreground">{t('plannedStart')}: </span>
                    <span>{formatDateTime(wave.plannedStartAt) || '-'}</span>
                  </div>
                )}
                {wave.actualStartAt && (
                  <div>
                    <span className="text-muted-foreground">{t('actualStart')}: </span>
                    <span>{formatDateTime(wave.actualStartAt) || '-'}</span>
                  </div>
                )}
                {wave.actualEndAt && (
                  <div>
                    <span className="text-muted-foreground">{t('completedTime')}: </span>
                    <span>{formatDateTime(wave.actualEndAt) || '-'}</span>
                  </div>
                )}
              </div>
            )}

            {/* 备注 */}
            {wave.notes && (
              <div className="p-4 border rounded-md">
                <div className="text-sm text-muted-foreground mb-1">{t('notes')}</div>
                <div>{wave.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
            {t('notFound')}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
