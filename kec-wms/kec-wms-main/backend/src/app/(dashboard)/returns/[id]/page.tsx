'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ClipboardEdit } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  QualityBadge,
  ReturnStatusBadge,
  ReturnTypeBadge,
  useReturnLabels,
} from '@/components/returns/return-labels'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'

const compactBadgeClassName = 'w-fit justify-self-start px-1.5 py-0 text-[11px] leading-4'

interface ReturnLine {
  id: string
  returnLineNo: string
  skuCode: string
  skuName: string | null
  expectedQty: number
  countedQty: number
  putawayQty: number
  quality: string | null
  batchNumber: string | null
  expiryDate: string | null
  containerCode: string | null
  tempLocationCode: string | null
  photoUrls: string[] | null
  status: string
  dispositions: Array<{
    id: string
    action: string
    quantity: number
    putawayQty: number
    remainingQty: number
    status: string
  }>
}

interface ReturnOrder {
  id: string
  returnNo: string
  returnType: string
  logisticsNo: string
  preReturnNo: string | null
  outboundOrderNo: string | null
  platformOrderNo: string | null
  status: string
  signTime: string | null
  countCompleteTime: string | null
  strategyReceivedTime: string | null
  completeTime: string | null
  totalExpectedQty: number
  totalCountedQty: number
  totalPutawayQty: number
  client?: { clientCode: string; clientName: string } | null
  warehouse?: { warehouseCode: string; warehouseName: string } | null
  lines: ReturnLine[]
  putawayOrders: Array<{ id: string; putawayOrderNumber: string; status: string; totalQty: number; putawayQty: number; pendingQty: number }>
}

