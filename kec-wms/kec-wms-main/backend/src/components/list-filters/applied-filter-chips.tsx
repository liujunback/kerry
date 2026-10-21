'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AppliedFilterChip {
  key: string
  label: string
  value: string
  pending?: boolean
  onRemove?: () => void
}

interface AppliedFilterChipsProps {
  chips: AppliedFilterChip[]
  emptyText?: string
  collapseLabel?: string
  className?: string
}

export function AppliedFilterChips({
  chips,
  emptyText,
  collapseLabel = 'Collapse',
  className,
}: AppliedFilterChipsProps) {
  const [expanded, setExpanded] = useState(false)
  const [visibleChipCount, setVisibleChipCount] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chipMeasureRefs = useRef<Array<HTMLButtonElement | null>>([])
  const summaryMeasureRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (chips.length === 0) {
      return
    }

    const calculateVisibleChipCount = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0
      const summaryWidth = summaryMeasureRef.current?.offsetWidth ?? 0

      if (!containerWidth) {
        setVisibleChipCount(chips.length)
        return
      }

      const chipWidths = chips.map((_, index) => chipMeasureRefs.current[index]?.offsetWidth ?? 0)
      const gap = 8
      let usedWidth = 0
      let nextVisibleCount = chips.length

      for (let index = 0; index < chipWidths.length; index += 1) {
        const chipWidth = chipWidths[index]
        const nextWidth = usedWidth === 0 ? chipWidth : usedWidth + gap + chipWidth
        const remainingCount = chipWidths.length - index - 1
        const reservedWidth = remainingCount > 0 ? gap + summaryWidth : 0

        if (nextWidth + reservedWidth > containerWidth) {
          nextVisibleCount = index
          break
        }

        usedWidth = nextWidth
      }

      setVisibleChipCount(Math.max(nextVisibleCount, 1))
    }

    calculateVisibleChipCount()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => calculateVisibleChipCount())
        : null

    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver?.disconnect()
    }
  }, [chips])

  if (chips.length === 0) {
    return emptyText ? (
      <div className={cn('border-t pt-3', className)}>
        <div className="flex min-h-8 items-center text-[11px] text-muted-foreground/75">
          {emptyText}
        </div>
      </div>
    ) : null
  }

  const displayedChips = expanded ? chips : chips.slice(0, visibleChipCount)
  const hiddenChipCount = Math.max(chips.length - visibleChipCount, 0)
  const hiddenPendingChipCount = expanded
    ? 0
    : chips.slice(visibleChipCount).filter((chip) => chip.pending).length

  return (
    <div className={cn('border-t pt-3', className)}>
      <div
        ref={containerRef}
        className={cn(
          'flex min-h-8 items-center gap-2 overflow-hidden',
          expanded ? 'flex-wrap' : 'whitespace-nowrap'
        )}
      >
        {displayedChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            disabled={!chip.onRemove}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
              chip.pending
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border-border/70 bg-background text-foreground/85 hover:border-border hover:bg-accent/40',
              !chip.onRemove && 'cursor-default'
            )}
          >
            <span className={chip.pending ? 'text-amber-700/90' : 'text-muted-foreground/80'}>
              {chip.label}
            </span>
            <span
              className={cn(
                'max-w-48 truncate font-medium',
                chip.pending ? 'text-amber-950' : 'text-foreground/90'
              )}
            >
              {chip.value}
            </span>
            {chip.onRemove && (
              <X
                className={cn(
                  'h-3 w-3',
                  chip.pending ? 'text-amber-700/80' : 'text-muted-foreground/70'
                )}
              />
            )}
          </button>
        ))}

        {!expanded && hiddenChipCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11px] transition-colors',
              hiddenPendingChipCount > 0
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-border/70 bg-background text-muted-foreground hover:bg-accent/40'
            )}
          >
            <span>+{hiddenChipCount}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        )}

        {expanded && hiddenChipCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40"
          >
            <span>{collapseLabel}</span>
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute opacity-0">
        {chips.map((chip, index) => (
          <button
            key={`measure-${chip.key}`}
            ref={(element) => {
              chipMeasureRefs.current[index] = element
            }}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] text-foreground/85"
          >
            <span>{chip.label}</span>
            <span>{chip.value}</span>
            {chip.onRemove && <X className="h-3 w-3" />}
          </button>
        ))}

        <span
          ref={summaryMeasureRef}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          <span>+{chips.length}</span>
          <ChevronDown className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}
