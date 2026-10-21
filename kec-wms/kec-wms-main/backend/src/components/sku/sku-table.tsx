'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, Pencil, MoreHorizontal, Power, PowerOff, Package, Printer, Loader2, Copy } from 'lucide-react'
import { usePrintStore } from '@/stores/print-store'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SkuStatusBadge } from './sku-status-badge'
import { StorageConditionBadge } from './storage-condition-badge'

interface Sku {
  id: string
  skuCode: string
  skuName: string
  barcode?: string | null
  unit: string
  storageCondition?: string | null
  abcClass?: string | null
  isBatchManaged: boolean
  isSerialManaged: boolean
  isFirstReceiving: boolean
  isSelfPackaged: boolean
  imageUrl?: string | null
  status: string
  createdAt: string
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  category?: {
    id: string
    categoryCode: string
    categoryName: string
  } | null
  _count: {
    uoms: number
    barcodes: number
    inventoryBuckets: number
  }
}

interface SkuTableProps {
  skus: Sku[]
  onRefresh?: () => void
}

export function SkuTable({ skus, onRefresh }: SkuTableProps) {
  const router = useRouter()
  const t = useTranslations('sku')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedSkuIds, setSelectedSkuIds] = useState<Set<string>>(new Set())
  const [printing, setPrinting] = useState(false)

  // 初始化打印中间件连接
  const { connect, disconnect } = usePrintStore()

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 只选择启用状态的 SKU
      const activeSkuIds = skus
        .filter((sku) => sku.status === 'ACTIVE')
        .map((sku) => sku.id)
      setSelectedSkuIds(new Set(activeSkuIds))
    } else {
      setSelectedSkuIds(new Set())
    }
  }

  // 处理单个选择
  const handleSelectSku = (skuId: string, checked: boolean) => {
    const newSelected = new Set(selectedSkuIds)
    if (checked) {
      newSelected.add(skuId)
    } else {
      newSelected.delete(skuId)
    }
    setSelectedSkuIds(newSelected)
  }

  // 批量打印标签
  const handleBatchPrint = async () => {
    if (selectedSkuIds.size === 0) return

    setPrinting(true)
    try {
      // 生成打印 URL（带 token）
      const response = await fetch('/api/v1/print-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'sku-label',
          ids: Array.from(selectedSkuIds),
        }),
      })

      if (!response.ok) {
        throw new Error('生成打印 URL 失败')
      }

      const { data } = await response.json()
      const pdfUrl = data.url

      const result = await printPdfWithAgentFallback({
        pdfUrl,
        jobIdPrefix: 'sku-label',
        scenarioType: 'SKU_LABEL',
        relatedIds: Array.from(selectedSkuIds),
        relatedType: 'SKU',
        pageCount: selectedSkuIds.size,
      })
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
      toast.success(`成功打印 ${selectedSkuIds.size} 个 SKU 标签`)

      // 清除选择
      setSelectedSkuIds(new Set())
    } catch (error) {
      const message = error instanceof Error ? error.message : '打印失败'
      toast.error(message)
    } finally {
      setPrinting(false)
    }
  }

  const handleStatusChange = async (skuId: string, status: string) => {
    setLoadingId(skuId)
    try {
      const response = await fetch(`/api/v1/skus/${skuId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('statusUpdateSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  // 计算可选择的 SKU 数量（仅启用状态）
  const activeSkuCount = skus.filter((sku) => sku.status === 'ACTIVE').length
  const allActiveSelected = activeSkuCount > 0 && selectedSkuIds.size === activeSkuCount

  return (
    <>
      {/* 批量操作工具栏 */}
      {selectedSkuIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg mb-4">
          <span className="text-sm">
            已选择 {selectedSkuIds.size} 个 SKU
          </span>
          <Button
            size="sm"
            onClick={handleBatchPrint}
            disabled={printing}
          >
            {printing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Printer className="h-4 w-4 mr-1" />
            批量打印标签
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedSkuIds(new Set())}
          >
            取消选择
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allActiveSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead className="w-[80px]">{t('image')}</TableHead>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('client')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('unit')}</TableHead>
              <TableHead>{t('storageConditionLabel')}</TableHead>
              <TableHead>{t('statusLabel')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              skus.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSkuIds.has(sku.id)}
                      onCheckedChange={(checked) =>
                        handleSelectSku(sku.id, checked as boolean)
                      }
                      disabled={sku.status !== 'ACTIVE'}
                      aria-label={`选择 ${sku.skuCode}`}
                    />
                  </TableCell>
                  <TableCell>
                    {sku.imageUrl ? (
                      <img
                        src={sku.imageUrl}
                        alt={sku.skuName}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/sku/${sku.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {sku.skuCode}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(sku.skuCode)
                          toast.success('已复制')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{sku.skuName}</div>
                      {sku.barcode && (
                        <div className="text-xs text-muted-foreground">{sku.barcode}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{sku.client.clientName}</TableCell>
                  <TableCell>{sku.category?.categoryName || '-'}</TableCell>
                  <TableCell>{sku.unit}</TableCell>
                  <TableCell>
                    {sku.storageCondition && (
                      <StorageConditionBadge condition={sku.storageCondition} />
                    )}
                  </TableCell>
                  <TableCell>
                    <SkuStatusBadge status={sku.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === sku.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/sku/${sku.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/sku/${sku.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon('edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {sku.status === 'ACTIVE' ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(sku.id, 'INACTIVE')}
                          >
                            <PowerOff className="h-4 w-4 mr-2" />
                            {t('status.INACTIVE')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(sku.id, 'ACTIVE')}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {t('status.ACTIVE')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
