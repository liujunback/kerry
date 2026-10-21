'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Link2 } from 'lucide-react'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface MountRecord {
  checkoutOrderId: string
  checkoutNumber: string
  channelName: string | null
  orderCount: number
  parcelCount: number
  scannedAt: string
}

export default function ManifestMountPage() {
  const t = useTranslations('manifestMount')
  const tMenuGroup = useTranslations('menuGroup')
  const searchParams = useSearchParams()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/manifest-mount' },
  })

  const [manifestInput, setManifestInput] = useState('')
  const [currentManifestId, setCurrentManifestId] = useState<string | null>(null)
  const [manifestNumber, setManifestNumber] = useState<string | null>(null)
  const [manifestChannelName, setManifestChannelName] = useState<string | null>(null)
  const [manifestWarehouseName, setManifestWarehouseName] = useState<string | null>(null)
  const [manifestStatus, setManifestStatus] = useState<string | null>(null)

  const [checkoutInput, setCheckoutInput] = useState('')

  const [containerCount, setContainerCount] = useState(0)
  const [orderCount, setOrderCount] = useState(0)
  const [parcelCount, setParcelCount] = useState(0)

  const [records, setRecords] = useState<MountRecord[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const manifestInputRef = useRef<HTMLInputElement>(null)
  const checkoutInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const manifestNumberParam = searchParams.get('manifestNumber')
    if (manifestNumberParam) {
      setManifestInput(manifestNumberParam)
    } else {
      manifestInputRef.current?.focus()
    }
  }, [searchParams])

  const handleValidateManifest = useCallback(async () => {
    if (!manifestInput.trim()) {
      toast.error('请输入集运单号')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/manifest-mount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestNumber: manifestInput.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setCurrentManifestId(data.data.id)
        setManifestNumber(data.data.manifestNumber)
        setManifestChannelName(data.data.channelName)
        setManifestWarehouseName(data.data.warehouseName)
        setManifestStatus(data.data.status)
        setContainerCount(data.data.containerCount)
        setOrderCount(data.data.orderCount)
        setParcelCount(data.data.parcelCount)
        setRecords(data.data.records || [])
        toast.success('集运单校验通过')
        setTimeout(() => checkoutInputRef.current?.focus(), 100)
      } else {
        toast.error(data.message || '校验失败')
        setManifestInput('')
        manifestInputRef.current?.focus()
      }
    } catch {
      toast.error('网络错误')
      setManifestInput('')
      manifestInputRef.current?.focus()
    } finally {
      setIsLoading(false)
    }
  }, [manifestInput])

  useEffect(() => {
    const manifestNumberParam = searchParams.get('manifestNumber')
    if (manifestNumberParam && manifestInput === manifestNumberParam && !currentManifestId) {
      const timer = setTimeout(() => {
        handleValidateManifest()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [manifestInput, searchParams, currentManifestId, handleValidateManifest])

  const resetState = useCallback(() => {
    setCurrentManifestId(null)
    setManifestNumber(null)
    setManifestInput('')
    setCheckoutInput('')
    setManifestChannelName(null)
    setManifestWarehouseName(null)
    setManifestStatus(null)
    setContainerCount(0)
    setOrderCount(0)
    setParcelCount(0)
    setRecords([])
    setTimeout(() => manifestInputRef.current?.focus(), 100)
  }, [])

  const handleScanCheckout = useCallback(async () => {
    if (!currentManifestId) {
      toast.error('请先扫描集运单号')
      return
    }

    if (!checkoutInput.trim()) {
      toast.error('请输入签出单号')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/manifest-mount/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestOrderId: currentManifestId,
          checkoutNumber: checkoutInput.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        const newRecord: MountRecord = {
          ...data.data.record,
        }
        setRecords((prev) => [...prev, newRecord])
        setContainerCount(data.data.totalContainerCount)
        setOrderCount(data.data.totalOrderCount)
        setParcelCount(data.data.totalParcelCount)

        toast.success(data.message || '挂载成功')
        setCheckoutInput('')
        checkoutInputRef.current?.focus()
      } else {
        toast.error(data.message || '挂载失败')
        setCheckoutInput('')
        setTimeout(() => checkoutInputRef.current?.focus(), 100)
      }
    } catch {
      toast.error('网络错误')
      setCheckoutInput('')
      setTimeout(() => checkoutInputRef.current?.focus(), 100)
    } finally {
      setIsLoading(false)
    }
  }, [currentManifestId, checkoutInput])

  const handleConfirm = useCallback(async () => {
    if (!currentManifestId) {
      toast.error('请先扫描集运单号')
      return
    }

    if (records.length === 0) {
      toast.error('请先扫描签出单')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/manifest-mount/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestOrderId: currentManifestId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`挂载完成！集运单：${data.data.manifestNumber}，容器数：${data.data.containerCount}`)
        resetState()
      } else {
        toast.error(data.message || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentManifestId, records.length, resetState])

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumb.list()} />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                集运单挂载
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manifest-input">集运单号</Label>
                <Input
                  id="manifest-input"
                  ref={manifestInputRef}
                  value={manifestInput}
                  onChange={(e) => setManifestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleValidateManifest()
                    }
                  }}
                  placeholder="请扫描或输入集运单号"
                  disabled={!!currentManifestId || isLoading}
                />
              </div>

              {currentManifestId && (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/50">
                  <div className="text-sm">
                    <span className="text-muted-foreground">单号：</span>
                    <span className="font-medium">{manifestNumber}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">仓库：</span>
                    <span>{manifestWarehouseName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">渠道：</span>
                    <span>{manifestChannelName || '-'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">状态：</span>
                    <span>{manifestStatus}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="checkout-input">签出单号</Label>
                <Input
                  id="checkout-input"
                  ref={checkoutInputRef}
                  value={checkoutInput}
                  onChange={(e) => setCheckoutInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleScanCheckout()
                    }
                  }}
                  placeholder="请扫描签出单号（板号/袋号）"
                  disabled={!currentManifestId || isLoading}
                />
              </div>

              <Button
                onClick={handleConfirm}
                disabled={!currentManifestId || records.length === 0 || isSubmitting}
                className="w-full"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                集运完成
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">渠道</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{manifestChannelName || '-'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">容器数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{containerCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">订单数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">包裹数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{parcelCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>挂载记录</CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无挂载记录</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">序号</TableHead>
                      <TableHead>签出单号</TableHead>
                      <TableHead className="w-24">订单数</TableHead>
                      <TableHead className="w-24">包裹数</TableHead>
                      <TableHead className="w-40">扫描时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record, index) => (
                      <TableRow key={record.checkoutOrderId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{record.checkoutNumber}</TableCell>
                        <TableCell>{record.orderCount}</TableCell>
                        <TableCell>{record.parcelCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(new Date(record.scannedAt))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
