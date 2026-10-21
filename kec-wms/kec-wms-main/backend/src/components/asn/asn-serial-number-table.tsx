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

interface SerialNumberRecord {
  id: string
  skuCode: string
  skuName: string
  barcode: string
  serialNumber: string
}

interface AsnSerialNumberTableProps {
  asnId: string
}

export function AsnSerialNumberTable({ asnId }: AsnSerialNumberTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [records, setRecords] = useState<SerialNumberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/serial-numbers`)
        const data = await response.json()
        if (data.success) {
          setRecords(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch serial numbers:', error)
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
      <CardHeader>
        <CardTitle>{t('serialNumber.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('line.skuCode')}</TableHead>
                <TableHead>{t('line.skuName')}</TableHead>
                <TableHead>{t('line.barcode')}</TableHead>
                <TableHead>{t('serialNumber.serialNumber')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.skuCode}</TableCell>
                    <TableCell>{record.skuName}</TableCell>
                    <TableCell>{record.barcode}</TableCell>
                    <TableCell>{record.serialNumber}</TableCell>
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
