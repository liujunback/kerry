'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Package, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

export default function InventoryReportsPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }],
    module: { label: t('inventory.title'), href: '/reports/inventory' },
  })

  const reports = [
    {
      key: 'stockLevels',
      icon: <Package className="h-6 w-6" />,
      href: '/reports/inventory/stock-levels',
      color: 'text-blue-600',
    },
    {
      key: 'agingAnalysis',
      icon: <Clock className="h-6 w-6" />,
      href: '/reports/inventory/aging-analysis',
      color: 'text-amber-600',
    },
    {
      key: 'expiryAlerts',
      icon: <AlertTriangle className="h-6 w-6" />,
      href: '/reports/inventory/expiry-alerts',
      color: 'text-red-600',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <Breadcrumb items={breadcrumb.list()} />
        <p className="text-muted-foreground mt-1">{t('inventory.description')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.key} href={report.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className={report.color}>{report.icon}</div>
                <CardTitle className="mt-2 text-lg">
                  {t(`inventory.${report.key}.title`)}
                </CardTitle>
                <CardDescription>
                  {t(`inventory.${report.key}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
