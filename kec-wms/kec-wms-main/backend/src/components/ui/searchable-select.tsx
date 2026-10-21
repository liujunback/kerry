"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectProps<T> {
  options: T[]
  getOptionValue: (option: T) => string
  getOptionLabel: (option: T) => string
  value?: string | string[]
  onChange: (value: string | string[]) => void
  mode?: 'single' | 'multiple'
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  contentClassName?: string
  onSearch?: (query: string) => void
  selectedTextFormatter?: (selectedCount: number) => string
}

export function SearchableSelect<T>({
  options,
  getOptionValue,
  getOptionLabel,
  value,
  onChange,
  mode = 'single',
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  loading = false,
  className,
  contentClassName,
  onSearch,
  selectedTextFormatter,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedValues = React.useMemo(() => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }, [value])

  const filteredOptions = React.useMemo(() => {
    if (onSearch || !search) return options

    const lowerSearch = search.toLowerCase()
    return options.filter((option) => {
      const label = getOptionLabel(option).toLowerCase()
      const optionValue = getOptionValue(option).toLowerCase()
      return label.includes(lowerSearch) || optionValue.includes(lowerSearch)
    })
  }, [options, search, getOptionLabel, getOptionValue, onSearch])

  const selectedOptions = React.useMemo(() => {
    return options.filter((option) => selectedValues.includes(getOptionValue(option)))
  }, [options, selectedValues, getOptionValue])

  const handleSearchChange = (query: string) => {
    setSearch(query)
    onSearch?.(query)
  }

  const handleSelect = (optionValue: string) => {
    if (mode === 'single') {
      onChange(optionValue === value ? '' : optionValue)
      setOpen(false)
      return
    }

    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue]

    onChange(nextValues)
  }

  const displayText = React.useMemo(() => {
    if (selectedOptions.length === 0) return placeholder
    if (mode === 'single') return getOptionLabel(selectedOptions[0])
    return selectedTextFormatter
      ? selectedTextFormatter(selectedOptions.length)
      : `${selectedOptions.length} selected`
  }, [selectedOptions, placeholder, mode, getOptionLabel, selectedTextFormatter])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 justify-between font-normal",
            !selectedValues.length && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[200px] p-0", contentClassName)}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList onWheel={(event) => event.stopPropagation()}>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const optionValue = getOptionValue(option)
                const isSelected = selectedValues.includes(optionValue)

                return (
                  <CommandItem
                    key={optionValue}
                    value={optionValue}
                    onSelect={() => handleSelect(optionValue)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{getOptionLabel(option)}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
