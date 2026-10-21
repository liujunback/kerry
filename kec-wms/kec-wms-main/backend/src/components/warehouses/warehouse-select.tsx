'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { EntitySelect } from '@/components/list-filters'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'
import { formatCodeNameLabel } from '@/lib/filters/readable-filter-value'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface WarehouseSelectProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  showAll?: boolean
}

export function WarehouseSelect({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  showAll = false,
}: WarehouseSelectProps) {
  const t = useTranslations('warehouse')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const hasWarehouseBindings = !!warehouseContext && warehouseContext.bindings.length > 0
  const boundCacheKey = hasWarehouseBindings
    ? `warehouses:bound:${warehouseContext.bindings.map((binding) => binding.warehouseId).join(',')}`
    : 'warehouses:active:list'
  const { options: warehouses, loading } = useCachedOptions<Warehouse>({
    cacheKey: boundCacheKey,
    fetcher: async () => {
      if (hasWarehouseBindings && warehouseContext) {
        return warehouseContext.bindings.map((binding) => ({
          id: binding.warehouseId,
          warehouseCode: binding.warehouseCode,
          warehouseName: binding.warehouseName,
        }))
      }

      const response = await fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE')
      const result = await response.json()
      return result.success ? (result.data || []) : []
    },
  })
  const currentWarehouseId = warehouseContext?.currentWarehouse?.warehouseId
  const currentWarehouseOption = warehouseContext?.currentWarehouse
    ? {
        value: warehouseContext.currentWarehouse.warehouseId,
        label: formatCodeNameLabel(
          warehouseContext.currentWarehouse.warehouseCode,
          warehouseContext.currentWarehouse.warehouseName
        ),
        keywords: [
          warehouseContext.currentWarehouse.warehouseCode,
          warehouseContext.currentWarehouse.warehouseName,
        ],
      }
    : null
  const options = warehouseContext && !hasWarehouseBindings
    ? []
    : currentWarehouseOption
    ? [currentWarehouseOption]
    : warehouses.map((warehouse) => ({
          value: warehouse.id,
          label: formatCodeNameLabel(warehouse.warehouseCode, warehouse.warehouseName),
          keywords: [warehouse.warehouseCode, warehouse.warehouseName],
        }))
  const effectiveValue = currentWarehouseOption?.value || value

  useEffect(() => {
    if (currentWarehouseId && value !== currentWarehouseId) {
      onValueChange(currentWarehouseId)
    }
  }, [currentWarehouseId, onValueChange, value])

  return (
    <EntitySelect
      value={effectiveValue}
      onValueChange={(nextValue) => {
        if (currentWarehouseOption) {
          onValueChange(currentWarehouseOption.value)
          return
        }
        onValueChange(nextValue)
      }}
      disabled={disabled || !!currentWarehouseOption || (!!warehouseContext && !hasWarehouseBindings)}
      loading={loading}
      showAll={showAll && !warehouseContext}
      className={className}
      placeholder={placeholder || t('selectWarehouse')}
      allLabel={tCommon('allWarehouses')}
      searchPlaceholder={t('searchWarehouse')}
      emptyText={t('noWarehouseFound')}
      options={options}
    />
  )
}
