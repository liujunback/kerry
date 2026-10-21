'use client'

import { useState, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Package,
  PackageCheck,
  Truck,
  Activity,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ReportCard } from '@/components/reports'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface OverviewStats {
  inventory: {
    totalSku: number
    totalQuantity: number
    available: number
    trend: number
  }
  inbound: {
    todayAsn: number
    weekAsn: number
    monthAsn: number
    trend: number
  }
  outbound: {
    todayOrders: number
    weekOrders: number
    monthOrders: number
    trend: number
  }
}

export default function ReportsPage() {
  const t = useTranslations('reports')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    module: { label: tMenuGroup('reports'), href: '/reports' },
  })
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/reports/overview')
      const result = await res.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch overview stats:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    startTransition(() => {
      fetchStats()
    })
     
  }, [])

  const reportCategories = [
    {
      key: 'inventory',
      icon: <Package className="h-8 w-8" />,
      href: '/reports/inventory',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'inbound',
      icon: <PackageCheck className="h-8 w-8" />,
      href: '/reports/inbound',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      key: 'outbound',
      icon: <Truck className="h-8 w-8" />,
      href: '/reports/outbound',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={breadcrumb.list()} />
        <p className="text-muted-foreground mt-1">{t('overview')}</p>
      </div>

      {/* 统计卡片 */}
      {!loading && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ReportCard
            title={t('inventory.stockLevels.totalSku')}
            value={stats.inventory.totalSku}
            icon={<Package className="h-4 w-4" />}
            trend={{
              value: stats.inventory.trend,
              isPositive: stats.inventory.trend >= 0,
            }}
            description={t('vsLastMonth')}
          />
          <ReportCard
            title={t('inventory.stockLevels.available')}
            value={stats.inventory.available}
            icon={<Activity className="h-4 w-4" />}
            trend={{
              value: stats.inventory.trend,
              isPositive: stats.inventory.trend >= 0,
            }}
            description={t('vsLastMonth')}
          />
          <ReportCard
            title={t('inbound.todayAsn')}
            value={stats.inbound.todayAsn}
            icon={<PackageCheck className="h-4 w-4" />}
            trend={{
              value: stats.inbound.trend,
              isPositive: stats.inbound.trend >= 0,
            }}
            description={t('vsYesterday')}
          />
          <ReportCard
            title={t('outbound.todayOrders')}
            value={stats.outbound.todayOrders}
            icon={<Truck className="h-4 w-4" />}
            trend={{
              value: stats.outbound.trend,
              isPositive: stats.outbound.trend >= 0,
            }}
            description={t('vsYesterday')}
          />
        </div>
      )}

      {/* 报表分类 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('categories')}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reportCategories.map((category) => (
            <Link key={category.key} href={category.href}>
              <Card className="hover:shadow-md transition-all cursor-pointer h-full hover:border-primary">
                <CardHeader>
                  <div className={`${category.bgColor} ${category.color} p-3 rounded-lg w-fit`}>
                    {category.icon}
                  </div>
                  <CardTitle className="mt-4">
                    {t(`${category.key}.title`)}
                  </CardTitle>
                  <CardDescription>
                    {t(`${category.key}.description`)}
                  </CardDescription>
                </CardHeader>
                {!loading && stats && (
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>
                        {category.key === 'inventory' && `${stats.inventory.totalQuantity} ${t('inventory.stockLevels.totalQuantity')}`}
                        {category.key === 'inbound' && `${stats.inbound.monthAsn} ${t('inbound.monthAsn')}`}
                        {category.key === 'outbound' && `${stats.outbound.monthOrders} ${t('outbound.monthOrders')}`}
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
