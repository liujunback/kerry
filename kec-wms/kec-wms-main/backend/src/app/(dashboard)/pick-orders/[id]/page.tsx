'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { format } from '@/lib/utils/date-formatter'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Printer, Trash2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PickTaskDetail {
  id: string
  taskNumber: string
  taskType: string
  pickMethod: string | null
  status: string
  priority: number
  assignedUserId: string | null
  startedAt: string | null
  completedAt: string | null
  totalLines: number
  totalQty: number
  pickedQty: number
  targetContainer: string | null
  deviceId: string | null
  notes: string | null
  createdAt: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  wave: {
    id: string
    waveNumber: string
    status: string
  } | null
  lines: PickTaskLine[]
  logs: OperationLog[]
}

interface PickTaskLine {
  id: string
  lineNumber: number
  skuId: string
  skuCode: string
  batchNumber: string | null
  lpn: string | null
  expectedQty: number
  pickedQty: number
  shortQty: number
  status: string
  pickedAt: string | null
  pickedBy: string | null
  notes: string | null
  order: {
    id: string
    orderNumber: string
    referenceNumber: string | null
    orderType: string
    platform: string
    status: string
    client: {
      id: string
      clientCode: string
      clientName: string
    }
  }
  orderLine: {
    id: string
    lineNumber: number
    skuName: string
  }
  location: {
    id: string
    locationCode: string
    zone: {
      id: string
      zoneCode: string
      zoneName: string
      zoneType: string
    }
  }
  sku: {
    id: string
    skuCode: string
    skuName: string
    barcode: string | null
  }
  inventory: {
    id: string
    expiryDate: string | null
  }
}

interface OperationLog {
  id: string
  operationType: string
  operationName: string
  remark: string | null
  operatorId: string | null
  operatorName: string | null
  createdAt: string
}

interface User {
  id: string
  username: string
  fullName: string | null
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export default function PickOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('pickOrderDetail')
  const tCommon = useTranslations('common')

