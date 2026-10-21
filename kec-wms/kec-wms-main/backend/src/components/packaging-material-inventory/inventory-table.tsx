'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Eye, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventoryStatusBadge } from './inventory-status-badge'

interface InventoryItem {
  id: string
  warehouseId: string
  materialId: string
  materialCode: string
  materialName: string
  totalQuantity: number
  availableQuantity: number
  allocatedQuantity: number
  safetyStock: number
  minimumStock: number
  maximumStock?: number | null
  unit: string
  status: string
  lastMovementAt?: string | null
  material?: {
    materialType: string
    unitPrice?: number | null
    currency?: string | null
  }
}

interface InventoryTableProps {
  inventories: InventoryItem[]
}

export function InventoryTable({ inventories }: InventoryTableProps) {
  const t = useTranslations('packagingMaterialInventory')
  const tCommon = useTranslations('common')

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('materialCode')}</TableHead>
            <TableHead>{t('materialName')}</TableHead>
            <TableHead className="text-right">{t('totalQuantity')}</TableHead>
            <TableHead className="text-right">{t('availableQuantity')}</TableHead>
            <TableHead className="text-right">{t('safetyStock')}</TableHead>
            <TableHead>{t('unit')}</TableHead>
            <TableHead>{t('statusLabel')}</TableHead>
            <TableHead className="text-right">{tCommon('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                {tCommon('noData')}
              </TableCell>
            </TableRow>
          ) : (
            inventories.map((inventory) => (
              <TableRow key={inventory.id}>
                <TableCell className="font-medium">{inventory.materialCode}</TableCell>
                <TableCell>{inventory.materialName}</TableCell>
                <TableCell className="text-right">{inventory.totalQuantity}</TableCell>
                <TableCell className="text-right">{inventory.availableQuantity}</TableCell>
                <TableCell className="text-right">{inventory.safetyStock}</TableCell>
                <TableCell>{inventory.unit}</TableCell>
                <TableCell>
                  <InventoryStatusBadge status={inventory.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/packaging-material-inventory/${inventory.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/packaging-material-inventory/${inventory.id}?edit=settings`}>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
