'use client'

import { useState, useEffect, Fragment } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { PutawayOrderStatusBadge } from './putaway-order-status-badge'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { useTranslations } from 'next-intl'

interface PutawayDetail {
  id: string
  detailNumber: string
  quantity: number
  locationCode: string
  containerCode: string | null
  serialNumbers: string[] | null
  putawayAt: string
  putawayBy: string
  deviceType: string
}

interface PutawayOrderLine {
  id: string
  lineNumber: number
  skuCode: string
  skuName: string | null
  status: string
  priority: string
  quantity: number
  putawayQty: number
  remainingQty: number
  batchNumber: string | null
  lotNumber: string | null
  expiryDate: string | null
  sourceLocation: string | null
  targetLocation: string | null
  qualityType: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  container: { containerCode: string } | null
  details: PutawayDetail[]
}

interface PutawayOrderDetail {
  id: string
  putawayOrderNumber: string
  status: string
  putawayMode: string
  totalQty: number
  putawayQty: number
  pendingQty: number
  skuCount: number
  containerCount: number
  lineCount: number
  createdAt: string
  warehouse: { warehouseCode: string; warehouseName: string }
  client: { clientCode: string; clientName: string }
  asn: { asnNumber: string }
  lines: PutawayOrderLine[]
}

interface PutawayOrderDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
}

export function PutawayOrderDetailDialog({
  open,
  onOpenChange,
  orderId,
}: PutawayOrderDetailDialogProps) {
  const t = useTranslations('putaway.orderDetail')
  const [order, setOrder] = useState<PutawayOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetail()
    } else {
      setOrder(null)
      setExpandedLines(new Set())
    }
  }, [open, orderId])

  const fetchOrderDetail = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/putaway/orders/${orderId}`)
      const result = await response.json()
      if (result.success) {
        setOrder(result.data)
      } else {
        toast.error(result.message || t('loadFailed'))
      }
    } catch {
      toast.error(t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'TASK_MODE':
        return t('modes.TASK_MODE')
      case 'CONTAINER_MODE':
        return t('modes.CONTAINER_MODE')
      case 'MIXED_MODE':
        return t('modes.MIXED_MODE')
      default:
        return mode
    }
  }

  const getLineStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">{t('lineStatuses.PENDING')}</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">{t('lineStatuses.IN_PROGRESS')}</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">{t('lineStatuses.COMPLETED')}</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">{t('lineStatuses.CANCELLED')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getQualityBadge = (qualityType: string) => {
    switch (qualityType) {
      case 'GOOD':
        return <Badge className="bg-green-500">{t('qualityTypes.GOOD')}</Badge>
      case 'DAMAGED':
        return <Badge variant="destructive">{t('qualityTypes.DAMAGED')}</Badge>
      default:
        return <Badge variant="secondary">{qualityType}</Badge>
    }
  }

  const toggleLineExpand = (lineId: string) => {
    setExpandedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineId)) {
        next.delete(lineId)
      } else {
        next.add(lineId)
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
              <Skeleton className="h-48" />
            </div>
          ) : order ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
              <div>
                <div className="text-muted-foreground">{t('putawayOrderNumber')}</div>
                <div className="font-medium">{order.putawayOrderNumber}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('asnNumber')}</div>
                <div className="font-medium">{order.asn.asnNumber}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('warehouse')}</div>
                <div className="font-medium">{order.warehouse.warehouseName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('client')}</div>
                <div className="font-medium">{order.client.clientName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('putawayMode')}</div>
                <div className="font-medium">{getModeLabel(order.putawayMode)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('status')}</div>
                <div><PutawayOrderStatusBadge status={order.status} /></div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('qtyInfo')}</div>
                <div className="font-medium">
                  {order.totalQty} / {order.putawayQty} / {order.pendingQty}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('createdAt')}</div>
                <div className="font-medium">
                  {formatDateTime(order.createdAt)}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">{t('linesTitle')} ({order.lines.length})</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-16">{t('lineNumber')}</TableHead>
                      <TableHead className="min-w-[200px]">{t('sku')}</TableHead>
                      <TableHead className="w-24">{t('lineStatus')}</TableHead>
                      <TableHead className="w-20">{t('quality')}</TableHead>
                      <TableHead className="text-right w-20">{t('quantity')}</TableHead>
                      <TableHead className="text-right w-24">{t('putawayQty')}</TableHead>
                      <TableHead className="w-32">{t('batchNumber')}</TableHead>
                      <TableHead className="w-32">{t('targetLocation')}</TableHead>
                      <TableHead className="w-32">{t('container')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          {t('noLines')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      order.lines.map((line) => (
                        <Fragment key={line.id}>
                          <TableRow className="hover:bg-muted/50">
                              <TableCell className="w-12">
                                {line.details.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleLineExpand(line.id)}
                                  >
                                    {expandedLines.has(line.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="w-16">{line.lineNumber}</TableCell>
                              <TableCell className="min-w-[200px]">
                                <div>{line.skuCode}</div>
                                {line.skuName && (
                                  <div className="text-xs text-muted-foreground">{line.skuName}</div>
                                )}
                              </TableCell>
                              <TableCell className="w-24">{getLineStatusBadge(line.status)}</TableCell>
                              <TableCell className="w-20">{getQualityBadge(line.qualityType)}</TableCell>
                              <TableCell className="text-right w-20">{line.quantity}</TableCell>
                              <TableCell className="text-right w-24">{line.putawayQty}</TableCell>
                              <TableCell className="w-32">{line.batchNumber || '-'}</TableCell>
                              <TableCell className="w-32">{line.targetLocation || '-'}</TableCell>
                              <TableCell className="w-32">{line.container?.containerCode || '-'}</TableCell>
                            </TableRow>
                            {expandedLines.has(line.id) && line.details.length > 0 && (
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableCell colSpan={10} className="p-0">
                                  <div className="px-12 py-4 bg-background/50">
                                    <div className="text-sm font-medium mb-3 text-muted-foreground">
                                      {t('detailsTitle')} ({line.details.length})
                                    </div>
                                    <div className="border rounded-md overflow-hidden bg-background">
                                      <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/30">
                                          <TableHead className="w-48">{t('detailNumber')}</TableHead>
                                          <TableHead className="w-32">{t('location')}</TableHead>
                                          <TableHead className="text-right w-20">{t('quantity')}</TableHead>
                                          <TableHead className="w-32">{t('container')}</TableHead>
                                          <TableHead className="w-40">{t('putawayAt')}</TableHead>
                                          <TableHead className="w-24">{t('device')}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {line.details.map((detail) => (
                                          <TableRow key={detail.id}>
                                            <TableCell className="font-mono text-xs">
                                              {detail.detailNumber}
                                            </TableCell>
                                            <TableCell>{detail.locationCode}</TableCell>
                                            <TableCell className="text-right">{detail.quantity}</TableCell>
                                            <TableCell>{detail.containerCode || '-'}</TableCell>
                                            <TableCell>
                                              {formatDateTime(detail.putawayAt)}
                                            </TableCell>
                                            <TableCell>{detail.deviceType}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                            )}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {t('noData')}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
