'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Printer, LayoutTemplate, History, Plug, PlugZap } from 'lucide-react'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { usePrintStore } from '@/stores/print-store'
import { TemplateList } from './template-list'
import { DeviceList } from './device-list'
import { PrintHistoryTable } from './print-history-table'

export function PrintSettingsPage() {
  const tCommon = useTranslations('common')
  const t = useTranslations('printSettings')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings')),
    module: { label: t('title'), href: '/settings/print' },
  })
  const { isConnected, agentVersion, connect, disconnect } = usePrintStore()

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumb items={breadcrumb.list()} />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Printer className="h-4 w-4 text-muted-foreground" />
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                {tCommon('printer.connected')} {agentVersion && `v${agentVersion}`}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-500 border-red-500">
                {tCommon('printer.disconnected')}
              </Badge>
            )}
          </div>
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="gap-2 text-red-600 hover:text-red-700 hover:border-red-600"
            >
              <PlugZap className="h-4 w-4" />
              {tCommon('printer.disconnect')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              className="gap-2 text-green-600 hover:text-green-700 hover:border-green-600"
            >
              <Plug className="h-4 w-4" />
              {tCommon('printer.connect')}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            {t('tabs.templates')}
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Printer className="h-4 w-4" />
            {t('tabs.devices')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {t('tabs.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <TemplateList />
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <DeviceList />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <PrintHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
