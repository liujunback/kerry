'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Send, Check, X, Play, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface AdjustmentLine {
  id: string
  skuId: string
  skuCode: string
  locationId: string
  locationCode: string
  batchNumber: string | null
  quantityBefore: number
  quantityChange: number
  quantityAfter: number
  reasonNotes: string | null
  sku?: {
    skuCode: string
    skuName: string
  }
  location?: {
    locationCode: string
  }
}

interface Adjustment {
  id: string
  adjustmentNumber: string
  adjustmentType: string
  status: string
  reason: string
  notes: string | null
  createdAt: string
  approvedAt: string | null
  executedAt: string | null
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  createdByUser: {
    username: string
    fullName: string
  }
  approvedByUser: {
    username: string
    fullName: string
  } | null
  lines: AdjustmentLine[]
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXECUTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export default function AdjustmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const t = useTranslations('common')
  const tAdj = useTranslations('inventory.adjustment')
  const tMenuGroup = useTranslations('menuGroup')
  const router = useRouter()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tAdj('title'), href: '/inventory/adjustments' },
  })

  const [adjustment, setAdjustment] = useState<Adjustment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: string
    title: string
    description: string
  }>({ open: false, action: '', title: '', description: '' })

  useEffect(() => {
    fetchAdjustment()
  }, [id])

  const fetchAdjustment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/inventory/adjustments/${id}`)
      const result = await response.json()

      if (result.success) {
        setAdjustment(result.data)
      } else {
        toast.error(result.message || '获取调整单失败')
      }
    } catch (error) {
      console.error('Failed to fetch adjustment:', error)
      toast.error('获取调整单失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/v1/inventory/adjustments/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ rejectReason: '审批拒绝' }) : undefined,
      })
      const result = await response.json()

      if (result.success) {
        toast.success(result.message || '操作成功')
        fetchAdjustment()
      } else {
        toast.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('操作失败')
    } finally {
      setActionLoading(false)
      setConfirmDialog({ open: false, action: '', title: '', description: '' })
    }
  }

  const openConfirmDialog = (action: string) => {
    const configs: Record<string, { title: string; description: string }> = {
      submit: { title: tAdj('confirmSubmit'), description: tAdj('confirmSubmit') },
      approve: { title: tAdj('confirmApprove'), description: tAdj('confirmApprove') },
      reject: { title: tAdj('confirmReject'), description: tAdj('confirmReject') },
      execute: { title: tAdj('confirmExecute'), description: tAdj('confirmExecute') },
    }
    setConfirmDialog({
      open: true,
      action,
      ...configs[action],
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('loading')}</div>
      </div>
    )
  }

  if (!adjustment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">调整单不存在</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Breadcrumb items={breadcrumb.current(adjustment.adjustmentNumber)} />
          <Badge className={statusColors[adjustment.status] || ''}>
            {tAdj(`statuses.${adjustment.status}` as const)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {adjustment.status === 'DRAFT' && (
            <>
              <Button variant="outline" onClick={() => router.push(`/inventory/adjustments/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                {t('edit')}
              </Button>
              <Button onClick={() => openConfirmDialog('submit')}>
                <Send className="mr-2 h-4 w-4" />
                {tAdj('submit')}
              </Button>
            </>
          )}
          {adjustment.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => openConfirmDialog('reject')}>
                <X className="mr-2 h-4 w-4" />
                {tAdj('reject')}
              </Button>
              <Button onClick={() => openConfirmDialog('approve')}>
                <Check className="mr-2 h-4 w-4" />
                {tAdj('approve')}
              </Button>
            </>
          )}
          {adjustment.status === 'APPROVED' && (
            <Button onClick={() => openConfirmDialog('execute')}>
              <Play className="mr-2 h-4 w-4" />
              {tAdj('execute')}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{tAdj('adjustmentNumber')}</div>
              <div className="font-medium">{adjustment.adjustmentNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tAdj('type')}</div>
              <div className="font-medium">
                <Badge variant="outline">
                  {tAdj(`types.${adjustment.adjustmentType}` as const)}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tAdj('warehouse')}</div>
              <div className="font-medium">{adjustment.warehouse?.warehouseName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tAdj('reason')}</div>
              <div className="font-medium">{adjustment.reason}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tAdj('createdBy')}</div>
              <div className="font-medium">
                {adjustment.createdByUser?.fullName || adjustment.createdByUser?.username}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tAdj('createdAt')}</div>
              <div className="font-medium">{formatDate(adjustment.createdAt) || '-'}</div>
            </div>
            {adjustment.approvedByUser && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">{tAdj('approvedBy')}</div>
                  <div className="font-medium">
                    {adjustment.approvedByUser?.fullName || adjustment.approvedByUser?.username}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{tAdj('approvedAt')}</div>
                  <div className="font-medium">{formatDate(adjustment.approvedAt) || '-'}</div>
                </div>
              </>
            )}
            {adjustment.executedAt && (
              <div>
                <div className="text-sm text-muted-foreground">{tAdj('executedAt')}</div>
                <div className="font-medium">{formatDate(adjustment.executedAt) || '-'}</div>
              </div>
            )}
            {adjustment.notes && (
              <div className="col-span-3">
                <div className="text-sm text-muted-foreground">{tAdj('notes')}</div>
                <div className="font-medium">{adjustment.notes}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{tAdj('line.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{tAdj('line.location')}</TableHead>
                <TableHead>{tAdj('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{tAdj('line.beforeQty')}</TableHead>
                <TableHead className="text-right">{tAdj('line.adjustQty')}</TableHead>
                <TableHead className="text-right">{tAdj('line.afterQty')}</TableHead>
                <TableHead>{tAdj('line.reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustment.lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{line.sku?.skuCode || line.skuCode}</div>
                    <div className="text-sm text-muted-foreground">{line.sku?.skuName}</div>
                  </TableCell>
                  <TableCell>{line.location?.locationCode || line.locationCode || '-'}</TableCell>
                  <TableCell>{line.batchNumber || '-'}</TableCell>
                  <TableCell className="text-right">{line.quantityBefore ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={line.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}>
                      {line.quantityChange > 0 ? '+' : ''}{line.quantityChange}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{line.quantityAfter ?? '-'}</TableCell>
                  <TableCell>{line.reasonNotes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction(confirmDialog.action)}
              disabled={actionLoading}
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
