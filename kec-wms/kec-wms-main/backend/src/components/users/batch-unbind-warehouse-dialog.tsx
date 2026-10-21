'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

interface BatchUnbindWarehouseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUserIds: string[]
  onSuccess?: () => void
}

export function BatchUnbindWarehouseDialog({
  open,
  onOpenChange,
  selectedUserIds,
  onSuccess,
}: BatchUnbindWarehouseDialogProps) {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedWarehouseId('')
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

  const handleBatchUnbind = async () => {
    if (!selectedWarehouseId || selectedUserIds.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/v1/users/batch/warehouses/unbind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          warehouseId: selectedWarehouseId,
          skipMissing: true,
          continueOnError: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const { summary } = result.data
        toast.success(
          t('batchUnbindWarehouseSuccess', {
            successful: summary.successful,
            skipped: summary.skipped,
            failed: summary.failed,
          })
        )
        onOpenChange(false)
        setSelectedWarehouseId('')
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('batchUnbindWarehouse')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('batchUnbindWarehouseDesc', { count: selectedUserIds.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{tCommon('warehouse')}</label>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectWarehouse')} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouseCode} ({warehouse.warehouseName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('batchUnbindWarehouseHint')}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleBatchUnbind}
              disabled={loading || !selectedWarehouseId || selectedUserIds.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('confirm')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
