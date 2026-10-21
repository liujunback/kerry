'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-formatter'

interface PutawayOrderProgress {
  totalQty: number
  putawayQty: number
  pendingQty: number
  percentage: number
  taskCount: number
  completedTaskCount: number
}

interface PutawayTask {
  id: string
  putawayTaskNumber: string
  skuId: string
  skuCode: string
  skuName: string | null
  status: string
  quantity: number
  putawayQty: number
  remainingQty: number
  batchNumber: string | null
  expiryDate: string | null
  qualityType: string
  containerId: string | null
  container: {
    id: string
    containerCode: string
  } | null
  isSerialManaged?: boolean
  serialNumbers?: string[]
}

interface PutawayOrderInfo {
  id: string
  putawayOrderNumber: string
  status: string
  totalQty: number
  putawayQty: number
  pendingQty: number
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  asn: {
    asnNumber: string
  }
  putawayTasks: PutawayTask[]
  progress: PutawayOrderProgress
}

interface PutawayOrderCardProps {
  order: PutawayOrderInfo
  currentSkuId?: string | null
}

const statusColorMap: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

const taskStatusColorMap: Record<string, string> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'outline',
}

export function PutawayOrderCard({ order, currentSkuId }: PutawayOrderCardProps) {
  const t = useTranslations('shelving')
  const tPutaway = useTranslations('putaway')

  // 格式化日期
  const formatDateOrNull = (dateStr: string | null): string | null => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return formatDate(date)
  }

  // 排序任务列表：当前选中的SKU置顶
  const sortedTasks = useMemo(() => {
    if (!order.putawayTasks || !currentSkuId) return order.putawayTasks
    return [...order.putawayTasks].sort((a, b) => {
      const aMatch = a.skuId === currentSkuId ? 1 : 0
      const bMatch = b.skuId === currentSkuId ? 1 : 0
      return bMatch - aMatch
    })
  }, [order.putawayTasks, currentSkuId])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('putawayOrder.title')}</CardTitle>
          </div>
          <Badge className={statusColorMap[order.status] || 'bg-gray-100'}>
            {tPutaway(`statuses.${order.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 上架单信息 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">{t('putawayOrder.orderNumber')}:</span>
            <span className="ml-1 font-medium">{order.putawayOrderNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('putawayOrder.asnNumber')}:</span>
            <span className="ml-1">{order.asn.asnNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('putawayOrder.warehouse')}:</span>
            <span className="ml-1">{order.warehouse.warehouseName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('putawayOrder.client')}:</span>
            <span className="ml-1">{order.client.clientName}</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('putawayOrder.progress')}</span>
            <span className="font-medium">{order.progress.percentage}%</span>
          </div>
          <Progress value={order.progress.percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('putawayOrder.putawayQty')}: {order.progress.putawayQty}</span>
            <span>{t('putawayOrder.pendingQty')}: {order.progress.pendingQty}</span>
            <span>{t('putawayOrder.totalQty')}: {order.progress.totalQty}</span>
          </div>
        </div>

        {/* 任务列表 */}
        {sortedTasks && sortedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t('putawayOrder.taskList')}（{order.progress.completedTaskCount}/{order.progress.taskCount}）
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {sortedTasks.map((task) => {
                const isActive = currentSkuId && task.skuId === currentSkuId
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2 rounded-md text-sm ${
                      isActive
                        ? 'bg-orange-50 border-2 border-orange-400'
                        : 'bg-muted/50'
                    }`}
                  >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.skuCode}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {task.skuName}
                      {task.container && ` | ${task.container.containerCode}`}
                    </div>
                    <div className="text-xs truncate">
                      {task.qualityType && (
                        <span className={task.qualityType === 'QUALIFIED' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {task.qualityType === 'QUALIFIED' ? '良品' : task.qualityType === 'DEFECTIVE' ? '次品' : task.qualityType}
                        </span>
                      )}
                      {task.qualityType && task.batchNumber && <span className="text-muted-foreground"> | </span>}
                      {task.batchNumber && (
                        <span className="text-blue-600 font-medium">批次: {task.batchNumber}</span>
                      )}
                      {(task.qualityType || task.batchNumber) && task.expiryDate && <span className="text-muted-foreground"> | </span>}
                      {task.expiryDate && (
                        <span className="text-orange-600 font-medium">效期: {formatDateOrNull(task.expiryDate) || '-'}</span>
                      )}
                      {task.isSerialManaged && task.serialNumbers && task.serialNumbers.length > 0 && (
                        <>
                          {(task.qualityType || task.batchNumber || task.expiryDate) && <span className="text-muted-foreground"> | </span>}
                          <span className="text-muted-foreground">序列号: {task.serialNumbers.length}个</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs">
                      {task.putawayQty}/{task.quantity}
                    </span>
                    <Badge variant={taskStatusColorMap[task.status] as 'secondary' | 'default' | 'outline'}>
                      {tPutaway(`orderDetail.lineStatuses.${task.status}`)}
                    </Badge>
                  </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
