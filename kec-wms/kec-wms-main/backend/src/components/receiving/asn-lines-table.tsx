'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useReceivingStore } from '@/stores/receiving-store'
import { cn } from '@/lib/utils'

export function AsnLinesTable() {
  const t = useTranslations('receiving')
  const tAsn = useTranslations('asn')
  const { asnLines, currentItem } = useReceivingStore()

  const getStatusBadge = (line: typeof asnLines[0]) => {
    const remaining = line.expectedQty - line.receivedQty
    if (remaining === 0) {
      return <Badge variant="default" className="bg-green-500">{t('line.completed')}</Badge>
    }
    if (line.receivedQty > 0) {
      return <Badge variant="secondary">{t('line.partial')}</Badge>
    }
    return <Badge variant="outline">{t('line.pending')}</Badge>
  }

  if (asnLines.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {t('asn.scanFirst')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{tAsn('line.skuCode')}</TableHead>
                <TableHead>{tAsn('line.barcode')}</TableHead>
                <TableHead>{tAsn('line.skuName')}</TableHead>
                <TableHead className="text-right w-20">{t('line.expectedQty')}</TableHead>
                <TableHead className="text-right w-20">{t('line.receivedQty')}</TableHead>
                <TableHead className="text-right w-20">{t('line.remainingQty')}</TableHead>
                <TableHead className="w-24">{tAsn('line.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asnLines.map((line) => {
                const remaining = line.expectedQty - line.receivedQty
                const isCurrentLine = currentItem?.asnLineId === line.id
                return (
                  <TableRow
                    key={line.id}
                    className={cn(
                      isCurrentLine && 'bg-blue-50 dark:bg-blue-950',
                      remaining === 0 && 'opacity-60'
                    )}
                  >
                    <TableCell className="font-medium">{line.lineNumber}</TableCell>
                    <TableCell className="font-mono text-sm">{line.skuCode}</TableCell>
                    <TableCell className="font-mono text-sm">{line.barcode || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={line.skuName}>
                      {line.skuName}
                    </TableCell>
                    <TableCell className="text-right">{line.expectedQty}</TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">
                      {line.receivedQty}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {remaining}
                    </TableCell>
                    <TableCell>{getStatusBadge(line)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
