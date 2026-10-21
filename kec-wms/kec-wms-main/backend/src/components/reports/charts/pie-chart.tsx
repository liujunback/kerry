'use client'

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
interface PieChartProps {
  data: {
    name: string
    value: number
    color: string
  }[]
  title?: string
  height?: number
  showLabel?: boolean
}

export function PieChart({ data, title, height = 300, showLabel = true }: PieChartProps) {
  const renderLabel = (props: { name?: string; percent?: number }) => {
    if (!showLabel || !props.name || props.percent === undefined) return null
    return `${props.name}: ${(props.percent * 100).toFixed(0)}%`
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={showLabel}
              label={showLabel ? renderLabel : undefined}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
            />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
