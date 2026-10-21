'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { HelpCircle, MapPin, PackageCheck, Plus, ScanLine, Search } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ReturnStatusBadge, useReturnLabels } from '@/components/returns/return-labels'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

const compactBadgeClassName = 'w-fit justify-self-start px-1.5 py-0 text-[11px] leading-4'

interface PutawayOrder {
  id: string
  putawayOrderNumber: string
  status: string
  totalQty: number
  putawayQty: number
  pendingQty: number
  returnOrder: { returnNo: string; logisticsNo: string }
  lines: Array<{
    id: string
    skuCode: string
    barcode: string | null
    quality: string
    action: string
    remainingQty: number
    containerCode: string | null
    status: string
  }>
}

export default function ReturnPutawayPage() {
  const t = useTranslations('returns')
  const { dispositionLabels, qualityLabels } = useReturnLabels()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.returns'), href: '/returns' }],
    module: { label: t('putaway.title'), href: '/returns/putaway' },
  })
  const [orders, setOrders] = useState<PutawayOrder[]>([])
  const [putawayOrderNumber, setPutawayOrderNumber] = useState('')
  const [containerCode, setContainerCode] = useState('')
  const [logisticsNo, setLogisticsNo] = useState('')
  const [barcode, setBarcode] = useState('')
  const [quality, setQuality] = useState<'GOOD' | 'DAMAGED'>('GOOD')
  const [quantity, setQuantity] = useState('1')
  const [targetLocationCode, setTargetLocationCode] = useState('')
  const [saving, setSaving] = useState(false)
  const putawayOrderNumberInputRef = useRef<HTMLInputElement>(null)

  const fetchOrders = async () => {
    const response = await fetch('/api/v1/returns/putaway/orders')
    const payload = await response.json()
    const nextOrders = payload.success ? (payload.data || []) : []
    setOrders(nextOrders)
    return nextOrders as PutawayOrder[]
  }

  const fillFromPutawayOrder = (order: PutawayOrder) => {
    const line = order.lines.find((item) => item.status !== 'COMPLETED' && item.remainingQty > 0)
    setPutawayOrderNumber(order.putawayOrderNumber)
    setLogisticsNo(order.returnOrder.logisticsNo)

    if (!line) {
      setContainerCode('')
      setBarcode('')
      setQuantity('1')
      toast.error(t('putaway.noPendingLines'))
      return
    }

    setContainerCode(line.containerCode || '')
    setBarcode(line.barcode || line.skuCode)
    setQuality(line.quality === 'DAMAGED' ? 'DAMAGED' : 'GOOD')
    setQuantity(String(line.remainingQty || 1))
  }

  const clearPutawayForm = () => {
    setPutawayOrderNumber('')
    setContainerCode('')
    setLogisticsNo('')
    setBarcode('')
    setQuality('GOOD')
    setQuantity('1')
    setTargetLocationCode('')
    requestAnimationFrame(() => {
      putawayOrderNumberInputRef.current?.focus()
    })
  }

  const scanPutawayOrder = async () => {
    const targetNumber = putawayOrderNumber.trim()
    if (!targetNumber) {
      toast.error(t('putaway.scanOrderRequired'))
      return
    }

    let matchedOrder = orders.find((order) => order.putawayOrderNumber === targetNumber)
    if (!matchedOrder) {
      const latestOrders = await fetchOrders()
      matchedOrder = latestOrders.find((order) => order.putawayOrderNumber === targetNumber)
    }

    if (!matchedOrder) {
      toast.error(t('putaway.orderNotFound'))
      return
    }

    fillFromPutawayOrder(matchedOrder)
    toast.success(t('putaway.orderLoaded'))
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      putawayOrderNumberInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(rafId)
  }, [])

  const submit = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/v1/returns/putaway/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          putawayOrderNumber,
          containerCode,
          logisticsNo,
          barcode,
          quality,
          quantity: Number(quantity),
          targetLocationCode,
          deviceType: 'WEB',
        }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || t('putaway.putawayFailed'))
      toast.success(t('putaway.putawaySuccess'))
      setBarcode('')
      setQuantity('1')
      const submittedPutawayOrderNumber = putawayOrderNumber
      const latestOrders = await fetchOrders()
      const currentOrder = latestOrders.find((order) => order.putawayOrderNumber === submittedPutawayOrderNumber)
      const hasPendingLine = currentOrder?.lines.some((item) => item.status !== 'COMPLETED' && item.remainingQty > 0)
      if (currentOrder && hasPendingLine) {
        fillFromPutawayOrder(currentOrder)
      } else {
        clearPutawayForm()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('putaway.putawayFailed'))
    } finally {
      setSaving(false)
    }
  }

  const activeOrder = orders.find((order) => order.putawayOrderNumber === putawayOrderNumber)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Breadcrumb items={breadcrumb.list()} />
        <Button asChild>
          <Link href="/returns/putaway/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('putawayCreate.title')}
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(420px,480px)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-4 w-4 text-primary" />
              {t('putaway.executeTitle')}
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={t('putaway.executeHelpLabel')}
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-80 leading-relaxed">
                    {t('putaway.executeHelp')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>{t('putaway.description')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <section className="space-y-3 border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <Label>{t('fields.returnPutawayOrderNo')}</Label>
                {activeOrder && <ReturnStatusBadge status={activeOrder.status} />}
              </div>
              <div className="flex gap-2">
                <Input
                  ref={putawayOrderNumberInputRef}
                  value={putawayOrderNumber}
                  onChange={(event) => setPutawayOrderNumber(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void scanPutawayOrder()
                    }
                  }}
                  className="h-10 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void scanPutawayOrder()}
                  disabled={!putawayOrderNumber.trim()}
                  title={t('actions.scan')}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <section className="space-y-3 border-b p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
                <span>{t('fields.containerCode')} / {t('fields.skuBarcode')}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.containerCode')}</Label>
                  <Input value={containerCode} onChange={(event) => setContainerCode(event.target.value)} className="h-10 font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.packageLogisticsNo')}</Label>
                  <Input value={logisticsNo} onChange={(event) => setLogisticsNo(event.target.value)} className="h-10 font-mono" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.skuBarcode')}</Label>
                  <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} className="h-10 font-mono" />
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Label className="text-xs text-muted-foreground">{t('fields.quality')}</Label>
                <RadioGroup value={quality} onValueChange={(value) => setQuality(value as 'GOOD' | 'DAMAGED')} className="grid grid-cols-2 gap-2">
                  <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                    <RadioGroupItem value="GOOD" id="put-good" />
                    <Label htmlFor="put-good" className="cursor-pointer">{qualityLabels.GOOD}</Label>
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                    <RadioGroupItem value="DAMAGED" id="put-damaged" />
                    <Label htmlFor="put-damaged" className="cursor-pointer">{qualityLabels.DAMAGED}</Label>
                  </div>
                </RadioGroup>
              </div>
            </section>

            <section className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{t('fields.targetLocation')} / {t('fields.putawayQty')}</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.targetLocation')}</Label>
                  <Input value={targetLocationCode} onChange={(event) => setTargetLocationCode(event.target.value)} className="h-10 font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.putawayQty')}</Label>
                  <Input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-10" />
                </div>
              </div>

              <Button className="h-10 w-full" onClick={submit} disabled={saving || !putawayOrderNumber || !containerCode || !logisticsNo || !barcode || !targetLocationCode}>
                {t('putaway.confirmPutaway')}
              </Button>
            </section>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('putaway.recentOrders')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => fillFromPutawayOrder(order)}
                  >
                    {order.putawayOrderNumber}
                  </button>
                  <span className="text-sm">{order.putawayQty} / {order.totalQty}</span>
                </div>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{order.returnOrder.returnNo}</span>
                  <span>{order.returnOrder.logisticsNo}</span>
                  <span>{order.status}</span>
                </div>
                <div className="space-y-1 text-sm">
                  {order.lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-5 gap-2">
                      <span>{line.skuCode}</span>
                      <span>{line.containerCode || '-'}</span>
                      <span>{qualityLabels[line.quality as keyof typeof qualityLabels] || line.quality}</span>
                      <span>{dispositionLabels[line.action] || line.action}</span>
                      <ReturnStatusBadge
                        status={line.status === 'IN_PROGRESS' ? 'PUTAWAYING' : line.status === 'PENDING' ? 'PENDING_PUTAWAY' : 'COMPLETED'}
                        className={compactBadgeClassName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
