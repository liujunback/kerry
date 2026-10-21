'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface AlertsData {
  inventoryAlerts: number
  lowStockCount: number
}

export function InventoryAlerts() {
  const t = useTranslations('dashboard')
  const [alerts, setAlerts] = useState<AlertsData>({
    inventoryAlerts: 0,
    lowStockCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch('/api/v1/dashboard/stats')
        if (!response.ok) {
          throw new Error(`API返回错误: ${response.status}`)
        }
        const data = await response.json()
        console.log('Dashboard alerts data:', data)
        if (data.alerts) {
          setAlerts(data.alerts)
        } else {
          console.warn('API响应中缺少alerts字段:', data)
        }
      } catch (error) {
        console.error('获取预警数据失败:', error)
        setError(error instanceof Error ? error.message : '未知错误')
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-base font-semibold mb-3">{t('inventoryAlerts')}</h3>
        <div className="space-y-2 animate-pulse">
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-base font-semibold mb-3 text-card-foreground">{t('inventoryAlerts')}</h3>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-destructive text-sm">{t('loadAlertsError')}: {error}</p>
        </div>
      </div>
    )
  }

  const hasAlerts = alerts.inventoryAlerts > 0 || alerts.lowStockCount > 0

  return (
    <div className="bg-card rounded-lg shadow p-4">
      <h3 className="text-base font-semibold mb-3 text-card-foreground">{t('inventoryAlerts')}</h3>

      {!hasAlerts ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">{t('noAlerts')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.inventoryAlerts > 0 && (
            <Link
              href="/inventory/alerts"
              className="block p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-1.5 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">{t('inventoryAnomalyAlert')}</p>
                  <p className="text-xs text-red-700">
                    {t('inventoryAnomalyCount', { count: alerts.inventoryAlerts })}
                  </p>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {alerts.inventoryAlerts}
                </div>
              </div>
            </Link>
          )}

          {alerts.lowStockCount > 0 && (
            <Link
              href="/inventory?filter=low_stock"
              className="block p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="bg-yellow-100 p-1.5 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">{t('lowStockAlert')}</p>
                  <p className="text-xs text-yellow-700">
                    {t('lowStockCount', { count: alerts.lowStockCount })}
                  </p>
                </div>
                <div className="text-xl font-bold text-yellow-600">
                  {alerts.lowStockCount}
                </div>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
