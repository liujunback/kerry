'use client'

import { useRouter } from 'next/navigation'
import { localeOptions } from '@/i18n/config'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  currentLocale: string
  className?: string
}

export function LanguageSwitcher({ currentLocale, className }: LanguageSwitcherProps) {
  const router = useRouter()
  const t = useTranslations('language')
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === currentLocale) return

    try {
      await fetch('/api/v1/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      })

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Failed to switch locale:', error)
    }
  }

  const currentLanguage = localeOptions.find((locale) => locale.code === currentLocale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={isPending}
          aria-label={t('switch')}
          className={cn('h-9 gap-1.5 rounded-full px-2.5 text-muted-foreground hover:text-foreground', className)}
        >
          <Globe className="h-4 w-4" />
          <span className="text-[11px] font-semibold tracking-wide">
            {currentLanguage?.shortLabel ?? 'LANG'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[148px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {currentLanguage?.label ?? t('switch')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={currentLocale} onValueChange={handleLocaleChange}>
          {localeOptions.map((locale) => (
            <DropdownMenuRadioItem key={locale.code} value={locale.code}>
              {locale.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
