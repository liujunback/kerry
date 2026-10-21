'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { QualityBadge, ReturnStatusBadge, useReturnLabels } from '@/components/returns/return-labels'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

const compactBadgeClassName = 'w-fit justify-self-start px-1.5 py-0 text-[11px] leading-4'

interface Candidate {
  id: string
  action: string
  quantity: number
  remainingQty: number
  status: string
  returnOrder: {
    returnNo: string
    logisticsNo: string
    client?: { clientCode: string; clientName: string } | null
  }
  returnLine: {
    skuCode: string
    skuName: string | null
    quality: string | null
    countedQty: number
    containerCode: string | null
    tempLocationCode: string | null
  }
}

interface CreatePutawayResponse {
  putawayOrderNumber?: string
  putawayOrderNumbers?: string[]
  orders?: Array<{ putawayOrderNumber: string }>
}

export default function CreateReturnPutawayPage() {
  const t = useTranslations('returns')
  const { dispositionLabels } = useReturnLabels()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('breadcrumbs.returns'), href: '/returns' }],
    module: { label: t('putawayCreate.title'), href: '/returns/putaway/create' },
  })
  const [items, setItems] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const fetchCandidates = useCallback(async () => {
    const response = await fetch('/api/v1/returns/putaway/candidates')
    const payload = await response.json()
    if (!payload.success) {
      toast.error(payload.message || t('putawayCreate.fetchCandidatesFailed'))
      return
    }
    setItems(payload.data || [])
  }, [t])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  const submit = async () => {
    const dispositionIds = Object.entries(selected).filter(([, checked]) => checked).map(([id]) => id)
    if (dispositionIds.length === 0) {
      toast.error(t('putawayCreate.selectFirst'))
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/v1/returns/putaway/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispositionIds }),
      })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.message || t('putawayCreate.createFailed'))
      const data = payload.data as CreatePutawayResponse | undefined
      const orderNumbers = data?.putawayOrderNumbers?.length
        ? data.putawayOrderNumbers
        : data?.orders?.map((order) => order.putawayOrderNumber).filter(Boolean) || []
      const message = orderNumbers.length > 1
        ? t('putawayCreate.createSuccessMultiple', { count: orderNumbers.length, numbers: orderNumbers.join(', ') })
        : t('putawayCreate.createSuccessSingle', { number: orderNumbers[0] || data?.putawayOrderNumber || '' })
      toast.success(message)
      setSelected({})
      await fetchCandidates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('putawayCreate.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.list()} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('putawayCreate.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('putawayCreate.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/returns/putaway">{t('putaway.title')}</Link>
          </Button>
          <Button onClick={submit} disabled={loading}>{t('putawayCreate.createButton')}</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('putawayCreate.candidatesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-[48px_1.2fr_1fr_1fr_1fr_1fr_1fr] border-b bg-muted/40 px-3 py-2 text-xs font-medium">
              <span />
              <span>{t('fields.returnLogistics')}</span>
              <span>SKU</span>
              <span>{t('fields.quality')}</span>
              <span>{t('fields.quantity')}</span>
              <span>{t('fields.disposition')}</span>
              <span>{t('fields.status')}</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[48px_1.2fr_1fr_1fr_1fr_1fr_1fr] items-center px-3 py-2 text-sm">
                <Checkbox checked={!!selected[item.id]} onCheckedChange={(checked) => setSelected((current) => ({ ...current, [item.id]: !!checked }))} />
                <span>{item.returnOrder.returnNo}<br /><span className="text-xs text-muted-foreground">{item.returnOrder.logisticsNo}</span></span>
                <span>{item.returnLine.skuCode}<br /><span className="text-xs text-muted-foreground">{item.returnLine.skuName || '-'}</span></span>
                <QualityBadge quality={item.returnLine.quality} className={compactBadgeClassName} />
                <span>{item.remainingQty} / {item.quantity}</span>
                <span>{dispositionLabels[item.action] || item.action}</span>
                <ReturnStatusBadge status={item.status} className={compactBadgeClassName} />
              </div>
            ))}
            {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">{t('putawayCreate.noCandidates')}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
