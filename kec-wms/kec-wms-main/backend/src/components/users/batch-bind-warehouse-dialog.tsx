'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
interface WarehouseOption {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface BatchBindWarehouseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUserIds: string[]
  onSuccess?: () => void
}

export function BatchBindWarehouseDialog({
  open,
  onOpenChange,
  selectedUserIds,
  onSuccess,
}: BatchBindWarehouseDialogProps) {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedWarehouseIds([])
      setDefaultWarehouseId('')
      return
    }

    void fetchWarehouses()
  }, [open])

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE')
      const result = await response.json()
      if (result.success) {
        setWarehouses(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }

  const handleBatchBind = async () => {
    if (selectedWarehouseIds.length === 0 || selectedUserIds.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/v1/users/batch/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          warehouseIds: selectedWarehouseIds,
          defaultWarehouseId,
          skipExisting: true,
          continueOnError: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const { summary } = result.data
        toast.success(
          t('batchBindWarehouseSuccess', {
            successful: summary.successful,
            skipped: summary.skipped,
            failed: summary.failed,
          })
        )
        onOpenChange(false)
        setSelectedWarehouseIds([])
        setDefaultWarehouseId('')
        onSuccess?.()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (warehouseId: string, checked: boolean) => {
    if (checked) {
      const nextSelectedWarehouseIds = [...selectedWarehouseIds, warehouseId]
      setSelectedWarehouseIds(nextSelectedWarehouseIds)
      if (!defaultWarehouseId) {
        setDefaultWarehouseId(warehouseId)
      }
      return
    }

    const nextSelectedWarehouseIds = selectedWarehouseIds.filter((id) => id !== warehouseId)
    setSelectedWarehouseIds(nextSelectedWarehouseIds)
    if (defaultWarehouseId === warehouseId) {
      setDefaultWarehouseId(nextSelectedWarehouseIds[0] || '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('batchBindWarehouse')}</DialogTitle>
          <DialogDescription>
            {t('batchBindWarehouseDesc', { count: selectedUserIds.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{tCommon('warehouse')}</label>
            <div className="text-sm text-muted-foreground">
              {t('selectWarehouses')}
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
              {warehouses.map((warehouse) => {
                const isSelected = selectedWarehouseIds.includes(warehouse.id)
                const isDefault = defaultWarehouseId === warehouse.id

                return (
                  <div
                    key={warehouse.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleCheckboxChange(warehouse.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{warehouse.warehouseCode}</span>
                        <span className="text-sm text-muted-foreground">
                          {warehouse.warehouseName}
                        </span>
                        {isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            {t('defaultWarehouse')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setDefaultWarehouseId(warehouse.id)}
                        title={t('setAsDefaultWarehouse')}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                          }`}
                        />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">{t('defaultWarehouse')}</p>
            <p className="text-xs text-muted-foreground">{t('batchBindWarehouseDefaultHint')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleBatchBind}
            disabled={loading || selectedWarehouseIds.length === 0 || selectedUserIds.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
