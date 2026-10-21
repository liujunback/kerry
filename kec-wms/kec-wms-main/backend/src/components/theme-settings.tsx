'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Check, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LEGACY_COLOR_KEY = 'theme-primary-color'
const THEME_COLOR_KEY = 'kec-wms-theme-color'
const THEME_COLOR_EVENT = 'kec-wms-theme-color-change'

const THEME_COLORS = [
  { key: 'orange', value: '#ea580c' },
  { key: 'blue', value: '#2563eb' },
  { key: 'emerald', value: '#059669' },
  { key: 'violet', value: '#7c3aed' },
  { key: 'rose', value: '#e11d48' },
] as const

type ThemeColor = (typeof THEME_COLORS)[number]['key']
type StoredThemeColor = ThemeColor | 'cyan'

const DEFAULT_THEME_COLOR: ThemeColor = 'orange'

interface ThemeSettingsProps {
  className?: string
}

function isThemeColor(value: string | null): value is ThemeColor {
  return THEME_COLORS.some((color) => color.key === value)
}

function normalizeThemeColor(value: string | null): ThemeColor {
  if (value === 'cyan') {
    return 'violet'
  }

  return isThemeColor(value) ? value : DEFAULT_THEME_COLOR
}

function applyThemeColor(color: ThemeColor) {
  const selectedColor = THEME_COLORS.find((item) => item.key === color) ?? THEME_COLORS[0]

  document.documentElement.style.setProperty('--primary', selectedColor.value)
  document.documentElement.style.setProperty('--ring', selectedColor.value)
  document.documentElement.style.setProperty('--sidebar-primary', selectedColor.value)
  document.documentElement.style.setProperty('--sidebar-ring', selectedColor.value)
  document.documentElement.style.removeProperty('--primary-foreground')
  document.documentElement.style.removeProperty('--sidebar-primary-foreground')
  document.documentElement.dataset.themeColor = color
}

function readThemeColor(): ThemeColor {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_COLOR
  }

  try {
    const storedColor = window.localStorage.getItem(THEME_COLOR_KEY)
    return normalizeThemeColor(storedColor)
  } catch {
    return DEFAULT_THEME_COLOR
  }
}

function subscribeThemeColor(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_COLOR_KEY) {
      onStoreChange()
    }
  }

  window.addEventListener(THEME_COLOR_EVENT, onStoreChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(THEME_COLOR_EVENT, onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

function persistThemeColor(color: StoredThemeColor) {
  try {
    window.localStorage.setItem(THEME_COLOR_KEY, normalizeThemeColor(color))
  } catch {
    // Keep the current page updated even if browser storage is unavailable.
  }
}

function clearLegacyThemeColor() {
  try {
    window.localStorage.removeItem(LEGACY_COLOR_KEY)
  } catch {
    // Ignore storage failures; legacy cleanup is best-effort.
  }
}

export function ThemeSettings({ className }: ThemeSettingsProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations('themeSettings')
  const themeColor = useSyncExternalStore(
    subscribeThemeColor,
    readThemeColor,
    () => DEFAULT_THEME_COLOR
  )
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  useEffect(() => {
    clearLegacyThemeColor()
    applyThemeColor(themeColor)
  }, [themeColor])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn('h-9 w-9 rounded-full', className)}>
        <Moon className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'
  const selectedColor = THEME_COLORS.find((color) => color.key === themeColor) ?? THEME_COLORS[0]

  const handleColorSelect = (color: ThemeColor) => {
    persistThemeColor(color)
    applyThemeColor(color)
    window.dispatchEvent(new Event(THEME_COLOR_EVENT))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground', className)}
          title={t('title')}
          aria-label={t('title')}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span
            className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-card"
            style={{ backgroundColor: selectedColor.value }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
          {t('displayMode')}
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1">
          <Button
            type="button"
            variant={isDark ? 'ghost' : 'secondary'}
            size="sm"
            className="justify-start gap-2"
            onClick={() => setTheme('light')}
          >
            <Sun className="h-4 w-4" />
            {t('light')}
          </Button>
          <Button
            type="button"
            variant={isDark ? 'secondary' : 'ghost'}
            size="sm"
            className="justify-start gap-2"
            onClick={() => setTheme('dark')}
          >
            <Moon className="h-4 w-4" />
            {t('dark')}
          </Button>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
          {t('themeColor')}
        </DropdownMenuLabel>
        <div className="grid gap-1">
          {THEME_COLORS.map((color) => {
            const selected = color.key === themeColor

            return (
              <button
                key={color.key}
                type="button"
                className={cn(
                  'flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  selected && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleColorSelect(color.key)}
              >
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: color.value }}
                />
                <span className="flex-1 text-left">{t(`colors.${color.key}`)}</span>
                {selected ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
