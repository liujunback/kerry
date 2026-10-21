'use client'

import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { LogOut, Bell, User, Printer, Plug, Download, ChevronDown, Globe, QrCode, Video } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSettings } from '@/components/theme-settings'
import { ToastSoundControl } from '@/components/toast-sound'
import { usePrintStore } from '@/stores/print-store'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { clearPermissionCache } from '@/contexts/permission-context'
import { clearWarehouseSelectionCache } from '@/contexts/warehouse-context'
import { WarehouseSwitcher } from '@/components/warehouse-switcher'
import { PdaAccessDialog } from '@/components/pda-access-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  user: {
    id: string
    name?: string | null
    username: string
    tenantName: string
  }
  locale: string
}

export function Header({ user, locale }: HeaderProps) {
  const t = useTranslations('auth')
  const tUsers = useTranslations('users')
  const tCommon = useTranslations('common')
  const { isConnected, connect } = usePrintStore()
  const toolButtonClass = 'h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground'
  const [pdaDialogOpen, setPdaDialogOpen] = useState(false)
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  useEffect(() => {
    connect()
  }, [connect])

  const localeLabel = locale === 'zh' ? '中文' : 'EN'

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          {user.tenantName}
        </h1>
        <WarehouseSwitcher />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/85 p-1 shadow-sm backdrop-blur">
          {hydrated ? (
            isConnected ? (
              <div
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-emerald-500"
                title={tCommon('printer.connected')}
                aria-label={tCommon('printer.connected')}
              >
                <Printer className="h-[17px] w-[17px] stroke-[2.2]" />
                <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-card bg-emerald-500" />
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    title={tCommon('printer.disconnected')}
                    aria-label={tCommon('printer.disconnected')}
                  >
                    <Printer className="h-[17px] w-[17px] stroke-[2.2]" />
                    <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-card bg-red-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {tCommon('printer.disconnected')}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={connect}>
                    <Plug className="h-4 w-4" />
                    {tCommon('printer.connect')}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/downloads/print-agent.zip" download>
                      <Download className="h-4 w-4" />
                      {tCommon('printer.download')}
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          ) : (
            <div
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-red-500"
              title={tCommon('printer.disconnected')}
              aria-label={tCommon('printer.disconnected')}
            >
              <Printer className="h-[17px] w-[17px] stroke-[2.2]" />
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-card bg-red-500" />
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={toolButtonClass}
                title={tCommon('videoRecorder.title')}
                aria-label={tCommon('videoRecorder.title')}
              >
                <Video className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {tCommon('videoRecorder.title')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/downloads/pack-video-recorder-setup-1.0.0.exe" download>
                  <Download className="h-4 w-4" />
                  {tCommon('videoRecorder.download')}
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className={toolButtonClass}
            title={tUsers('pdaQrcodeDialog.accessTitle')}
            aria-label={tUsers('pdaQrcodeDialog.accessTitle')}
            onClick={() => setPdaDialogOpen(true)}
          >
            <QrCode className="h-4 w-4" />
          </Button>
          <ThemeSettings className={toolButtonClass} />
          <ToastSoundControl className={toolButtonClass} />
          {hydrated ? (
            <LanguageSwitcher currentLocale={locale} className="h-8 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" />
          ) : (
            <div className="flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>{localeLabel}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={toolButtonClass}
            title="通知"
            aria-label="通知"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>

        {hydrated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background/85 pl-1.5 pr-2.5 text-left shadow-sm transition-colors hover:bg-muted/60">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="max-w-24 truncate whitespace-nowrap text-sm font-medium text-foreground">
                  {user.name || user.username}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuLabel className="space-y-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {user.name || user.username}
                </div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  @{user.username}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  clearPermissionCache()
                  clearWarehouseSelectionCache()
                  signOut({ callbackUrl: '/login' })
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background/85 pl-1.5 pr-2.5 text-left shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="max-w-24 truncate whitespace-nowrap text-sm font-medium text-foreground">
              {user.name || user.username}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        )}
      </div>

      <PdaAccessDialog
        open={pdaDialogOpen}
        onOpenChange={setPdaDialogOpen}
        user={{
          id: user.id,
          username: user.username,
          fullName: user.name || user.username,
        }}
      />
    </header>
  )
}
