'use client'

import { useTranslations } from 'next-intl'
import { format } from '@/lib/utils/date-formatter'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Order {
  id: string
  orderNumber: string
  referenceNumber: string | null
  orderBusinessType: string
  orderType: string
  isCombined: boolean
  totalWeightKg: number | null
  totalSkuCount: number
  totalOrderedQty: number
  hasSerialItems: boolean
  notes: string | null
  client: {
    id: string
    clientCode: string
    clientName: string
  }
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  timeline: {
    allocatedAt: string | null
    expectedOutboundTime: string | null
  } | null
}

interface AvailableOrdersTableProps {
  orders: Order[]
  selectedIds: string[]
  onSelectChange: (ids: string[]) => void
  loading?: boolean
}

export function AvailableOrdersTable({
  orders,
  selectedIds,
  onSelectChange,
  loading = false,
}: AvailableOrdersTableProps) {
  const t = useTranslations('pickOrder')
  const tOutbound = useTranslations('outbound.order')
  const tCommon = useTranslations('common')

  const isAllSelected = orders.length > 0 && selectedIds.length === orders.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < orders.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectChange(orders.map((o) => o.id))
    } else {
      onSelectChange([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectChange([...selectedIds, id])
    } else {
      onSelectChange(selectedIds.filter((i) => i !== id))
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm')
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label={tCommon('selectAll')}
                {...(isIndeterminate ? { 'data-state': 'indeterminate' } : {})}
              />
            </TableHead>
            <TableHead>{t('warehouse')}</TableHead>
            <TableHead>{t('orderNumber')}</TableHead>
            <TableHead>{t('referenceNumber')}</TableHead>
            <TableHead>{t('client')}</TableHead>
            <TableHead>{t('orderType')}</TableHead>
            <TableHead>{t('createdDate')}</TableHead>
            <TableHead>{t('expectedOutbound')}</TableHead>
            <TableHead>{t('businessType')}</TableHead>
            <TableHead>{t('isCombined')}</TableHead>
            <TableHead>{t('weight')}</TableHead>
            <TableHead>{t('skuCount')}</TableHead>
            <TableHead>{t('itemCount')}</TableHead>
            <TableHead>{t('notes')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                {tCommon('loading')}...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                {t('noAvailableOrders')}
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} className={selectedIds.includes(order.id) ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOne(order.id, checked as boolean)}
                    aria-label={`${tCommon('select')} ${order.orderNumber}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{order.warehouse.warehouseCode}</TableCell>
                <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                <TableCell className="font-mono text-xs">{order.referenceNumber || '-'}</TableCell>
                <TableCell>{order.client.clientName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {tOutbound(`orderStructureTypes.${order.orderType}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{formatDate(order.timeline?.allocatedAt ?? null)}</TableCell>
                <TableCell className="text-xs">{formatDate(order.timeline?.expectedOutboundTime ?? null)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {tOutbound(`types.${order.orderBusinessType}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.isCombined ? (
                    <Badge variant="default" className="text-xs">{tCommon('yes')}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">{tCommon('no')}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {order.totalWeightKg ? `${Number(order.totalWeightKg).toFixed(2)} kg` : '-'}
                </TableCell>
                <TableCell className="text-center">{order.totalSkuCount}</TableCell>
                <TableCell className="text-center">{order.totalOrderedQty}</TableCell>
                <TableCell className="max-w-[100px] truncate text-xs" title={order.notes || ''}>
                  {order.notes || '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
