import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FilterActionBarProps {
  children: ReactNode
  className?: string
}

export function FilterActionBar({ children, className }: FilterActionBarProps) {
  return (
    <div className={cn('flex items-center gap-2 xl:justify-end', className)}>
      {children}
    </div>
  )
}
