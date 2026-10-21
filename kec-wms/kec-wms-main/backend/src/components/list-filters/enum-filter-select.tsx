'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface EnumFilterSelectOption {
  value: string
  label: string
}

export interface EnumFilterSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: EnumFilterSelectOption[]
  allLabel: string
  showAllOption?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
}

export function EnumFilterSelect({
  value,
  onValueChange,
  options,
  allLabel,
  showAllOption = true,
  placeholder,
  className,
  triggerClassName,
  disabled,
}: EnumFilterSelectProps) {
  const fallbackValue = showAllOption ? '__all__' : (options[0]?.value ?? '')
  const normalizedValue = value && value !== 'all' ? value : fallbackValue

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) => onValueChange(showAllOption && nextValue === '__all__' ? '' : nextValue)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-full justify-between bg-background font-normal shadow-none data-[placeholder]:text-muted-foreground',
          triggerClassName,
          className
        )}
      >
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        {showAllOption && <SelectItem value="__all__">{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
