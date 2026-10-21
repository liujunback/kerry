'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from '@/lib/utils/date-formatter'
import { zhCN } from 'date-fns/locale'
import { useTranslations } from 'next-intl'

interface TrendData {
  date: string
  inbound: number
  outbound: number
}

export function DashboardTrends() {
  const t = useTranslations('dashboard')
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch('/api/v1/dashboard/stats')
        if (!response.ok) {
          throw new Error(`API返回错误: ${response.status}`)
        }
        const data = await response.json()
        console.log('Dashboard trends data:', data)
        if (data.trends) {
          setTrends(data.trends)
        } else {
          console.warn('API响应中缺少trends字段:', data)
        }
      } catch (error) {
        console.error('获取趋势数据失败:', error)
        setError(error instanceof Error ? error.message : '未知错误')
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-base font-semibold mb-3">{t('businessTrends')}</h3>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-base font-semibold mb-3 text-card-foreground">{t('last7DaysTrends')}</h3>
        <div className="h-64 flex items-center justify-center bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-destructive text-sm">{t('loadTrendsError')}: {error}</p>
        </div>
      </div>
    )
  }

  // 检查是否有数据
  const hasData = trends.length > 0 && trends.some(t => t.inbound > 0 || t.outbound > 0)

  // 格式化日期显示
  const formattedData = trends.map((item) => ({
    ...item,
    dateLabel: format(new Date(item.date), 'MM-dd', { locale: zhCN }),
  }))

  return (
    <div className="bg-card rounded-lg shadow p-4">
      <h3 className="text-base font-semibold mb-3 text-card-foreground">{t('last7DaysTrends')}</h3>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{t('noBusinessData')}</p>
            <p className="text-muted-foreground text-xs mt-1">{t('noBusinessDataHint')}</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateLabel"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--card-foreground))' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="inbound"
              stroke="#3b82f6"
              strokeWidth={2}
              name={t('inbound')}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="outbound"
              stroke="#10b981"
              strokeWidth={2}
              name={t('outbound')}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
