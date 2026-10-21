'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface TransactionTypeBadgeProps {
  type: string
}

const typeColors: Record<string, string> = {
  PURCHASE_INBOUND: 'bg-green-500 hover:bg-green-600',
  RETURN_INBOUND: 'bg-blue-500 hover:bg-blue-600',
  ORDER_OUTBOUND: 'bg-red-500 hover:bg-red-600',
  COUNT_ADJUSTMENT_IN: 'bg-cyan-500 hover:bg-cyan-600',
  COUNT_ADJUSTMENT_OUT: 'bg-orange-500 hover:bg-orange-600',
  DAMAGE_ADJUSTMENT_OUT: 'bg-pink-500 hover:bg-pink-600',
  TRANSFER_IN: 'bg-purple-500 hover:bg-purple-600',
  TRANSFER_OUT: 'bg-indigo-500 hover:bg-indigo-600',
  SCRAP: 'bg-gray-500 hover:bg-gray-600',
  OTHER_IN: 'bg-teal-500 hover:bg-teal-600',
  OTHER_OUT: 'bg-amber-500 hover:bg-amber-600',
}

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const t = useTranslations('packagingMaterialTransaction')

  const colorClass = typeColors[type] || 'bg-gray-500 hover:bg-gray-600'

  return (
    <Badge className={colorClass}>
      {t(`types.${type}`)}
    </Badge>
  )
}
