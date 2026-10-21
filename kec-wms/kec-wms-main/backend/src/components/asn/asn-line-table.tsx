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

interface AsnLine {
  id: string
  lineNumber: number
  skuId: string
  skuCode: string
  skuName: string | null
  expectedQty: number
  receivedQty: number
  receivedGoodQty: number
  receivedDamagedQty: number
  putawayQty: number
  batchNumber?: string | null
  cartonCode?: string | null
  expiryDate?: string | null
  status: string
  notes?: string | null
  sku?: {
    skuCode: string
    skuName: string
    isFirstReceiving?: boolean
    weightKg?: string | null
    lengthCm?: string | null
    widthCm?: string | null
    heightCm?: string | null
  } | null
}

interface AsnLineTableProps {
  asnId: string
  asnStatus?: string
}

export function AsnLineTable({ asnId, asnStatus }: AsnLineTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [lines, setLines] = useState<AsnLine[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // 判断是否已开始收货（显示收货差异列）
  const hasStartedReceiving = asnStatus && !['CREATED', 'PENDING_RECEIVING'].includes(asnStatus)

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/lines`)
        const data = await response.json()
        if (data.success) {
          setLines(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch ASN lines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLines()
  }, [asnId])

  const formatDimensions = (sku?: AsnLine['sku']) => {
    if (!sku?.lengthCm || !sku?.widthCm || !sku?.heightCm) return '-'
    return `${sku.lengthCm}*${sku.widthCm}*${sku.heightCm}`
  }

  const formatWeight = (weight?: string | null) => {
    if (!weight) return '-'
    return `${weight}kg`
  }

  // 分页计算
  const totalPages = Math.ceil(lines.length / pageSize)
  const paginatedLines = lines.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
        <CardTitle>{t('line.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('line.skuCode')}</TableHead>
                <TableHead>{t('line.carton')}</TableHead>
                <TableHead>{t('line.skuName')}</TableHead>
                <TableHead>{t('line.isNew')}</TableHead>
                <TableHead>{t('line.weight')}</TableHead>
                <TableHead>{t('line.dimensions')}</TableHead>
                <TableHead>{t('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{t('line.expectedQty')}</TableHead>
                <TableHead className="text-right">{t('line.receivedGoodQty')}</TableHead>
                <TableHead className="text-right">{t('line.receivedDamagedQty')}</TableHead>
                {hasStartedReceiving && (
                  <TableHead className="text-right">{t('line.receivingVariance')}</TableHead>
                )}
                <TableHead className="text-right">{t('line.putawayQty')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasStartedReceiving ? 12 : 11} className="text-center py-8 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLines.map((line) => {
                  const variance = line.receivedQty - line.expectedQty
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.skuCode}</TableCell>
                      <TableCell>{line.cartonCode || '-'}</TableCell>
                      <TableCell>{line.skuName || '-'}</TableCell>
                      <TableCell>{line.sku?.isFirstReceiving ? tCommon('yes') : tCommon('no')}</TableCell>
                      <TableCell>{formatWeight(line.sku?.weightKg)}</TableCell>
                      <TableCell>{formatDimensions(line.sku)}</TableCell>
                      <TableCell>{line.batchNumber || '-'}</TableCell>
                      <TableCell className="text-right">{line.expectedQty}</TableCell>
                      <TableCell className="text-right text-green-600">{line.receivedGoodQty}</TableCell>
                      <TableCell className="text-right text-red-600">{line.receivedDamagedQty}</TableCell>
                      {hasStartedReceiving && (
                        <TableCell className={`text-right ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-blue-600' : ''}`}>
                          {variance > 0 ? `+${variance}` : variance}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{line.putawayQty}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        {/* 分页 */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {tCommon('pagination.showing', { from: lines.length > 0 ? (currentPage - 1) * pageSize + 1 : 0, to: Math.min(currentPage * pageSize, lines.length), total: lines.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
