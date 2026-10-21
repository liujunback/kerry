'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Package, Box, Layers, Grid3X3, LayoutGrid, ShoppingCart } from 'lucide-react'

interface ContainerTypeBadgeProps {
  type: string
}

const typeIcons: Record<string, React.ReactNode> = {
  LARGE_BOX: <Box className="h-3 w-3" />,
  MEDIUM_BOX: <Package className="h-3 w-3" />,
  SMALL_BOX: <Layers className="h-3 w-3" />,
  SORTING_BOX: <Grid3X3 className="h-3 w-3" />,
  PALLET: <LayoutGrid className="h-3 w-3" />,
  CAGE_CART: <ShoppingCart className="h-3 w-3" />,
}

export function ContainerTypeBadge({ type }: ContainerTypeBadgeProps) {
  const t = useTranslations('containers.containerTypes')

  return (
    <Badge variant="outline" className="gap-1">
      {typeIcons[type]}
      {t(type as 'LARGE_BOX' | 'MEDIUM_BOX' | 'SMALL_BOX' | 'SORTING_BOX' | 'PALLET' | 'CAGE_CART')}
    </Badge>
  )
}
