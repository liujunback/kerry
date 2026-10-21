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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils/date-formatter'

interface ReceivingDetail {
  id: string
  recordNumber: string
  skuCode: string
  skuName: string | null
  containerCode: string | null
  expectedQty: number
  receivedQty: number
  goodQty: number
  damagedQty: number
  batchNumber: string | null
  lotNumber: string | null
  expiryDate: string | null
  productionDate: string | null
  receivingMode: string
  deviceType: string
  receivedAt: string
  receivedBy: string
}

interface AsnReceivingDetailTableProps {
  asnId: string
}

export function AsnReceivingDetailTable({ asnId }: AsnReceivingDetailTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [records, setRecords] = useState<ReceivingDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/receiving-details`)
        const data = await response.json()
        if (data.success) {
          setRecords(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch receiving details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [asnId])

  const formatDateTimeOrDash = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr) || '-'
  }

  const totalPages = Math.ceil(records.length / pageSize)
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
      <CardHeader className="pb-4">
        <CardTitle>{t('receivingDetail.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="py-3">{t('line.skuCode')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.skuName')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.containerCode')}</TableHead>
                <TableHead className="py-3 text-right">{t('receivingDetail.receivedQty')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.quality')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.batchNumber')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.expiryDate')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.receivingMode')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.receivedAt')}</TableHead>
                <TableHead className="py-3">{t('receivingDetail.receivedBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <TableRow key={record.id} className="h-12">
                    <TableCell className="py-3">{record.skuCode}</TableCell>
                    <TableCell className="py-3">{record.skuName || '-'}</TableCell>
                    <TableCell className="py-3">{record.containerCode || '-'}</TableCell>
                    <TableCell className="py-3 text-right">{record.receivedQty}</TableCell>
                    <TableCell className="py-3">
                      {record.damagedQty > 0 ? (
                        <Badge variant="destructive">{t('receivingDetail.damaged')}</Badge>
                      ) : (
                        <Badge variant="default">{t('receivingDetail.good')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3">{record.batchNumber || '-'}</TableCell>
                    <TableCell className="py-3">{formatDate(record.expiryDate) || '-'}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline">
                        {record.receivingMode === 'SKU' ? t('receivingDetail.modeSku') : t('receivingDetail.modeContainer')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">{formatDateTimeOrDash(record.receivedAt) || '-'}</TableCell>
                    <TableCell className="py-3">{record.receivedBy}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {tCommon('pagination.showing', { from: records.length > 0 ? (currentPage - 1) * pageSize + 1 : 0, to: Math.min(currentPage * pageSize, records.length), total: records.length })}
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
