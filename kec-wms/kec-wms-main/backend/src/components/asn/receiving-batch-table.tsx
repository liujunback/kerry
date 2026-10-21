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
import { formatDate } from '@/lib/utils/date-formatter'

interface InventoryRecord {
  id: string
  skuCode: string
  batchNumber: string | null
  locationCode: string
  quantity: number
  udf: string
  expiryDate: string | null
  lotNumber: string | null
}

interface ReceivingBatchTableProps {
  asnId: string
}

export function ReceivingBatchTable({ asnId }: ReceivingBatchTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [records, setRecords] = useState<InventoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/receiving-records`)
        const data = await response.json()
        if (data.success) {
          setRecords(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch receiving records:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [asnId])

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
        <CardTitle>{t('receivingBatchInventory.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="py-3">{t('line.skuCode')}</TableHead>
                <TableHead className="py-3">{t('receivingBatch.batchNumber')}</TableHead>
                <TableHead className="py-3">{t('receivingBatchInventory.location')}</TableHead>
                <TableHead className="py-3 text-right">{t('receivingBatchInventory.quantity')}</TableHead>
                <TableHead className="py-3">{t('receivingBatchInventory.udf')}</TableHead>
                <TableHead className="py-3">{t('receivingBatchInventory.expiryDate')}</TableHead>
                <TableHead className="py-3">{t('receivingBatchInventory.batchNo')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <TableRow key={record.id} className="h-12">
                    <TableCell className="py-3 font-medium">{record.skuCode}</TableCell>
                    <TableCell className="py-3">{record.batchNumber || '-'}</TableCell>
                    <TableCell className="py-3">{record.locationCode}</TableCell>
                    <TableCell className="py-3 text-right">{record.quantity}</TableCell>
                    <TableCell className="py-3">{record.udf}</TableCell>
                    <TableCell className="py-3">{formatDate(record.expiryDate) || '-'}</TableCell>
                    <TableCell className="py-3">{record.lotNumber || '-'}</TableCell>
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
