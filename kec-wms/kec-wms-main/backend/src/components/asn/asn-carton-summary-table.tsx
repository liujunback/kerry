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

interface CartonSummary {
  index: number
  carton: string
  skuTypes: number
  totalExpectedQty: number
  totalReceivedQty: number
  varianceQty: number
  totalPutawayQty: number
}

interface AsnCartonSummaryTableProps {
  asnId: string
}

export function AsnCartonSummaryTable({ asnId }: AsnCartonSummaryTableProps) {
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')
  const [data, setData] = useState<CartonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/v1/asn/${asnId}/carton-summary`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch carton summary:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [asnId])

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
        <CardTitle>{t('cartonSummary.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cartonSummary.cartonNumber')}</TableHead>
                <TableHead className="text-right">{t('cartonSummary.skuTypes')}</TableHead>
                <TableHead className="text-right">{t('cartonSummary.totalExpectedSku')}</TableHead>
                <TableHead className="text-right">{t('cartonSummary.totalReceivedSku')}</TableHead>
                <TableHead className="text-right">{t('cartonSummary.skuVariance')}</TableHead>
                <TableHead className="text-right">{t('cartonSummary.totalPutawaySku')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.carton}>
                    <TableCell className="font-medium">{item.carton}</TableCell>
                    <TableCell className="text-right">{item.skuTypes}</TableCell>
                    <TableCell className="text-right">{item.totalExpectedQty}</TableCell>
                    <TableCell className="text-right">{item.totalReceivedQty}</TableCell>
                    <TableCell className="text-right">{item.varianceQty}</TableCell>
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
