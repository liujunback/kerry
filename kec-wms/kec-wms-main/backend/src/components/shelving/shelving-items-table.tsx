'use client'

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
import { ClipboardList } from 'lucide-react'
import { type ShelvingRecord } from '@/stores/shelving-store'

interface ShelvingItemsTableProps {
  records: ShelvingRecord[]
}

export function ShelvingItemsTable({ records }: ShelvingItemsTableProps) {
  const t = useTranslations('shelving')

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('records.empty')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {t('records.title')}
          <Badge variant="secondary" className="ml-2">
            {records.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('records.table.skuCode')}</TableHead>
                <TableHead>{t('records.table.skuName')}</TableHead>
                <TableHead>{t('records.table.location')}</TableHead>
                <TableHead className="text-right">{t('records.table.quantity')}</TableHead>
                <TableHead>{t('records.table.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm">{record.skuCode}</TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {record.skuName || '-'}
                  </TableCell>
                  <TableCell>{record.locationCode}</TableCell>
                  <TableCell className="text-right">{record.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(record.createdAt).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
