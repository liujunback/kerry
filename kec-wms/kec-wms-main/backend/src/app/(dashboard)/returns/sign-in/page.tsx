'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { CheckCircle, Package, Scan, Truck, User } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ReturnStatusBadge, ReturnTypeBadge } from '@/components/returns/return-labels'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface LookupResult {
  matchType: 'PRE_RETURN' | 'OUTBOUND_ORDER' | 'NOT_FOUND'
  returnOrder?: {
    id: string
    returnNo: string
    returnType: string
    status: string
    logisticsNo: string
    client?: { clientCode: string; clientName: string } | null
    lines?: Array<{ skuCode: string; skuName: string | null; expectedQty: number }>
  } | null
  outboundOrder?: {
    id: string
    orderNumber: string
    referenceNumber: string | null
    platformOrderId: string | null
    trackingNumber: string | null
    client?: { clientCode: string; clientName: string } | null
    lines?: Array<{ skuCode: string; skuName: string | null; orderedQty: number }>
  } | null
}

interface SignedReturnOrder {
  id: string
  returnNo: string
  returnType: string
  status: string
  logisticsNo: string
  signTime?: string | null
  totalExpectedQty?: number
  totalLineCount?: number
  client?: { clientCode: string; clientName: string } | null
  lines?: Array<{ skuCode: string; skuName: string | null; expectedQty: number; countedQty?: number }>
  signedByUser?: { username: string; fullName: string } | null
}

export default function ReturnSignInPage() {
  const t = useTranslations('returns')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.returns'), href: '/returns' }],
    module: { label: t('signIn.title'), href: '/returns/sign-in' },
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const [logisticsNo, setLogisticsNo] = useState('')
  const [signedList, setSignedList] = useState<SignedReturnOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const resetInputFocus = () => {
    setLogisticsNo('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const signInMatchedReturn = async (matchedResult: LookupResult, scannedLogisticsNo: string) => {
    if (matchedResult.matchType === 'NOT_FOUND') return
    setSigning(true)
    try {
      const response = await fetch('/api/v1/returns/sign-in/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logisticsNo: scannedLogisticsNo,
          returnOrderId: matchedResult.returnOrder?.id,
          outboundOrderId: matchedResult.outboundOrder?.id,
        }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || t('signIn.signFailed'))
      toast.success(t('signIn.signSuccess'))
      setSignedList((current) => [payload.data, ...current])
      resetInputFocus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('signIn.signFailed'))
    } finally {
      setSigning(false)
    }
  }

  const lookup = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const value = logisticsNo.trim()
    if (!value) return

    if (signedList.some((item) => item.logisticsNo === value)) {
      toast.warning(t('signIn.duplicateWarning'))
      resetInputFocus()
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/returns/sign-in/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logisticsNo: value }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || t('common.lookupFailed'))
      if (payload.data.matchType === 'NOT_FOUND') {
        toast.error(t('signIn.notMatched'))
        resetInputFocus()
        return
      }
      await signInMatchedReturn(payload.data, value)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.lookupFailed'))
      resetInputFocus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumb.list()} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                {t('signIn.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={lookup} className="space-y-3">
                <Input
                  ref={inputRef}
                  value={logisticsNo}
                  onChange={(event) => setLogisticsNo(event.target.value)}
                  placeholder={t('signIn.scanPlaceholder')}
                  disabled={loading || signing}
                  autoComplete="off"
                  className="h-12 font-mono text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  {t('signIn.description')}
                </p>
                <Button type="submit" className="w-full" disabled={loading || signing || !logisticsNo.trim()}>
                  {loading ? t('common.querying') : t('signIn.scanButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {t('signIn.signedTitle', { count: signedList.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {signedList.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  {t('signIn.noSigned')}
                </div>
              ) : (
                <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto">
                  {signedList.map((order) => (
                    <SignedReturnItem key={order.id} order={order} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SignedReturnItem({ order }: { order: SignedReturnOrder }) {
  const t = useTranslations('returns')
  const totalQty = order.totalExpectedQty ?? order.lines?.reduce((sum, line) => sum + (line.expectedQty || line.countedQty || 0), 0) ?? 0
  const lineCount = order.totalLineCount ?? order.lines?.length ?? 0
  const signedBy = order.signedByUser
    ? `${order.signedByUser.fullName || order.signedByUser.username}`
    : '-'
  const signedAt = order.signTime ? new Date(order.signTime) : new Date()
  const signedTime = Number.isNaN(signedAt.getTime())
    ? ''
    : signedAt.toLocaleTimeString('zh-CN', { hour12: false })

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-mono font-medium">{order.returnNo}</p>
              <ReturnTypeBadge type={order.returnType} />
              <ReturnStatusBadge status={order.status} />
            </div>
            <div className="mt-1 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {order.logisticsNo}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {order.client ? `${order.client.clientCode} / ${order.client.clientName}` : '-'}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {t('signIn.qtyLineSummary', { quantity: totalQty, lines: lineCount })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {t('signIn.signedBy', { user: signedBy })}
              </span>
              <span>{signedTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
