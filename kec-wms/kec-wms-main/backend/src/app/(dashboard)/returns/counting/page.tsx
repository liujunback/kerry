'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ClipboardList, HelpCircle, PackageCheck, Save, ScanLine, Search } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ReturnStatusBadge, QualityBadge } from '@/components/returns/return-labels'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface ReturnOrder {
  id: string
  returnNo: string
  logisticsNo: string
  status: string
  client?: { clientCode: string; clientName: string } | null
  lines: Array<{
    id: string
    skuCode: string
    skuName: string | null
    barcode: string | null
    expectedQty: number
    countedQty: number
    quality: string | null
    batchNumber: string | null
    expiryDate: string | null
    tempLocationCode: string | null
    containerCode: string | null
    status: string
  }>
}

function normalizeReturnOrder(payload: unknown): ReturnOrder | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const order = payload as ReturnOrder
  return {
    ...order,
    lines: Array.isArray(order.lines) ? order.lines : [],
  }
}

function ReturnCountingContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('returns')
  const tCommon = useTranslations('common')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.returns'), href: '/returns' }],
    module: { label: t('counting.title'), href: '/returns/counting' },
  })
  const [logisticsNo, setLogisticsNo] = useState(searchParams.get('logisticsNo') || '')
  const [order, setOrder] = useState<ReturnOrder | null>(null)
  const [saving, setSaving] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [countedQty, setCountedQty] = useState('1')
  const [quality, setQuality] = useState<'GOOD' | 'DAMAGED'>('GOOD')
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [containerCode, setContainerCode] = useState('')
  const [tempLocationCode, setTempLocationCode] = useState('')
  const logisticsInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const containerInputRef = useRef<HTMLInputElement>(null)
  const tempLocationInputRef = useRef<HTMLInputElement>(null)
  const pendingLookupRef = useRef<string | null>(null)

  const resetCountingForm = () => {
    setLogisticsNo('')
    setOrder(null)
    setBarcode('')
    setCountedQty('1')
    setQuality('GOOD')
    setBatchNumber('')
    setExpiryDate('')
    setContainerCode('')
    setTempLocationCode('')
    setTimeout(() => {
      logisticsInputRef.current?.focus()
      logisticsInputRef.current?.select()
    }, 0)
  }

  const findMatchedLine = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return null
    return order?.lines.find((line) => (line.skuCode === normalized || line.barcode === normalized) && line.countedQty === 0) || null
  }

  const lookup = async (targetLogisticsNo = logisticsNo) => {
    const normalizedLogisticsNo = targetLogisticsNo.trim()
    if (!normalizedLogisticsNo || pendingLookupRef.current === normalizedLogisticsNo) return
    pendingLookupRef.current = normalizedLogisticsNo
    try {
      const response = await fetch('/api/v1/returns/counting/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logisticsNo: normalizedLogisticsNo }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || t('common.lookupFailed'))
      setOrder(normalizeReturnOrder(payload.data))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.lookupFailed'))
      setTimeout(() => logisticsInputRef.current?.focus(), 0)
    } finally {
      pendingLookupRef.current = null
    }
  }

  useEffect(() => {
    if (logisticsNo) lookup()
    else logisticsInputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!order) return
    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus()
      barcodeInputRef.current?.select()
    })
  }, [order])

  const handleSkuScan = () => {
    if (!order) return
    const matchedLine = findMatchedLine(barcode)
    if (!matchedLine) {
      toast.error(t('counting.skuNotMatched'))
      return
    }

    setBatchNumber(matchedLine.batchNumber || '')
    setExpiryDate(matchedLine.expiryDate ? matchedLine.expiryDate.slice(0, 10) : '')
    toast.success(t('counting.skuMatched', { sku: matchedLine.skuCode }))
    setTimeout(() => quantityInputRef.current?.focus(), 0)
  }

  const validateReturnContainer = async (value = containerCode) => {
    const nextContainerCode = value.trim()
    if (!nextContainerCode) return false

    try {
      const response = await fetch(`/api/v1/containers/lookup?containerCode=${encodeURIComponent(nextContainerCode)}`)
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || t('counting.containerLookupFailed'))

      if (payload.data?.purpose !== 'RETURN_INBOUND') {
        setContainerCode('')
        toast.error(t('counting.invalidContainerPurpose'))
        return false
      }

      toast.success(t('counting.containerValidated'))
      setTimeout(() => {
        tempLocationInputRef.current?.focus()
        tempLocationInputRef.current?.select()
      }, 0)
      return true
    } catch (error) {
      setContainerCode('')
      toast.error(error instanceof Error ? error.message : t('counting.containerLookupFailed'))
      return false
    }
  }

  const saveLine = async () => {
    if (!order) return
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/returns/${order.id}/count-lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          countedQty: Number(countedQty),
          quality,
          batchNumber: batchNumber || undefined,
          expiryDate: expiryDate || undefined,
          containerCode,
          tempLocationCode,
        }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || tCommon('error'))
      toast.success(t('counting.lineSaved'))
      setBarcode('')
      setCountedQty('1')
      setBatchNumber('')
      setExpiryDate('')
      await lookup()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('error'))
    } finally {
      setSaving(false)
    }
  }

  const complete = async () => {
    if (!order) return
    if (order.status === 'WAIT_DISPOSITION') {
      toast.success(t('counting.alreadyCompleted'))
      resetCountingForm()
      return
    }
    const response = await fetch(`/api/v1/returns/${order.id}/complete-counting`, { method: 'POST' })
    const payload = await response.json()
    if (!payload.success) {
      toast.error(payload.message || t('counting.completeFailed'))
      return
    }
    toast.success(t('counting.completeSuccess'))
    resetCountingForm()
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.list()} />
      <div className="grid gap-4 lg:grid-cols-[minmax(420px,480px)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-4 w-4 text-primary" />
              {t('counting.operationTitle')}
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={t('counting.operationHelpLabel')}
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-80 leading-relaxed">
                    {t('counting.operationHelp')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              {order ? t('counting.orderSummary', { client: order.client ? `${order.client.clientCode} / ${order.client.clientName}` : '-', logisticsNo: order.logisticsNo }) : t('counting.scanFirst')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <section className="space-y-3 border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <Label>{t('fields.logisticsNo')}</Label>
                {order && <ReturnStatusBadge status={order.status} />}
              </div>
              <div className="flex gap-2">
                <Input
                  ref={logisticsInputRef}
                  value={logisticsNo}
                  onChange={(event) => setLogisticsNo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void lookup(event.currentTarget.value)
                    }
                  }}
                  className="h-10 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void lookup()}
                  disabled={!logisticsNo.trim()}
                  title={tCommon('search')}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <section className="space-y-3 border-b p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{t('fields.skuBarcode')}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.skuBarcode')}</Label>
                  <Input
                    ref={barcodeInputRef}
                    value={barcode}
                    onChange={(event) => {
                      const nextBarcode = event.target.value
                      setBarcode(nextBarcode)
                      const matchedLine = findMatchedLine(nextBarcode)
                      if (matchedLine?.batchNumber) {
                        setBatchNumber(matchedLine.batchNumber)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleSkuScan()
                      }
                    }}
                    disabled={!order}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.quantity')}</Label>
                  <Input
                    ref={quantityInputRef}
                    type="number"
                    min={1}
                    value={countedQty}
                    onChange={(event) => setCountedQty(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        containerInputRef.current?.focus()
                        containerInputRef.current?.select()
                      }
                    }}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Label className="text-xs text-muted-foreground">{t('fields.quality')}</Label>
                <RadioGroup value={quality} onValueChange={(value) => setQuality(value as 'GOOD' | 'DAMAGED')} className="grid grid-cols-2 gap-2">
                  <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                    <RadioGroupItem value="GOOD" id="good" />
                    <Label htmlFor="good" className="cursor-pointer">{t('quality.GOOD')}</Label>
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                    <RadioGroupItem value="DAMAGED" id="damaged" />
                    <Label htmlFor="damaged" className="cursor-pointer">{t('quality.DAMAGED')}</Label>
                  </div>
                </RadioGroup>
              </div>
            </section>

            <section className="space-y-3 border-b p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span>{t('fields.batchNumber')} / {t('fields.expiryDate')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.batchNumber')}</Label>
                  <Input value={batchNumber} readOnly className="h-10 bg-muted/40 font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.expiryDate')}</Label>
                  <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className="h-10" />
                </div>
              </div>
            </section>

            <section className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
                <span>{t('fields.containerCode')} / {t('fields.tempLocation')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.containerCode')} <span className="text-destructive">*</span></Label>
                  <Input
                    ref={containerInputRef}
                    value={containerCode}
                    onChange={(event) => setContainerCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void validateReturnContainer(event.currentTarget.value)
                      }
                    }}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">{t('fields.tempLocation')} <span className="text-destructive">*</span></Label>
                  <Input ref={tempLocationInputRef} value={tempLocationCode} onChange={(event) => setTempLocationCode(event.target.value)} className="h-10 font-mono" />
                </div>
              </div>

              <Button className="h-10 w-full" onClick={saveLine} disabled={!order || saving || !barcode || !containerCode || !tempLocationCode}>
                <Save className="h-4 w-4" />
                {t('counting.saveLine')}
              </Button>
            </section>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {order ? order.returnNo : t('detail.title')}
              {order && <ReturnStatusBadge status={order.status} />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!order ? (
              <div className="py-16 text-center text-sm text-muted-foreground">{t('counting.scanFirst')}</div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  {t('counting.orderSummary', { client: order.client ? `${order.client.clientCode} / ${order.client.clientName}` : '-', logisticsNo: order.logisticsNo })}
                </div>
                <div className="rounded-md border">
                  <div className="grid grid-cols-6 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                    <span>SKU</span>
                    <span>{t('fields.expected')}</span>
                    <span>{t('fields.counted')}</span>
                    <span>{t('fields.quality')}</span>
                    <span>{t('fields.containerTemp')}</span>
                    <span>{tCommon('status')}</span>
                  </div>
                  {(order.lines || []).map((line) => (
                    <div key={line.id} className="grid grid-cols-6 px-3 py-2 text-sm">
                      <span>{line.skuCode}</span>
                      <span>{line.expectedQty}</span>
                      <span>{line.countedQty}</span>
                      <QualityBadge quality={line.quality} />
                      <span>{line.containerCode || '-'} / {line.tempLocationCode || '-'}</span>
                      <ReturnStatusBadge status={line.status} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/returns/${order.id}`}>{tCommon('view')}</Link>
                  </Button>
                  <Button onClick={complete} disabled={order.status === 'WAIT_DISPOSITION'}>{order.status === 'WAIT_DISPOSITION' ? t('counting.alreadyCompleted') : t('counting.complete')}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ReturnCountingPage() {
  return (
    <Suspense>
      <ReturnCountingContent />
    </Suspense>
  )
}
