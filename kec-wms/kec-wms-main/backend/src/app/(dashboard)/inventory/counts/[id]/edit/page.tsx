'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { InventoryCountForm, type InventoryCountFormInitialData } from '@/components/inventory/inventory-count-form'

export default function EditInventoryCountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [initialData, setInitialData] = useState<InventoryCountFormInitialData | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/v1/inventory/counts/${id}`)
      const result = await response.json()

      if (!result.success) {
        setInitialData(null)
        return
      }

      const data = result.data
      const scopeConfig = data.scopeConfigJson || {}
      const executionConfig = data.executionConfigJson || {}
      const ownerScopeConfig = data.ownerScopeConfigJson || {}

      setInitialData({
        id: data.id,
        orderType: data.orderType,
        countMode: data.countMode,
        warehouseId: data.warehouseId,
        plannedAt: new Date(data.plannedAt).toISOString().slice(0, 16),
        remark: data.remark || '',
        ownerScopeMode: data.ownerScopeMode,
        clientIds: Array.isArray(ownerScopeConfig.clientIds) ? ownerScopeConfig.clientIds : [],
        inventoryStatuses: Array.isArray(scopeConfig.inventoryStatuses) ? scopeConfig.inventoryStatuses : ['AVAILABLE'],
        startLocationCode: scopeConfig.startLocationCode || '',
        endLocationCode: scopeConfig.endLocationCode || '',
        zoneId: scopeConfig.zoneId || '',
        aisle: scopeConfig.aisle || '',
        rack: scopeConfig.rack || '',
        shelfStart: scopeConfig.shelfStart || '',
        shelfEnd: scopeConfig.shelfEnd || '',
        skuCodesText: Array.isArray(scopeConfig.skuCodes) ? scopeConfig.skuCodes.join('\n') : '',
        cycleDays: scopeConfig.cycleDays ? String(scopeConfig.cycleDays) : '30',
        calendarCode: scopeConfig.calendarCode || '',
        timeWindow: scopeConfig.timeWindow || '',
        excludeRules: scopeConfig.excludeRules || '',
        maxLocationsPerBatch: scopeConfig.maxLocationsPerBatch ? String(scopeConfig.maxLocationsPerBatch) : '50',
        counterUserId: executionConfig.counterUserId || '',
        reviewerUserId: executionConfig.reviewerUserId || '',
        allowPrint: Boolean(executionConfig.allowPrint),
      })
    }

    void load()
  }, [id])

  if (!initialData) {
    return null
  }

  return <InventoryCountForm mode="edit" initialData={initialData} />
}
