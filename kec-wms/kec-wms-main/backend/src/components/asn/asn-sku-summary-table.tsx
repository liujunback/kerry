'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SkuSummary {
  skuCode: string
  skuName: string | null
  isFirstReceiving: boolean
  weightKg: string | null
  dimensions: string | null
  batchNumbers: string | null
  totalCartons: number
  putawayCartons: number
  totalExpectedQty: number
  totalReceivedQty: number
  varianceQty: number
  totalPutawayQty: number
}

interface AsnSkuSummaryTableProps {
  asnId: string
  asnStatus?: string
}

export function AsnSkuSummaryTable({ asnId, asnStatus }: AsnSkuSummaryTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [data, setData] = useState<SkuSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // 判断是否已开始收货（显示收货差异列）
  const hasStartedReceiving = asnStatus && !['CREATED', 'PENDING_RECEIVING'].includes(asnStatus)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/sku-summary`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch SKU summary:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [asnId])

  // 分页计算
  const totalPages = Math.ceil(data.length / pageSize)
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {tCommon('loading')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('skuSummary.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('line.skuCode')}</TableHead>
                <TableHead>{t('line.skuName')}</TableHead>
                <TableHead>{t('line.isNew')}</TableHead>
                <TableHead>{t('line.weight')}</TableHead>
                <TableHead>{t('line.dimensions')}</TableHead>
                <TableHead>{t('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{t('skuSummary.totalCartons')}</TableHead>
                <TableHead className="text-right">{t('skuSummary.putawayCartons')}</TableHead>
                <TableHead className="text-right">{t('skuSummary.totalExpectedQty')}</TableHead>
                <TableHead className="text-right">{t('line.receivedQty')}</TableHead>
                {hasStartedReceiving && (
                  <TableHead className="text-right">{t('skuSummary.varianceQty')}</TableHead>
                )}
                <TableHead className="text-right">{t('line.putawayQty')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasStartedReceiving ? 12 : 11} className="text-center py-8 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.skuCode}>
                    <TableCell className="font-medium">{item.skuCode}</TableCell>
                    <TableCell>{item.skuName || '-'}</TableCell>
                    <TableCell>{item.isFirstReceiving ? tCommon('yes') : tCommon('no')}</TableCell>
                    <TableCell>{item.weightKg ? `${item.weightKg}kg` : '-'}</TableCell>
                    <TableCell>{item.dimensions || '-'}</TableCell>
                    <TableCell>{item.batchNumbers || '-'}</TableCell>
                    <TableCell className="text-right">{item.totalCartons}</TableCell>
                    <TableCell className="text-right">{item.putawayCartons}</TableCell>
                    <TableCell className="text-right">{item.totalExpectedQty}</TableCell>
                    <TableCell className="text-right">{item.totalReceivedQty}</TableCell>
                    {hasStartedReceiving && (
                      <TableCell className="text-right">{item.varianceQty}</TableCell>
                    )}
                    <TableCell className="text-right">{item.totalPutawayQty}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {tCommon('pagination.showing', { from: data.length > 0 ? (currentPage - 1) * pageSize + 1 : 0, to: Math.min(currentPage * pageSize, data.length), total: data.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
