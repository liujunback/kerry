'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from '@/lib/utils/date-formatter'
import { zhCN } from 'date-fns/locale'
import Link from 'next/link'
import { Package, Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RecentAsn {
  id: string
  asnNumber: string
  status: string
  createdAt: string
  client: { clientName: string }
}

interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  client: { clientName: string }
}

interface RecentActivitiesData {
  asns: RecentAsn[]
  orders: RecentOrder[]
}

// 安全地格式化相对时间
function safeFormatDistanceToNow(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    if (isNaN(date.getTime())) {
      return '-'
    }
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: zhCN
    })
  } catch {
    return '-'
  }
}

export function RecentActivities() {
  const t = useTranslations('dashboard')
  const tAsn = useTranslations('asn')
  const tOrder = useTranslations('outbound.order')
  const [activities, setActivities] = useState<RecentActivitiesData>({
    asns: [],
    orders: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch('/api/v1/dashboard/stats')
        if (!response.ok) {
          throw new Error(`API返回错误: ${response.status}`)
        }
        const data = await response.json()
        console.log('Dashboard activities data:', data)
        if (data.recentActivities) {
          setActivities(data.recentActivities)
        } else {
          console.warn('API响应中缺少recentActivities字段:', data)
        }
      } catch (error) {
        console.error('获取最近活动失败:', error)
        setError(error instanceof Error ? error.message : '未知错误')
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-base font-semibold mb-3">{t('recentActivities')}</h3>
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-base font-semibold mb-3 text-card-foreground">{t('recentActivities')}</h3>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-destructive text-sm">{t('loadActivitiesError')}: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow p-4">
      <h3 className="text-base font-semibold mb-3 text-card-foreground">{t('recentActivities')}</h3>

      <div className="space-y-3">
        {/* 最近入库 */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {t('recentInbound')}
          </h4>
          <div className="space-y-1.5">
            {activities.asns.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noData')}</p>
            ) : (
              activities.asns.map((asn) => (
                <Link
                  key={asn.id}
                  href={`/asn/${asn.id}`}
                  className="block p-2.5 bg-muted/50 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-xs">{asn.asnNumber}</p>
                      <p className="text-xs text-muted-foreground">{asn.client.clientName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                        {tAsn(`statuses.${asn.status}`, { defaultValue: asn.status })}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {safeFormatDistanceToNow(asn.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* 最近出库 */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            {t('recentOutbound')}
          </h4>
          <div className="space-y-1.5">
            {activities.orders.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noData')}</p>
            ) : (
              activities.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-2.5 bg-muted/50 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-xs">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.client.clientName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                        {tOrder(`statuses.${order.status}`, { defaultValue: order.status })}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {safeFormatDistanceToNow(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
