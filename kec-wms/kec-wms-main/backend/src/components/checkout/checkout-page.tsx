'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  AlertCircle,
  Loader2,
  ScanLine,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type CheckoutType = 'PALLET' | 'BAG'

interface ScanRecord {
  id: string
  sequenceNumber: number
  scannedNumber: string
  orderNumber: string
  trackingNumber: string | null
  channelName: string | null
  scannedAt: string
}

interface CheckoutInlineError {
  title: string
  message: string
  detail?: string | null
  actionHint?: string | null
  code?: string | null
}

export function CheckoutPage() {
  const t = useTranslations('checkout')
  const tMenuGroup = useTranslations('menuGroup')

  // 配置状态
  const [checkoutType, setCheckoutType] = useState<CheckoutType>('PALLET')

  // 输入状态
  const [containerInput, setContainerInput] = useState('')
  const [scanInput, setScanInput] = useState('')

  // 数据状态
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(null)
  const [containerNumber, setContainerNumber] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)
  const [orderCount, setOrderCount] = useState(0)
  const [parcelCount, setParcelCount] = useState(0)
  const [records, setRecords] = useState<ScanRecord[]>([])

  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanError, setScanError] = useState<CheckoutInlineError | null>(null)

  // Refs
  const containerInputRef = useRef<HTMLInputElement>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // 页面加载时聚焦
  useEffect(() => {
    containerInputRef.current?.focus()
  }, [])

  // 重置状态
  const resetState = () => {
    setCurrentContainerId(null)
    setContainerNumber(null)
    setContainerInput('')
    setScanInput('')
    setChannelName(null)
    setOrderCount(0)
    setParcelCount(0)
    setRecords([])
    setScanError(null)
  }

  const buildInlineError = (
    data: Partial<CheckoutInlineError> | null | undefined,
    fallbackTitle: string,
    fallbackMessage: string
  ): CheckoutInlineError => ({
    title: data?.title || fallbackTitle,
    message: data?.message || fallbackMessage,
    detail: data?.detail || null,
    actionHint: data?.actionHint || null,
    code: data?.code || null,
  })

  // 校验板号/袋号
  const handleValidateContainer = useCallback(async () => {
    if (!containerInput.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/checkout/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerNumber: containerInput.trim(),
          checkoutType,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        toast.error(data.message || '校验失败')
        setScanError(null)
        setContainerInput('')
        setTimeout(() => containerInputRef.current?.focus(), 0)
        return
      }

      // 设置容器信息
      setCurrentContainerId(data.data.id)
      setContainerNumber(data.data.containerNumber)
      setChannelName(data.data.channelName)
      setOrderCount(data.data.orderCount || 0)
      setParcelCount(data.data.parcelCount || 0)
      setRecords(data.data.records || [])
      setScanError(null)

      toast.success('板号/袋号校验通过')
      setContainerInput('')
      // 使用 setTimeout 确保状态更新后再聚焦
      setTimeout(() => scanInputRef.current?.focus(), 0)
    } catch {
      toast.error('校验失败')
      setScanError(null)
      setContainerInput('')
      setTimeout(() => containerInputRef.current?.focus(), 0)
    } finally {
      setIsLoading(false)
    }
  }, [containerInput, checkoutType])

  // 扫描单号
  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return

    // 需要先校验容器
    if (!currentContainerId) {
      const inlineError = buildInlineError(
        {
          title: t('messages.scanRequiresContainerTitle'),
          detail: t('messages.scanRequiresContainerDetail'),
        },
        t('messages.scanRequiresContainerTitle'),
        t('messages.scanRequiresContainerDetail')
      )
      setScanError(inlineError)
      toast.error(inlineError.title)
      containerInputRef.current?.focus()
      return
    }

    setIsLoading(true)
    setScanError(null)
    try {
      const res = await fetch('/api/v1/checkout/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutOrderId: currentContainerId,
          scannedNumber: scanInput.trim(),
          checkoutType,
          currentChannelCode: channelName ? records[0]?.channelName : null,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        const inlineError = buildInlineError(
          data,
          t('messages.scanFailedTitle'),
          data.message || '扫描失败'
        )
        setScanError(inlineError)
        toast.error(inlineError.title)
        setScanInput('')
        setTimeout(() => scanInputRef.current?.focus(), 0)
        return
      }

      // 更新状态
      const newRecord: ScanRecord = {
        id: data.data.record.id || `temp-${Date.now()}`,
        sequenceNumber: records.length + 1,
        scannedNumber: data.data.record.scannedNumber,
        orderNumber: data.data.record.orderNumber,
        trackingNumber: data.data.record.trackingNumber,
        channelName: data.data.record.channelName,
        scannedAt: new Date().toISOString(),
      }

      setRecords((prev) => [...prev, newRecord])
      setChannelName(data.data.channelName || channelName)
      setOrderCount(data.data.orderCount)
      setParcelCount(data.data.parcelCount)

      if (data.data.checkoutOrderId) {
        setCurrentContainerId(data.data.checkoutOrderId)
      }

      setScanError(null)
      toast.success(`已签出：${data.data.record.orderNumber}`)
      setScanInput('')
      // 使用 setTimeout 确保状态更新后再聚焦
      setTimeout(() => scanInputRef.current?.focus(), 0)
    } catch {
      const inlineError = buildInlineError(
        null,
        t('messages.scanFailedTitle'),
        '扫描失败'
      )
      setScanError(inlineError)
      toast.error(inlineError.title)
      setScanInput('')
      setTimeout(() => scanInputRef.current?.focus(), 0)
    } finally {
      setIsLoading(false)
    }
  }, [scanInput, currentContainerId, checkoutType, channelName, records, t])

  // 完结本板：封板 + 重置界面
  const handleConfirm = useCallback(async () => {
    if (records.length === 0) {
      toast.error('请先扫描单号')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutOrderId: currentContainerId,
          checkoutType,
          createMode: 'PRE_CREATE',
        }),
      })
      const data = await res.json()

      if (!data.success) {
        toast.error(data.message || '完结失败')
        return
      }

      toast.success(`本板已完结，签出单号：${data.data.checkoutNumber}`)
      resetState()
      setTimeout(() => containerInputRef.current?.focus(), 0)
    } catch {
      toast.error('完结失败')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentContainerId, checkoutType, records])

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[{ label: tMenuGroup('outbound') }, { label: t('title') }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：操作区域 1/3 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 签出配置 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5" />
                {t('title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 签出类型 */}
              <div className="space-y-2">
                <Label>{t('checkoutType.label')}</Label>
                <RadioGroup
                  value={checkoutType}
                  onValueChange={(v) => setCheckoutType(v as CheckoutType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PALLET" id="pallet" />
                    <Label htmlFor="pallet" className="cursor-pointer">
                      {t('checkoutType.pallet')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BAG" id="bag" />
                    <Label htmlFor="bag" className="cursor-pointer">
                      {t('checkoutType.bag')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 板号/袋号输入 */}
              <div className="space-y-2">
                <Label>{t('containerNumber.label')}</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={containerInputRef}
                      value={containerInput}
                      onChange={(e) => setContainerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateContainer()}
                      placeholder={t('containerNumber.placeholder')}
                      disabled={isLoading || !!currentContainerId}
                      autoComplete="off"
                    />
                  </div>
                  {containerNumber && (
                    <p className="text-sm text-muted-foreground">
                      当前板号/袋号：{containerNumber}
                    </p>
                  )}
                </div>

              {/* 单号扫描 */}
              <div className="space-y-2">
                <Label>{t('scanNumber.label')}</Label>
                <div className="flex gap-2">
                  <Input
                    ref={scanInputRef}
                    value={scanInput}
                    onChange={(e) => {
                      setScanInput(e.target.value)
                      if (scanError) {
                        setScanError(null)
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    placeholder={t('scanNumber.placeholder')}
                    disabled={isLoading}
                    autoComplete="off"
                    className={scanError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                </div>
                {scanError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-destructive">
                          {scanError.title}
                        </div>
                        {scanError.detail ? (
                          <div className="text-sm text-foreground">
                            {scanError.detail}
                          </div>
                        ) : scanError.message !== scanError.title ? (
                          <div className="text-sm text-foreground">
                            {scanError.message}
                          </div>
                        ) : null}
                        {scanError.actionHint ? (
                          <div className="text-xs text-muted-foreground">
                            {scanError.actionHint}
                          </div>
                        ) : null}
                        {scanError.code ? (
                          <div className="text-xs text-muted-foreground">
                            错误码：{scanError.code}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {t('scanNumber.hint')}
                </p>
              </div>

              {/* 完结本板按钮 */}
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting || records.length === 0}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                完结本板
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：信息展示 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">
                  {t('info.channelName')}
                </div>
                <div className="text-2xl font-bold">
                  {channelName || '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">
                  {t('info.orderCount')}
                </div>
                <div className="text-2xl font-bold">{orderCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">
                  {t('info.parcelCount')}
                </div>
                <div className="text-2xl font-bold">{parcelCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* 扫描记录 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScanLine className="h-5 w-5" />
                {t('table.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('messages.noRecords')}
                </div>
              ) : (
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">{t('table.sequence')}</TableHead>
                        <TableHead>{t('table.number')}</TableHead>
                        <TableHead>{t('table.scanTime')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record, index) => (
                        <TableRow key={record.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {record.trackingNumber || record.orderNumber}
                          </TableCell>
                          <TableCell>
                            {new Date(record.scannedAt).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
