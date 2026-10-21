'use client'

import { useEffect, useState } from 'react'
import { Package, PackageCheck, Warehouse, ClipboardList } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DashboardMetrics {
  todayInbound: number
  todayOutbound: number
  totalInventory: number
  pendingOrders: number
}

export function DashboardStats() {
  const t = useTranslations('dashboard')
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayInbound: 0,
    todayOutbound: 0,
    totalInventory: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/v1/dashboard/stats')
        if (!response.ok) {
          throw new Error(`API返回错误: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        console.log('Dashboard stats data:', data)
        if (data.metrics) {
          setMetrics(data.metrics)
        } else {
          console.warn('API响应中缺少metrics字段:', data)
        }
      } catch (error) {
        console.error('获取仪表板统计数据失败:', error)
        setError(error instanceof Error ? error.message : '未知错误')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const stats = [
    {
      title: t('todayInbound'),
      value: metrics.todayInbound,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('todayOutbound'),
      value: metrics.todayOutbound,
      icon: PackageCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('totalInventory'),
      value: metrics.totalInventory,
      icon: Warehouse,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('pendingOrders'),
      value: metrics.pendingOrders,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg shadow p-4 animate-pulse">
            <div className="h-3 bg-muted rounded w-16 mb-2"></div>
            <div className="h-6 bg-muted rounded w-12"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive text-sm">{t('loadStatsError')}: {error}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.title} className="bg-card rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
