'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { EntitySelect, ListFilterCard } from '@/components/list-filters'
import { formatCodeNameLabel } from '@/lib/filters/readable-filter-value'

interface DimensionOption {
  id: string
  name: string
  code?: string
}

interface ClientApiItem {
  id: string
  clientName: string
  clientCode?: string
}

interface ZoneApiItem {
  id: string
  zoneName: string
  zoneCode?: string
}

interface MultiDimensionFilterProps {
  clientId?: string
  zoneId?: string
  onClientChange?: (value: string) => void
  onZoneChange?: (value: string) => void
  showClient?: boolean
  showZone?: boolean
}

export function MultiDimensionFilter({
  clientId = '',
  zoneId = '',
  onClientChange,
  onZoneChange,
  showClient = false,
  showZone = false,
}: MultiDimensionFilterProps) {
  const tCommon = useTranslations('common')
  const [clients, setClients] = useState<DimensionOption[]>([])
  const [zones, setZones] = useState<DimensionOption[]>([])
  const zoneOptions = zones

  useEffect(() => {
    if (!showClient) return

    fetch('/api/v1/clients?pageSize=100')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setClients(result.data.map((client: ClientApiItem) => ({
            id: client.id,
            name: client.clientName,
            code: client.clientCode,
          })))
        }
      })
  }, [showClient])

  useEffect(() => {
    if (!showZone) return

    fetch('/api/v1/zones?pageSize=100&status=ACTIVE')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setZones(result.data.map((zone: ZoneApiItem) => ({
            id: zone.id,
            name: zone.zoneName,
            code: zone.zoneCode,
          })))
        } else {
          setZones([])
        }
      })
      .catch(() => setZones([]))
  }, [showZone])

  return (
    <ListFilterCard mode="compact" className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        {showClient && onClientChange && (
          <EntitySelect
            value={clientId}
            onValueChange={onClientChange}
            showAll
            placeholder={tCommon('allClients')}
            allLabel={tCommon('allClients')}
            searchPlaceholder={tCommon('search')}
            emptyText={tCommon('noResults')}
            className="w-[180px]"
            options={clients.map((client) => ({
              value: client.id,
              label: formatCodeNameLabel(client.code, client.name),
              keywords: [client.code || '', client.name],
            }))}
          />
        )}

        {showZone && onZoneChange && (
          <EntitySelect
            value={zoneId}
            onValueChange={onZoneChange}
            showAll
            placeholder={tCommon('allZones')}
            allLabel={tCommon('allZones')}
            searchPlaceholder={tCommon('search')}
            emptyText={tCommon('noResults')}
            className="w-[180px]"
            options={zoneOptions.map((zone) => ({
              value: zone.id,
              label: formatCodeNameLabel(zone.code, zone.name),
              keywords: [zone.code || '', zone.name],
            }))}
          />
        )}
      </div>
    </ListFilterCard>
  )
}
