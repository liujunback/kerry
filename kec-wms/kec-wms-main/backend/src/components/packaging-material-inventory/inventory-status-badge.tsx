'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface InventoryStatusBadgeProps {
  status: string
}

const statusColors: Record<string, string> = {
  NORMAL: 'bg-green-500 hover:bg-green-600',
  WARNING: 'bg-yellow-500 hover:bg-yellow-600',
  LOW_STOCK: 'bg-orange-500 hover:bg-orange-600',
  OUT_OF_STOCK: 'bg-red-500 hover:bg-red-600',
}

export function InventoryStatusBadge({ status }: InventoryStatusBadgeProps) {
  const t = useTranslations('packagingMaterialInventory')

  const colorClass = statusColors[status] || 'bg-gray-500 hover:bg-gray-600'

  return (
    <Badge className={colorClass}>
      {t(`status.${status}`)}
    </Badge>
  )
}
