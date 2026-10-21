'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MoreFiltersToggleProps {
  expanded: boolean
  onToggle: () => void
  moreLabel: string
  collapseLabel: string
  className?: string
}

export function MoreFiltersToggle({
  expanded,
  onToggle,
  moreLabel,
  collapseLabel,
  className,
}: MoreFiltersToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={className ?? 'h-8 min-w-[84px] px-2 text-xs font-normal text-muted-foreground/80 hover:text-foreground'}
    >
      {expanded ? (
        <>
          <ChevronUp className="mr-1 h-3.5 w-3.5 opacity-70" />
          {collapseLabel}
        </>
      ) : (
        <>
          <ChevronDown className="mr-1 h-3.5 w-3.5 opacity-70" />
          {moreLabel}
        </>
      )}
    </Button>
  )
}
