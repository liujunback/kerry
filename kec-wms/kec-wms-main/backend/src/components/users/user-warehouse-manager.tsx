'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface WarehouseOption {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface UserWarehouseBinding {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  isDefault: boolean
  isActive: boolean
}

interface UserWarehouseManagerProps {
  userId: string
  bindings: UserWarehouseBinding[]
}

export function UserWarehouseManager({ userId, bindings }: UserWarehouseManagerProps) {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')
  const [currentBindings, setCurrentBindings] = useState<UserWarehouseBinding[]>(bindings)
  const [allWarehouses, setAllWarehouses] = useState<WarehouseOption[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [markAsDefault, setMarkAsDefault] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchBindings = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/warehouses`)
      const result = await response.json()
      if (result.success) {
        setCurrentBindings(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch user warehouse bindings:', error)
    }
  }, [userId])

  const fetchAllWarehouses = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE')
      const result = await response.json()
      if (result.success) {
        setAllWarehouses(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }, [])

  useEffect(() => {
    void fetchBindings()
    void fetchAllWarehouses()
  }, [fetchAllWarehouses, fetchBindings])

  const availableWarehouses = useMemo(
    () => allWarehouses.filter((warehouse) => !currentBindings.some((binding) => binding.warehouseId === warehouse.id)),
    [allWarehouses, currentBindings]
  )

  const handleBindWarehouse = async () => {
    if (!selectedWarehouseId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/users/${userId}/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          isDefault: markAsDefault,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(t('warehouseBindSuccess'))
        setDialogOpen(false)
        setSelectedWarehouseId('')
        setMarkAsDefault(false)
        await fetchBindings()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveWarehouse = async (warehouseId: string) => {
    if (!confirm(t('confirmRemoveWarehouse'))) return

    try {
      const response = await fetch(`/api/v1/users/${userId}/warehouses/${warehouseId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('warehouseUnbindSuccess'))
        await fetchBindings()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    }
  }

  const handleSetDefault = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/warehouses/default`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('defaultWarehouseSetSuccess'))
        await fetchBindings()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('warehouseManagement')}</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              {t('bindWarehouse')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('bindWarehouse')}</DialogTitle>
              <DialogDescription>{t('bindWarehouseDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{tCommon('warehouse')}</label>
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWarehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouseCode} ({warehouse.warehouseName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t('defaultWarehouse')}</p>
                  <p className="text-xs text-muted-foreground">{t('defaultWarehouseHint')}</p>
                </div>
                <Switch checked={markAsDefault} onCheckedChange={setMarkAsDefault} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleBindWarehouse} disabled={loading || !selectedWarehouseId}>
                {loading ? tCommon('loading') : tCommon('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {currentBindings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noWarehouseBindings')}</p>
      ) : (
        <div className="space-y-2">
          {currentBindings.map((binding) => (
            <div
              key={binding.warehouseId}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">
                    {binding.warehouseCode} ({binding.warehouseName})
                  </p>
                  <p className="text-sm text-muted-foreground">{binding.warehouseId}</p>
                </div>
                {binding.isDefault ? (
                  <Badge variant="default">{t('defaultWarehouse')}</Badge>
                ) : (
                  <Badge variant="outline">{tCommon('warehouse')}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!binding.isDefault ? (
                  <Button variant="ghost" size="sm" onClick={() => handleSetDefault(binding.warehouseId)}>
                    <Star className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveWarehouse(binding.warehouseId)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