  const [task, setTask] = useState<PickTaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  const fetchTask = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/pick-orders/${id}`)
      const data = await res.json()
      if (data.success) {
        setTask(data.data)
      } else {
        toast.error(data.message || t('fetchFailed'))
      }
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/users?pageSize=100')
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchTask()
    fetchUsers()
  }, [id])

  const handlePrint = async () => {
    try {
      const res = await fetch(`/api/v1/pick-orders/${id}/print`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(t('printSuccess'))
        fetchTask()
      } else {
        toast.error(data.message || t('printFailed'))
      }
    } catch {
      toast.error(t('printFailed'))
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('confirmCancel'))) return
    try {
      const res = await fetch(`/api/v1/pick-orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(t('cancelSuccess'))
        router.push('/pick-orders')
      } else {
        toast.error(data.message || t('cancelFailed'))
      }
    } catch {
      toast.error(t('cancelFailed'))
    }
  }

  const handleAssign = async () => {
    if (!selectedUserId) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/v1/pick-orders/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('assignSuccess'))
        setAssignDialogOpen(false)
        fetchTask()
      } else {
        toast.error(data.message || t('assignFailed'))
      }
    } catch {
      toast.error(t('assignFailed'))
    } finally {
      setAssigning(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm')
  }

  const formatDateOnly = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'yyyy-MM-dd')
  }

  // 按SKU、货位和库存属性汇总明细
  const getLocationSummary = () => {
    if (!task) return []
    const locationMap = new Map<string, {
      skuCode: string
      skuName: string
      barcode: string | null
      clientCode: string
      batchNumber: string | null
      expiryDate: string | null
      locationCode: string
      zoneType: string
      expectedQty: number
      pickedQty: number
      pickedBy: string | null
    }>()

    task.lines.forEach((line) => {
      const key = `${line.skuCode}-${line.location.locationCode}-${line.batchNumber || ''}-${line.inventory?.expiryDate || ''}-${line.location.zone?.zoneType || ''}`
      const existing = locationMap.get(key)
      if (existing) {
        existing.expectedQty += line.expectedQty
        existing.pickedQty += line.pickedQty
      } else {
        locationMap.set(key, {
          skuCode: line.skuCode,
          skuName: line.sku.skuName,
          barcode: line.sku.barcode,
          clientCode: line.order.client.clientCode,
          batchNumber: line.batchNumber,
          expiryDate: line.inventory?.expiryDate || null,
          locationCode: line.location.locationCode,
          zoneType: line.location.zone?.zoneType || '-',
          expectedQty: line.expectedQty,
          pickedQty: line.pickedQty,
          pickedBy: line.pickedBy,
        })
      }
    })

    // 按货位编码排序
    return Array.from(locationMap.values()).sort((a, b) =>
      a.locationCode.localeCompare(b.locationCode)
    )
  }

  // 按SKU汇总明细
  const getSkuSummary = () => {
    if (!task) return []
    const skuMap = new Map<string, {
      skuCode: string
      skuName: string
      clientCode: string
      orderNumber: string
      orderStatus: string
      targetContainer: string | null
      batchNumber: string | null
      expiryDate: string | null
      locationCode: string
      expectedQty: number
      pickedQty: number
    }>()

    task.lines.forEach((line) => {
      const key = `${line.skuCode}-${line.order.orderNumber}-${line.batchNumber || ''}`
      const existing = skuMap.get(key)
      if (existing) {
        existing.expectedQty += line.expectedQty
        existing.pickedQty += line.pickedQty
      } else {
        skuMap.set(key, {
          skuCode: line.skuCode,
          skuName: line.sku.skuName,
          clientCode: line.order.client.clientCode,
          orderNumber: line.order.orderNumber,
          orderStatus: line.order.status,
          targetContainer: task.targetContainer,
          batchNumber: line.batchNumber,
          expiryDate: line.inventory?.expiryDate || null,
          locationCode: line.location.locationCode,
          expectedQty: line.expectedQty,
          pickedQty: line.pickedQty,
        })
      }
    })

    return Array.from(skuMap.values())
  }

  // 获取订单类型（翻译后）
  const getOrderTypes = () => {
    if (!task) return []
    const types = new Set(task.lines.map((l) => l.order.orderType))
    return Array.from(types).map((type) => t(`orderTypes.${type}`) || type)
  }

  // 是否合单
  const isCombined = () => {
    if (!task) return false
    const orderIds = new Set(task.lines.map((l) => l.order.id))
    return orderIds.size > 1
  }

  // 获取渠道
  const getPlatforms = () => {
    if (!task) return []
    const platforms = new Set(task.lines.map((l) => l.order.platform))
    return Array.from(platforms)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('notFound')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/pick-orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
                <UserCog className="mr-2 h-4 w-4" />
                {t('assignOperator')}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                {t('print')}
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('cancel')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">{t('basicInfo')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{t('taskNumber')}</div>
            <div className="font-mono">{task.taskNumber}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('status')}</div>
            <Badge className={statusColors[task.status] || ''}>
              {t(`statuses.${task.status}`)}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('waveNumber')}</div>
            <div>{task.wave?.waveNumber || t('manualCreate')}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('warehouse')}</div>
            <div>{task.warehouse.warehouseName}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('platform')}</div>
            <div>{getPlatforms().join(', ') || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('isCombined')}</div>
            <div>{isCombined() ? tCommon('yes') : tCommon('no')}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('orderType')}</div>
            <div>{getOrderTypes().join(', ') || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('targetContainer')}</div>
            <div>{task.targetContainer || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('startedAt')}</div>
            <div>{formatDate(task.startedAt)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('completedAt')}</div>
            <div>{formatDate(task.completedAt)}</div>
          </div>
        </div>
        {task.pickMethod && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-2">{t('pickMethod')}</div>
            <div>
              <Badge variant="outline">
                {task.pickMethod === 'PAPER' ? t('paperPick') : t('pdaPick')}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* 页签 */}
      <Tabs defaultValue="lines" className="w-full">
        <TabsList>
          <TabsTrigger value="lines">{t('tabLines')}</TabsTrigger>
          <TabsTrigger value="skuSummary">{t('tabSkuSummary')}</TabsTrigger>
          <TabsTrigger value="logs">{t('tabLogs')}</TabsTrigger>
        </TabsList>

        {/* 拣货单明细 */}
        <TabsContent value="lines">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('clientCode')}</TableHead>
                  <TableHead>{t('skuCode')}</TableHead>
                  <TableHead>{t('barcode')}</TableHead>
                  <TableHead>{t('skuName')}</TableHead>
                  <TableHead>{t('batchNumber')}</TableHead>
                  <TableHead>{t('expiryDate')}</TableHead>
                  <TableHead>{t('locationCode')}</TableHead>
                  <TableHead>{t('zoneType')}</TableHead>
                  <TableHead className="text-right">{t('expectedQty')}</TableHead>
                  <TableHead className="text-right">{t('pickedQty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getLocationSummary().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {tCommon('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  getLocationSummary().map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.clientCode}</TableCell>
                      <TableCell className="font-mono text-sm">{item.skuCode}</TableCell>
                      <TableCell className="font-mono text-sm">{item.barcode || '-'}</TableCell>
                      <TableCell>{item.skuName}</TableCell>
                      <TableCell>{item.batchNumber || '-'}</TableCell>
                      <TableCell>{formatDateOnly(item.expiryDate)}</TableCell>
                      <TableCell className="font-mono text-sm">{item.locationCode}</TableCell>
                      <TableCell>{item.zoneType}</TableCell>
                      <TableCell className="text-right">{item.expectedQty}</TableCell>
                      <TableCell className="text-right">{item.pickedQty}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* SKU明细 */}
        <TabsContent value="skuSummary">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('skuCode')}</TableHead>
                  <TableHead>{t('clientCode')}</TableHead>
                  <TableHead>{t('orderNumber')}</TableHead>
                  <TableHead>{t('skuName')}</TableHead>
                  <TableHead>{t('targetContainer')}</TableHead>
                  <TableHead>{t('batchNumber')}</TableHead>
                  <TableHead>{t('expiryDate')}</TableHead>
                  <TableHead>{t('locationCode')}</TableHead>
                  <TableHead className="text-right">{t('expectedQty')}</TableHead>
                  <TableHead className="text-right">{t('pickedQty')}</TableHead>
                  <TableHead>{t('orderStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSkuSummary().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {tCommon('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  getSkuSummary().map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.skuCode}</TableCell>
                      <TableCell>{item.clientCode}</TableCell>
                      <TableCell className="font-mono text-sm">{item.orderNumber}</TableCell>
                      <TableCell>{item.skuName}</TableCell>
                      <TableCell>{item.targetContainer || '-'}</TableCell>
                      <TableCell>{item.batchNumber || '-'}</TableCell>
                      <TableCell>{formatDateOnly(item.expiryDate)}</TableCell>
                      <TableCell className="font-mono text-sm">{item.locationCode}</TableCell>
                      <TableCell className="text-right">{item.expectedQty}</TableCell>
                      <TableCell className="text-right">{item.pickedQty}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.orderStatus] || ''}>
                          {t(`orderStatuses.${item.orderStatus}`) || item.orderStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 操作日志 */}
        <TabsContent value="logs">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t('logNumber')}</TableHead>
                  <TableHead>{t('operationType')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('operator')}</TableHead>
                  <TableHead>{t('operationTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {tCommon('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  task.logs.map((log, idx) => (
                    <TableRow key={log.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{log.operationName}</TableCell>
                      <TableCell>{log.remark || '-'}</TableCell>
                      <TableCell>{log.operatorName || 'system'}</TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* 修改操作人对话框 */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('assignOperator')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectOperator')} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || assigning}>
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
