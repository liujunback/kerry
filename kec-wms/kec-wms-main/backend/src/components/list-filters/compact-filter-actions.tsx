'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterActionBar } from './filter-action-bar'

interface CompactFilterActionsProps {
  pendingChangeCount: number
  searchLabel: string
  resetLabel: string
  moreLabel: string
  collapseLabel: string
  expanded: boolean
  onReset: () => void
  onToggleExpanded: () => void
  showToggle?: boolean
  className?: string
}

export function CompactFilterActions({
  pendingChangeCount,
  searchLabel,
  resetLabel,
  moreLabel,
  collapseLabel,
  expanded,
  onReset,
  onToggleExpanded,
  showToggle = true,
  className,
}: CompactFilterActionsProps) {
  const toggleLabel = expanded ? collapseLabel : moreLabel

  return (
    <FilterActionBar className={`gap-1.5 whitespace-nowrap ${className ?? ''}`.trim()}>
      <Button
        type="submit"
        size="sm"
        className={`h-8 px-2.5 transition-all ${
          pendingChangeCount > 0
            ? 'shadow-[0_0_0_2px_rgba(251,191,36,0.28),0_8px_20px_-12px_rgba(249,115,22,0.8)]'
            : ''
        }`}
      >
        <Search className="mr-1 h-3.5 w-3.5" />
        <span>{searchLabel}</span>
        {pendingChangeCount > 0 && (
          <span className="ml-1 rounded bg-background/20 px-1 text-[10px] leading-4">
            {pendingChangeCount}
          </span>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        className="h-8 w-8 p-0"
        aria-label={resetLabel}
        title={resetLabel}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      {showToggle && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="h-8 w-8 p-0 text-muted-foreground/80 hover:text-foreground"
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>
      )}
    </FilterActionBar>
  )
}
