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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Unlock, Snowflake } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface FreezeLine {
  id: string
  lineNumber: number
  skuId: string
  sku: { id: string; code: string; name: string }
  locationId: string
  location: { id: string; code: string; name: string }
  batchNumber: string | null
  quantity: number
  frozenQuantity: number
  releasedQuantity: number
  reason: string | null
  releasedAt: string | null
}

interface Freeze {
  id: string
  freezeNumber: string
  freezeType: string
  status: string
  reason: string
  notes: string | null
  totalItems: number
  totalQuantity: number
  releaseReason: string | null
  createdAt: string
  releasedAt: string | null
  warehouse: { id: string; name: string; code: string }
  createdByUser: { id: string; name: string } | null
  releasedByUser: { id: string; name: string } | null
  lines: FreezeLine[]
}

const statusColors: Record<string, string> = {
  FROZEN: 'bg-blue-100 text-blue-800',
  RELEASED: 'bg-green-100 text-green-800',
}

const typeColors: Record<string, string> = {
  QC_HOLD: 'bg-yellow-100 text-yellow-800',
  DEFECTIVE_HOLD: 'bg-red-100 text-red-800',
  EXPIRY_HOLD: 'bg-orange-100 text-orange-800',
  RECALL_HOLD: 'bg-purple-100 text-purple-800',
  COUNT_HOLD: 'bg-gray-100 text-gray-800',
  MANUAL_HOLD: 'bg-blue-100 text-blue-800',
}

export default function FreezeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('common')
  const tFrz = useTranslations('inventory.freeze')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tFrz('title'), href: '/inventory/freezes' },
  })

  const [freeze, setFreeze] = useState<Freeze | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [releaseType, setReleaseType] = useState('RELEASE')
  const [releaseReason, setReleaseReason] = useState('')

  useEffect(() => {
    fetchFreeze()
  }, [id])

  const fetchFreeze = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/inventory/freezes/${id}`)
      const result = await response.json()
      if (result.data) {
        setFreeze(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch freeze:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async () => {
    if (!freeze || !releaseReason) {
      toast.error('请输入解冻原因')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/v1/inventory/freezes/${id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseType,
          reason: releaseReason,
        }),
      })

      const result = await response.json()

      if (result.data) {
        toast.success(tFrz('releaseSuccess'))
        fetchFreeze()
      } else {
        toast.error(result.error || '操作失败')
      }
    } catch (error) {
      console.error('Release failed:', error)
      toast.error('操作失败')
    } finally {
      setActionLoading(false)
      setDialogOpen(false)
      setReleaseReason('')
    }
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

  if (!freeze) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">冻结单不存在</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(tFrz('detail'))} />
        <div className="flex items-center gap-2">
          {freeze.status === 'FROZEN' && (
            <Button onClick={() => setDialogOpen(true)}>
              <Unlock className="mr-2 h-4 w-4" />
              {tFrz('release')}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('freezeNumber')}</div>
              <div className="font-medium">{freeze.freezeNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('type')}</div>
              <Badge className={typeColors[freeze.freezeType] || ''}>
                {tFrz(`types.${freeze.freezeType}` as const)}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('status')}</div>
              <Badge className={statusColors[freeze.status] || ''}>
                {tFrz(`statuses.${freeze.status}` as const)}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('warehouse')}</div>
              <div className="font-medium">{freeze.warehouse?.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('totalQuantity')}</div>
              <div className="font-medium">{freeze.totalQuantity}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('reason')}</div>
              <div className="font-medium">{freeze.reason}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('createdBy')}</div>
              <div className="font-medium">{freeze.createdByUser?.name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{tFrz('createdAt')}</div>
              <div className="font-medium">{formatDate(freeze.createdAt) || '-'}</div>
            </div>
            {freeze.releasedByUser && (
              <div>
                <div className="text-sm text-muted-foreground">{tFrz('releasedBy')}</div>
                <div className="font-medium">{freeze.releasedByUser.name}</div>
              </div>
            )}
            {freeze.releasedAt && (
              <div>
                <div className="text-sm text-muted-foreground">{tFrz('releasedAt')}</div>
                <div className="font-medium">{formatDate(freeze.releasedAt) || '-'}</div>
              </div>
            )}
          </div>
          {freeze.notes && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">{tFrz('notes')}</div>
              <div className="font-medium">{freeze.notes}</div>
            </div>
          )}
          {freeze.releaseReason && (
            <div className="mt-4 p-3 bg-green-50 rounded-md">
              <div className="text-sm text-green-600 font-medium">{tFrz('releaseReason')}</div>
              <div className="text-green-700">{freeze.releaseReason}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freeze Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{tFrz('line.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{tFrz('line.location')}</TableHead>
                <TableHead>{tFrz('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{tFrz('line.frozenQuantity')}</TableHead>
                <TableHead className="text-right">{tFrz('line.releasedQuantity')}</TableHead>
                <TableHead>{tFrz('line.reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freeze.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.lineNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{line.sku?.code}</div>
                    <div className="text-sm text-muted-foreground">{line.sku?.name}</div>
                  </TableCell>
                  <TableCell>{line.location?.code}</TableCell>
                  <TableCell>{line.batchNumber || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{line.frozenQuantity}</TableCell>
                  <TableCell className="text-right font-medium">{line.releasedQuantity || 0}</TableCell>
                  <TableCell>{line.reason || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Release Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tFrz('confirmRelease')}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>{tFrz('releaseType')} *</Label>
                  <Select value={releaseType} onValueChange={setReleaseType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RELEASE">{tFrz('releaseTypes.RELEASE')}</SelectItem>
                      <SelectItem value="TO_DEFECTIVE">{tFrz('releaseTypes.TO_DEFECTIVE')}</SelectItem>
                      <SelectItem value="SCRAP">{tFrz('releaseTypes.SCRAP')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tFrz('releaseReason')} *</Label>
                  <Input
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                    placeholder="请输入解冻原因"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRelease}
              disabled={actionLoading || !releaseReason}
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
