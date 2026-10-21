'use client'

import { useTranslations } from 'next-intl'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Zone {
  id: string
  zoneCode: string
  zoneName: string | null
}

interface ZoneSelectProps {
  warehouseId?: string
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ZoneSelect({
  warehouseId,
  value,
  onValueChange,
  disabled,
  placeholder,
}: ZoneSelectProps) {
  const t = useTranslations('zone')
  const { options: zones, loading } = useCachedOptions<Zone>({
    cacheKey: warehouseId ? `zones:active:list:${warehouseId}` : 'zones:active:list:empty',
    fetcher: async () => {
      if (!warehouseId) {
        return []
      }

      const params = new URLSearchParams({
        page: '1',
        warehouseId,
        pageSize: '100',
        status: 'ACTIVE',
      })

      const response = await fetch(`/api/v1/zones?${params.toString()}`, {
        headers: {
          'X-WMS-Warehouse-Id': warehouseId,
        },
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || '加载库区失败')
      }
      return result.data || []
    },
  })

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading || !warehouseId}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || t('selectZone')} />
      </SelectTrigger>
      <SelectContent>
        {zones.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            {zone.zoneCode} {zone.zoneName ? `- ${zone.zoneName}` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
