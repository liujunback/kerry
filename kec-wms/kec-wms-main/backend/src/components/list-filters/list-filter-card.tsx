import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FilterSectionMode = 'compact' | 'advanced' | 'selection-aware'

interface ListFilterCardProps {
  children: ReactNode
  mode?: FilterSectionMode
  className?: string
}

const modeClassName: Record<FilterSectionMode, string> = {
  compact: 'rounded-lg border bg-muted/25 p-4',
  advanced: 'rounded-lg border bg-muted/30 p-4',
  'selection-aware': 'rounded-lg border bg-muted/30 p-4',
}

export function ListFilterCard({
  children,
  mode = 'compact',
  className,
}: ListFilterCardProps) {
  return (
    <div className={cn(modeClassName[mode], className)}>
      {children}
    </div>
  )
}
