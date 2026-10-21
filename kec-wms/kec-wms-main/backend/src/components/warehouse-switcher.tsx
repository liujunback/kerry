'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'
import { useWarehouseContext } from '@/contexts/warehouse-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const REFRESHABLE_PATHS = new Set([
  '/dashboard',
  '/api-keys',
  '/asn',
  '/returns',
  '/audits',
  '/bin-locations',
  '/checkout-orders',
  '/clients',
  '/containers',
  '/inventory',
  '/inventory/counts',
  '/inventory/adjustments',
  '/inventory/alerts',
  '/inventory/freezes',
  '/inventory/transactions',
  '/inventory/transfers',
  '/inventory/wm',
  '/manifest-orders',
  '/orders',
  '/pick-orders',
  '/roles',
  '/settings/print',
  '/sku',
  '/waves',
])

function isRefreshableWarehousePath(pathname: string): boolean {
  return pathname.startsWith('/reports') || pathname.startsWith('/returns') || REFRESHABLE_PATHS.has(pathname)
}

export function WarehouseSwitcher() {
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const router = useRouter()
  const { bindings, selectedWarehouseId, setSelectedWarehouseId } = useWarehouseContext()

  const handleWarehouseChange = (warehouseId: string) => {
    if (warehouseId === selectedWarehouseId) {
      return
    }

    const canRefreshInPlace = isRefreshableWarehousePath(pathname)

    if (!canRefreshInPlace) {
      const confirmed = window.confirm(tCommon('warehouseSwitchLeaveConfirm'))
      if (!confirmed) {
        return
      }
    }

    setSelectedWarehouseId(warehouseId)

    if (canRefreshInPlace) {
      router.refresh()
      return
    }

    router.replace('/dashboard')
  }

  if (bindings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
        <Building2 className="h-3.5 w-3.5" />
        <span>{tCommon('warehouseUnconfigured')}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedWarehouseId} onValueChange={handleWarehouseChange}>
        <SelectTrigger className="h-9 min-w-[220px] rounded-full bg-background/85 text-sm">
          <SelectValue placeholder={tCommon('warehouse')} />
        </SelectTrigger>
        <SelectContent>
          {bindings.map((binding) => (
            <SelectItem key={binding.warehouseId} value={binding.warehouseId}>
              {binding.warehouseCode} · {binding.warehouseName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
