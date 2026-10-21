'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { formatDate } from '@/lib/utils/date-formatter'

interface OutboundOrder {
  id: string
  orderNumber: string
  orderType: string
  status: string
  priority: string
  totalOrderedQty: number
  totalAllocatedQty: number
  createdAt: string
  client: {
    clientCode: string
    clientName: string
  }
  address?: {
    contactName: string
  }
  _count?: {
    lines: number
  }
}

interface CreateWaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const manualWaveEntryDisabled = true

const priorityColors: Record<string, string> = {
  URGENT: 'bg-red-500 text-white',
  HIGH: 'bg-orange-500 text-white',
  NORMAL: 'bg-blue-500 text-white',
  LOW: 'bg-gray-500 text-white',
}

export function CreateWaveDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWaveDialogProps) {
  const [orders, setOrders] = useState<OutboundOrder[]>([])
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [waveType, setWaveType] = useState<string>('STANDARD')
  const [pickStrategy, setPickStrategy] = useState<string>('ORDER')
  const [search, setSearch] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 获取仓库列表
  useEffect(() => {
    if (open) {
      // WarehouseSelect 组件内部自行加载，无需在此 fetch
    }
  }, [open])

  // 仓库变化时获取订单
  useEffect(() => {
    if (warehouseId) {
      fetchOrders()
      setSelectedOrderIds([])
    } else {
      setOrders([])
    }
  }, [warehouseId])

  const fetchOrders = async () => {
    if (!warehouseId) return
    setOrdersLoading(true)
    try {
      const params = new URLSearchParams({
        warehouseId,
        pageSize: '100',
      })
      // 只获取可加入波次的订单状态
      // ALLOCATED 和 PENDING_WAVE 状态的订单可以加入波次
      if (search) params.set('search', search)

      const res = await fetch(`/api/v1/outbound-orders?${params}`)
      const data = await res.json()
      if (data.success) {
        // 过滤出可加入波次的订单（状态为 ALLOCATED 或 PENDING_WAVE，且未关联波次）
        const availableOrders = data.data.filter(
          (order: OutboundOrder & { waveId?: string }) =>
            ['ALLOCATED', 'PENDING_WAVE'].includes(order.status) && !order.waveId
        )
        setOrders(availableOrders)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOrders()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(orders.map((o) => o.id))
    } else {
      setSelectedOrderIds([])
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds([...selectedOrderIds, orderId])
    } else {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId))
    }
  }

  const handleSubmit = async () => {
    if (manualWaveEntryDisabled) {
      toast.error('手工汇波入口已关闭，请勿再创建手工波次')
      return
    }

    if (!warehouseId || selectedOrderIds.length === 0) {
      toast.error('请选择仓库和订单')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/waves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          waveType,
          pickStrategy,
          orderIds: selectedOrderIds,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`波次 ${data.data.waveNumber} 创建成功`)
        handleClose()
        onSuccess()
      } else {
        toast.error(data.message || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create wave:', error)
      toast.error('创建波次失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setWarehouseId('')
    setWaveType('STANDARD')
    setPickStrategy('ORDER')
    setSelectedOrderIds([])
    setOrders([])
    setSearch('')
    onOpenChange(false)
  }

  // 计算汇总
  const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id))
  const totalQty = selectedOrders.reduce((sum, o) => sum + o.totalOrderedQty, 0)
  const isAllSelected = orders.length > 0 && selectedOrderIds.length === orders.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>新建波次</DialogTitle>
        </DialogHeader>

        {manualWaveEntryDisabled && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            手工汇波入口已关闭，请勿再创建手工波次。
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>仓库 *</Label>
              <WarehouseSelect value={warehouseId} onValueChange={setWarehouseId} />
            </div>
            <div className="space-y-2">
              <Label>波次类型</Label>
              <Select value={waveType} onValueChange={setWaveType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">标准</SelectItem>
                  <SelectItem value="EXPRESS">加急</SelectItem>
                  <SelectItem value="BATCH">批量</SelectItem>
                  <SelectItem value="SINGLE">单品</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>拣货策略</Label>
              <Select value={pickStrategy} onValueChange={setPickStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDER">按单拣货</SelectItem>
                  <SelectItem value="BATCH">批量拣货</SelectItem>
                  <SelectItem value="ZONE">分区拣货</SelectItem>
                  <SelectItem value="CLUSTER">集群拣货</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 订单搜索 */}
          {warehouseId && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="搜索订单号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                可选订单: {orders.length} 单
              </span>
            </div>
          )}

          {/* 订单表格 */}
          <div className="flex-1 border rounded-md overflow-auto min-h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      disabled={orders.length === 0}
                    />
                  </TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>收货人</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!warehouseId ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      请先选择仓库
                    </TableCell>
                  </TableRow>
                ) : ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无可加入波次的订单
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrderIds.includes(order.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOrder(order.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.client?.clientName}</TableCell>
                      <TableCell>{order.address?.contactName || '-'}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[order.priority] || 'bg-gray-500'}>
                          {order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{order.totalOrderedQty}</TableCell>
                      <TableCell>
                        {formatDate(order.createdAt) || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 已选汇总 */}
          {selectedOrderIds.length > 0 && (
            <div className="border rounded-md p-4 bg-muted/50">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  已选: <span className="font-medium">{selectedOrderIds.length}</span> 单
                </div>
                <div>
                  总数量: <span className="font-medium text-primary">{totalQty}</span> 件
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={manualWaveEntryDisabled || !warehouseId || selectedOrderIds.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              `创建波次 (${selectedOrderIds.length} 单)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