export default function ReturnDetailPage() {
  const params = useParams<{ id: string }>()
  const t = useTranslations('returns')
  const tCommon = useTranslations('common')
  const { dispositionLabels } = useReturnLabels()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.returns'), href: '/returns' }],
    module: { label: t('detail.title'), href: `/returns/${params.id}` },
  })
  const [order, setOrder] = useState<ReturnOrder | null>(null)
  const [dialogLine, setDialogLine] = useState<ReturnLine | null>(null)
  const [action, setAction] = useState('GOOD_PUTAWAY')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)

  const fetchDetail = useCallback(async () => {
    const response = await fetch(`/api/v1/returns/${params.id}`)
    const payload = await response.json()
    if (!payload.success) {
      toast.error(payload.message || t('detail.fetchFailed'))
      return
    }
    setOrder(payload.data)
  }, [params.id, t])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const saveDisposition = async () => {
    if (!dialogLine) return
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/returns/${params.id}/dispositions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ returnLineId: dialogLine.id, action, quantity: Number(quantity) }],
        }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || tCommon('error'))
      toast.success(t('detail.dispositionSaved'))
      setDialogLine(null)
      await fetchDetail()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('error'))
    } finally {
      setSaving(false)
    }
  }

  if (!order) return <div className="p-6 text-sm text-muted-foreground">{tCommon('loading')}</div>

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(order.returnNo)} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{order.returnNo}</h1>
          <p className="text-sm text-muted-foreground">{t('detail.logisticsNoLine', { logisticsNo: order.logisticsNo })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/returns/counting?logisticsNo=${encodeURIComponent(order.logisticsNo)}`}>{t('counting.shortTitle')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/returns/putaway/create">{t('putawayCreate.createButton')}</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('detail.basicInfo')}
            <ReturnTypeBadge type={order.returnType} />
            <ReturnStatusBadge status={order.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <Info label={tCommon('client')} value={order.client ? `${order.client.clientCode} / ${order.client.clientName}` : '-'} />
          <Info label={tCommon('warehouse')} value={order.warehouse ? `${order.warehouse.warehouseCode} / ${order.warehouse.warehouseName}` : '-'} />
          <Info label={t('fields.preReturnNo')} value={order.preReturnNo || '-'} />
          <Info label={t('fields.outboundOrderNo')} value={order.outboundOrderNo || '-'} />
          <Info label={t('fields.platformOrderNo')} value={order.platformOrderNo || '-'} />
          <Info label={t('fields.signTime')} value={order.signTime ? formatDateTime(order.signTime) : '-'} />
          <Info label={t('fields.countCompleteTime')} value={order.countCompleteTime ? formatDateTime(order.countCompleteTime) : '-'} />
          <Info label={t('fields.strategyReceivedTime')} value={order.strategyReceivedTime ? formatDateTime(order.strategyReceivedTime) : '-'} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.linesTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border">
            <div className="grid grid-cols-8 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
              <span>{t('fields.lineNo')}</span>
              <span>SKU</span>
              <span>{t('fields.qtyProgress')}</span>
              <span>{t('fields.quality')}</span>
              <span>{t('fields.batchExpiry')}</span>
              <span>{t('fields.containerTemp')}</span>
              <span>{tCommon('status')}</span>
              <span className="justify-self-end">{tCommon('actions')}</span>
            </div>
            {order.lines.map((line) => {
              const remainingDispositionQty = Math.max(
                0,
                line.countedQty - line.dispositions.reduce((sum, item) => sum + item.quantity, 0),
              )
              const canSetDisposition = remainingDispositionQty > 0 && line.status !== 'COMPLETED'

              return (
                <div key={line.id} className="grid grid-cols-8 items-center px-3 py-2 text-sm">
                  <span>{line.returnLineNo}</span>
                  <span>{line.skuCode}</span>
                  <span>{line.expectedQty} / {line.countedQty} / {line.putawayQty}</span>
                  <QualityBadge quality={line.quality} className={compactBadgeClassName} />
                  <span>{line.batchNumber || '-'} / {line.expiryDate ? line.expiryDate.slice(0, 10) : '-'}</span>
                  <span>{line.containerCode || '-'} / {line.tempLocationCode || '-'}</span>
                  <ReturnStatusBadge status={line.status} className={compactBadgeClassName} />
                  <div className="grid justify-items-end gap-1">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 whitespace-nowrap px-3 text-xs font-semibold shadow-sm"
                      disabled={!canSetDisposition}
                      title={t('detail.dispositionAction')}
                      onClick={() => {
                        setDialogLine(line)
                        setAction(line.quality === 'DAMAGED' ? 'DAMAGED_PUTAWAY' : 'GOOD_PUTAWAY')
                        setQuantity(String(Math.max(1, remainingDispositionQty)))
                      }}
                    >
                      <ClipboardEdit className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('detail.dispositionAction')}
                    </Button>
                    <span className="whitespace-nowrap text-[11px] leading-3 text-muted-foreground">
                      {t('detail.remainingDispositionQty', { quantity: remainingDispositionQty })}
                    </span>
                  </div>
                  {line.dispositions.length > 0 && (
                    <div className="col-span-8 mt-2 rounded bg-muted/40 p-2 text-xs">
                      {line.dispositions.map((item) => (
                        <span key={item.id} className="mr-4">
                          {t('detail.dispositionSummary', {
                            action: dispositionLabels[item.action] || item.action,
                            quantity: item.quantity,
                            putawayQty: item.putawayQty,
                            status: item.status,
                          })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('putaway.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.putawayOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('detail.noPutawayOrders')}</div>
          ) : order.putawayOrders.map((putaway) => (
            <div key={putaway.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{putaway.putawayOrderNumber}</span>
              <span>{putaway.putawayQty} / {putaway.totalQty}</span>
              <span>{putaway.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={!!dialogLine} onOpenChange={(open) => !open && setDialogLine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.dispositionDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="text-sm text-muted-foreground">{t('detail.countedSummary', { sku: dialogLine?.skuCode || '-', quantity: dialogLine?.countedQty || 0 })}</div>
            <div className="grid gap-2">
              <Label>{t('fields.disposition')}</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD_PUTAWAY">{dispositionLabels.GOOD_PUTAWAY}</SelectItem>
                  <SelectItem value="DAMAGED_PUTAWAY">{dispositionLabels.DAMAGED_PUTAWAY}</SelectItem>
                  <SelectItem value="DESTROY">{dispositionLabels.DESTROY}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('fields.quantity')}</Label>
              <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogLine(null)}>{tCommon('cancel')}</Button>
            <Button onClick={saveDisposition} disabled={saving}>{tCommon('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
