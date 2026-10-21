'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePackingStore } from '@/stores/packing-store'
import { format } from '@/lib/utils/date-formatter'

// 汇总行类型
interface AggregatedLine {
  skuCode: string
  skuName: string | null
  locationCode: string | null
  batchNumber: string | null
  expiryDate: string | null
  orderCount: number
  orderNumbers: string[]
  expectedQty: number
  packedQty: number
  status: 'PENDING' | 'PACKING' | 'COMPLETED'
}

export function PackingDetailPanel() {
  const t = useTranslations('packing')
  const { currentPickOrder, pickOrderLines, selectedOrder } = usePackingStore()

  // 汇总逻辑：按 SKU + 货位 + 批次汇总
  const aggregatedLines = useMemo(() => {
    if (!pickOrderLines || pickOrderLines.length === 0) return []

    const aggregateMap = new Map<string, AggregatedLine>()

    for (const line of pickOrderLines) {
      // 汇总键：SKU + 货位 + 批次
      const key = `${line.skuCode}|${line.locationCode || ''}|${line.batchNumber || ''}`

      const existing = aggregateMap.get(key)
      if (existing) {
        existing.expectedQty += line.expectedQty
        existing.packedQty += line.packedQty
        existing.orderCount += 1
        if (!existing.orderNumbers.includes(line.orderNumber)) {
          existing.orderNumbers.push(line.orderNumber)
        }
      } else {
        aggregateMap.set(key, {
          skuCode: line.skuCode,
          skuName: line.skuName,
          locationCode: line.locationCode,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          orderCount: 1,
          orderNumbers: [line.orderNumber],
          expectedQty: line.expectedQty,
          packedQty: line.packedQty,
          status: line.packedQty >= line.expectedQty ? 'COMPLETED' : line.packedQty > 0 ? 'PACKING' : 'PENDING',
        })
      }
    }

    // 更新状态
    for (const agg of aggregateMap.values()) {
      if (agg.packedQty >= agg.expectedQty) {
        agg.status = 'COMPLETED'
      } else if (agg.packedQty > 0) {
        agg.status = 'PACKING'
      } else {
        agg.status = 'PENDING'
      }
    }

    return Array.from(aggregateMap.values())
  }, [pickOrderLines])

  if (!currentPickOrder) {
    return null
  }

  // 如果有选中的订单，显示订单明细
  if (selectedOrder) {
    const getOrderLineStatusBadge = (line: typeof selectedOrder.lines[0]) => {
      if (line.packedQty >= line.expectedQty) {
        return <Badge variant="outline" className="bg-green-50 text-green-700">{t('status.scanned')}</Badge>
      }
      if (line.packedQty > 0) {
        return <Badge variant="secondary">{t('status.scanning')}</Badge>
      }
      return <Badge variant="outline">{t('status.pendingScan')}</Badge>
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('orderDetailsWithNumber', { orderNumber: selectedOrder.orderNumber })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.skuCode')}</TableHead>
                  <TableHead>{t('table.skuName')}</TableHead>
                  <TableHead className="text-right">{t('table.pendingScan')}</TableHead>
                  <TableHead className="text-right">{t('table.scanned')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t('table.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedOrder.lines.map((line) => (
                    <TableRow
                      key={line.lineId}
                      className="[&>td]:bg-white [&>td]:text-slate-900 dark:[&>td]:bg-slate-950/70 dark:[&>td]:text-slate-100"
                    >
                      <TableCell className="font-mono">{line.skuCode}</TableCell>
                      <TableCell>{line.skuName || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{line.expectedQty - line.packedQty}</TableCell>
                      <TableCell className="text-right font-semibold text-green-700 dark:text-green-400">
                        {line.packedQty}
                      </TableCell>
                      <TableCell>{getOrderLineStatusBadge(line)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 检查是否有批次或效期数据
  const hasBatchData = aggregatedLines.some(line => line.batchNumber)
  const hasExpiryData = aggregatedLines.some(line => line.expiryDate)

  const getStatusBadge = (status: AggregatedLine['status']) => {
    if (status === 'COMPLETED') {
      return <Badge variant="outline" className="bg-green-50 text-green-700">{t('status.scanned')}</Badge>
    }
    if (status === 'PACKING') {
      return <Badge variant="secondary">{t('status.scanning')}</Badge>
    }
    return <Badge variant="outline">{t('status.pendingScan')}</Badge>
  }

  return (
    <Card>
      <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('pickTaskSummaryTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.skuCode')}</TableHead>
                <TableHead>{t('table.skuName')}</TableHead>
                <TableHead>{t('table.location')}</TableHead>
                {hasBatchData && <TableHead>{t('table.batchNumber')}</TableHead>}
                {hasExpiryData && <TableHead>{t('table.expiryDate')}</TableHead>}
                <TableHead className="text-right">{t('labels.orderCount')}</TableHead>
                <TableHead className="text-right">{t('header.totalQty')}</TableHead>
                <TableHead className="text-right">{t('table.scanned')}</TableHead>
                <TableHead className="text-right">{t('table.pendingScan')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasBatchData && hasExpiryData ? 10 : hasBatchData || hasExpiryData ? 9 : 8} className="text-center text-muted-foreground">
                    {t('table.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                aggregatedLines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{line.skuCode}</TableCell>
                    <TableCell>{line.skuName || '-'}</TableCell>
                    <TableCell className="font-mono">{line.locationCode || '-'}</TableCell>
                    {hasBatchData && (
                      <TableCell>{line.batchNumber || '-'}</TableCell>
                    )}
                    {hasExpiryData && (
                      <TableCell>
                        {line.expiryDate
                          ? format(new Date(line.expiryDate), 'yyyy-MM-dd')
                          : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className="text-blue-600 font-medium">{line.orderCount}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{line.expectedQty}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {line.packedQty}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{line.expectedQty - line.packedQty}</TableCell>
                    <TableCell>{getStatusBadge(line.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
