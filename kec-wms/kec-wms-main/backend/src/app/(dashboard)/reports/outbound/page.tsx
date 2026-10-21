'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { TrendingUp, Truck } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

export default function OutboundReportsPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('reports') }],
    module: { label: t('outbound.title'), href: '/reports/outbound' },
  })

  const reports = [
    {
      key: 'fulfillmentRate',
      icon: <TrendingUp className="h-6 w-6" />,
      href: '/reports/outbound/fulfillment-rate',
      color: 'text-blue-600',
    },
    {
      key: 'shippingStats',
      icon: <Truck className="h-6 w-6" />,
      href: '/reports/outbound/shipping-stats',
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <Breadcrumb items={breadcrumb.list()} />
        <p className="text-muted-foreground mt-1">{t('outbound.description')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.key} href={report.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className={report.color}>{report.icon}</div>
                <CardTitle className="mt-2 text-lg">
                  {t(`outbound.${report.key}.title`)}
                </CardTitle>
                <CardDescription>
                  {t(`outbound.${report.key}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
