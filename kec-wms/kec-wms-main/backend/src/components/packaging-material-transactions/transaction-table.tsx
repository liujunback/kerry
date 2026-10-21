'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransactionTypeBadge } from './transaction-type-badge'
import { AuditStatusBadge } from './audit-status-badge'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface Transaction {
  id: string
  warehouseId: string
  materialId: string
  materialCode: string
  materialName: string
  transactionType: string
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  referenceType?: string | null
  referenceNumber?: string | null
  operatorId: string
  operatorName: string
  operationTime: string
  auditStatus: string
  notes?: string | null
}

interface TransactionTableProps {
  transactions: Transaction[]
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const t = useTranslations('packagingMaterialTransaction')
  const tCommon = useTranslations('common')

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('materialCode')}</TableHead>
            <TableHead>{t('materialName')}</TableHead>
            <TableHead>{t('transactionType')}</TableHead>
            <TableHead className="text-right">{t('quantityChange')}</TableHead>
            <TableHead className="text-right">{t('quantityAfter')}</TableHead>
            <TableHead>{t('referenceNumber')}</TableHead>
            <TableHead>{t('operatorName')}</TableHead>
            <TableHead>{t('operationTime')}</TableHead>
            <TableHead>{t('auditStatusLabel')}</TableHead>
            <TableHead className="text-right">{tCommon('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                {tCommon('noData')}
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium">{tx.materialCode}</TableCell>
                <TableCell>{tx.materialName}</TableCell>
                <TableCell>
                  <TransactionTypeBadge type={tx.transactionType} />
                </TableCell>
                <TableCell className={`text-right font-medium ${tx.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange}
                </TableCell>
                <TableCell className="text-right">{tx.quantityAfter}</TableCell>
                <TableCell>{tx.referenceNumber || '-'}</TableCell>
                <TableCell>{tx.operatorName}</TableCell>
                <TableCell>{formatDate(tx.operationTime) || '-'}</TableCell>
                <TableCell>
                  <AuditStatusBadge status={tx.auditStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/packaging-material-transactions/${tx.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
