'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface BatchCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouses: Warehouse[]
  onSuccess: () => void
}

const containerTypes = ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'] as const
const usages = ['INBOUND', 'RETURN_INBOUND', 'OUTBOUND'] as const

export function BatchCreateDialog({ open, onOpenChange, warehouses, onSuccess }: BatchCreateDialogProps) {
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const currentWarehouseId = warehouseContext?.currentWarehouse?.warehouseId

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    warehouseId: currentWarehouseId || '',
    containerType: '',
    usage: '',
    quantity: '10',
    weightCapacityKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    remarks: '',
  })

  const resetForm = () => {
    setFormData({
      warehouseId: currentWarehouseId || '',
      containerType: '',
      usage: '',
      quantity: '10',
      weightCapacityKg: '',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      remarks: '',
    })
  }

  useEffect(() => {
    if (!currentWarehouseId) return
    setFormData((prev) => (
      prev.warehouseId === currentWarehouseId
        ? prev
        : { ...prev, warehouseId: currentWarehouseId }
    ))
  }, [currentWarehouseId])

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!formData.warehouseId || !formData.containerType || !formData.usage) {
      toast.error(tCommon('fillRequired'))
      return
    }

    const quantity = parseInt(formData.quantity, 10)
    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
      toast.error(t('batchQuantityError'))
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/containers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: formData.warehouseId,
          containerType: formData.containerType,
          usage: formData.usage,
          quantity,
          weightCapacityKg: formData.weightCapacityKg ? parseFloat(formData.weightCapacityKg) : null,
          lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
          widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
          remarks: formData.remarks || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('batchCreateSuccess', { count: result.data.successCount }))
        handleClose()
        onSuccess()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const isValid = formData.warehouseId && formData.containerType && formData.usage && formData.quantity

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('batchCreate')}</DialogTitle>
          <DialogDescription>{t('batchCreateDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>{t('warehouse')} *</Label>
            <Select
              value={formData.warehouseId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, warehouseId: value }))}
              disabled={!!currentWarehouseId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('warehousePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouseName} ({warehouse.warehouseCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('containerType')} *</Label>
            <Select
              value={formData.containerType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, containerType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('containerTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {containerTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`containerTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('usage')} *</Label>
            <Select
              value={formData.usage}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, usage: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('usagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {usages.map((usage) => (
                  <SelectItem key={usage} value={usage}>
                    {t(`usages.${usage}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('batchQuantity')} *</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="1-100"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('weightCapacityKg')}</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.weightCapacityKg}
              onChange={(e) => setFormData((prev) => ({ ...prev, weightCapacityKg: e.target.value }))}
              placeholder={t('weightCapacityKgPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('physicalAttributes')}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={formData.lengthCm}
                onChange={(e) => setFormData((prev) => ({ ...prev, lengthCm: e.target.value }))}
                placeholder={t('lengthCmPlaceholder')}
              />
              <Input
                type="number"
                step="0.01"
                value={formData.widthCm}
                onChange={(e) => setFormData((prev) => ({ ...prev, widthCm: e.target.value }))}
                placeholder={t('widthCmPlaceholder')}
              />
              <Input
                type="number"
                step="0.01"
                value={formData.heightCm}
                onChange={(e) => setFormData((prev) => ({ ...prev, heightCm: e.target.value }))}
                placeholder={t('heightCmPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <Label>{t('remarks')}</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder={t('remarksPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
