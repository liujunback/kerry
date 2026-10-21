'use client'

import { useState, useEffect, use } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send, Check, X, Play, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface TransferLine {
  id: string
  lineNumber: number
  skuId: string
  sku: { id: string; code: string; name: string }
  sourceLocationId: string
  sourceLocation: { id: string; code: string; name: string }
  targetLocationId: string
  targetLocation: { id: string; code: string; name: string }
  batchNumber: string | null
  quantity: number
  reason: string | null
  executedAt: string | null
}

interface Transfer {
  id: string
  transferNumber: string
  transferType: string
  status: string
  reason: string
  notes: string | null
  totalItems: number
  totalQuantity: number
  rejectReason: string | null
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  executedAt: string | null
  warehouse: { id: string; name: string; code: string }
  createdByUser: { id: string; name: string } | null
  approvedByUser: { id: string; name: string } | null
  executedByUser: { id: string; name: string } | null
  lines: TransferLine[]
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('common')
  const tTrf = useTranslations('inventory.transfer')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tTrf('title'), href: '/inventory/transfers' },
  })

  const [transfer, setTransfer] = useState<Transfer | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<'submit' | 'approve' | 'reject' | 'execute'>('submit')
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    fetchTransfer()
  }, [id])

  const fetchTransfer = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/inventory/transfers/${id}`)
      const result = await response.json()
      if (result.data) {
        setTransfer(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch transfer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!transfer) return

    setActionLoading(true)
    try {
      const url = `/api/v1/inventory/transfers/${id}/${dialogAction}`
      let body: Record<string, unknown> = {}

      if (dialogAction === 'reject') {
        body = { reason: rejectReason }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.data) {
        toast.success(tTrf(`${dialogAction}Success`))
        fetchTransfer()
      } else {
        toast.error(result.error || '操作失败')
      }
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('操作失败')
    } finally {
      setActionLoading(false)
      setDialogOpen(false)
      setRejectReason('')
    }
  }

  const openDialog = (action: 'submit' | 'approve' | 'reject' | 'execute') => {
    setDialogAction(action)
    setDialogOpen(true)
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

  if (!transfer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">转移单不存在</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(tTrf('detail'))} />
        <div className="flex items-center gap-2">
          {transfer.status === 'DRAFT' && (
            <Button onClick={() => openDialog('submit')}>
              <Send className="mr-2 h-4 w-4" />
              {tTrf('submit')}
            </Button>
          )}
          {transfer.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => openDialog('reject')}>
                <X className="mr-2 h-4 w-4" />
                {tTrf('reject')}
              </Button>
              <Button onClick={() => openDialog('approve')}>
                <Check className="mr-2 h-4 w-4" />
                {tTrf('approve')}
              </Button>
            </>
          )}
          {transfer.status === 'APPROVED' && (
            <Button onClick={() => openDialog('execute')}>
              <Play className="mr-2 h-4 w-4" />
              {tTrf('execute')}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('transferNumber')}</div>
              <div className="font-medium">{transfer.transferNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('type')}</div>
              <Badge variant="outline">{tTrf(`types.${transfer.transferType}` as const)}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('status')}</div>
              <Badge className={statusColors[transfer.status] || ''}>
                {tTrf(`statuses.${transfer.status}` as const)}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('warehouse')}</div>
              <div className="font-medium">{transfer.warehouse?.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('totalQuantity')}</div>
              <div className="font-medium">{transfer.totalQuantity}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('reason')}</div>
              <div className="font-medium">{transfer.reason}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('createdBy')}</div>
              <div className="font-medium">{transfer.createdByUser?.name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tTrf('createdAt')}</div>
              <div className="font-medium">{formatDate(transfer.createdAt) || '-'}</div>
            </div>
            {transfer.approvedByUser && (
              <div>
                <div className="text-sm text-muted-foreground">{tTrf('approvedBy')}</div>
                <div className="font-medium">{transfer.approvedByUser.name}</div>
              </div>
            )}
            {transfer.approvedAt && (
              <div>
                <div className="text-sm text-muted-foreground">{tTrf('approvedAt')}</div>
                <div className="font-medium">{formatDate(transfer.approvedAt) || '-'}</div>
              </div>
            )}
            {transfer.executedByUser && (
              <div>
                <div className="text-sm text-muted-foreground">{tTrf('executedBy')}</div>
                <div className="font-medium">{transfer.executedByUser.name}</div>
              </div>
            )}
            {transfer.executedAt && (
              <div>
                <div className="text-sm text-muted-foreground">{tTrf('executedAt')}</div>
                <div className="font-medium">{formatDate(transfer.executedAt) || '-'}</div>
              </div>
            )}
          </div>
          {transfer.notes && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">{tTrf('notes')}</div>
              <div className="font-medium">{transfer.notes}</div>
            </div>
          )}
          {transfer.rejectReason && (
            <div className="mt-4 p-3 bg-red-50 rounded-md">
              <div className="text-sm text-red-600 font-medium">拒绝原因</div>
              <div className="text-red-700">{transfer.rejectReason}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{tTrf('line.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{tTrf('line.sourceLocation')}</TableHead>
                <TableHead>{tTrf('line.targetLocation')}</TableHead>
                <TableHead>{tTrf('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{tTrf('line.quantity')}</TableHead>
                <TableHead>{tTrf('line.reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfer.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.lineNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{line.sku?.code}</div>
                    <div className="text-sm text-muted-foreground">{line.sku?.name}</div>
                  </TableCell>
                  <TableCell>{line.sourceLocation?.code}</TableCell>
                  <TableCell>{line.targetLocation?.code}</TableCell>
                  <TableCell>{line.batchNumber || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{line.quantity}</TableCell>
                  <TableCell>{line.reason || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'submit' && tTrf('confirmSubmit')}
              {dialogAction === 'approve' && tTrf('confirmApprove')}
              {dialogAction === 'reject' && tTrf('confirmReject')}
              {dialogAction === 'execute' && tTrf('confirmExecute')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'reject' && (
                <div className="mt-4 space-y-2">
                  <Label>拒绝原因 *</Label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请输入拒绝原因"
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading || (dialogAction === 'reject' && !rejectReason)}
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
