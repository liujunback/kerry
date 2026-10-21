'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface EntitySelectOption {
  value: string
  label: string
  keywords?: string[]
}

export interface EntitySelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: EntitySelectOption[]
  allLabel?: string
  searchPlaceholder: string
  emptyText: string
  placeholder: string
  disabled?: boolean
  loading?: boolean
  showAll?: boolean
  className?: string
  contentClassName?: string
}

export function EntitySelect({
  value,
  onValueChange,
  options,
  allLabel,
  searchPlaceholder,
  emptyText,
  placeholder,
  disabled,
  loading,
  showAll = false,
  className,
  contentClassName,
}: EntitySelectProps) {
  const [open, setOpen] = useState(false)
  const normalizedValue = value === 'all' ? '' : (value ?? '')
  const selected = options.find((option) => option.value === normalizedValue)

  const displayLabel = !normalizedValue && showAll
    ? (allLabel || placeholder)
    : (selected?.label || placeholder)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('h-8 w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate', !selected && !normalizedValue && 'text-muted-foreground')}>
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('p-0', contentClassName)}
        align="start"
        style={{ width: 'max(var(--radix-popover-trigger-width), 280px)' }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {showAll && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onValueChange('')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', !normalizedValue ? 'opacity-100' : 'opacity-0')}
                  />
                  {allLabel || placeholder}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={[option.label, option.value, ...(option.keywords ?? [])].join(' ')}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      normalizedValue === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
