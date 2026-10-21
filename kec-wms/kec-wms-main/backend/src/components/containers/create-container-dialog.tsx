'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'

const containerTypes = ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'] as const
const usages = ['INBOUND', 'RETURN_INBOUND', 'OUTBOUND'] as const

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface CreateContainerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  warehouses: Warehouse[]
}

export function CreateContainerDialog({
  open,
  onOpenChange,
  onSuccess,
  warehouses,
}: CreateContainerDialogProps) {
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const currentWarehouseId = warehouseContext?.currentWarehouse?.warehouseId

  const [loading, setLoading] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [formData, setFormData] = useState({
    containerCode: '',
    containerType: '',
    usage: '',
    warehouseId: currentWarehouseId || '',
    weightCapacityKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    remarks: '',
  })

  const resetForm = () => {
    setFormData({
      containerCode: '',
      containerType: '',
      usage: '',
      warehouseId: currentWarehouseId || '',
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

  const generateCode = async () => {
    if (!formData.containerType) {
      toast.error(t('containerTypePlaceholder'))
      return
    }
    if (!formData.usage) {
      toast.error(t('usagePlaceholder'))
      return
    }
    setGeneratingCode(true)
    try {
      const response = await fetch('/api/v1/containers/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerType: formData.containerType, usage: formData.usage }),
      })
      const result = await response.json()
      if (result.success) {
        setFormData((prev) => ({ ...prev, containerCode: result.data.containerCode }))
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const body = {
        containerCode: formData.containerCode || undefined,
        containerType: formData.containerType,
        usage: formData.usage,
        warehouseId: formData.warehouseId,
        weightCapacityKg: formData.weightCapacityKg ? parseFloat(formData.weightCapacityKg) : null,
        lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
        widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        remarks: formData.remarks || null,
      }

      const response = await fetch('/api/v1/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('createSuccess'))
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

  const isValid = formData.warehouseId && formData.containerType && formData.usage

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('create')}</DialogTitle>
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
            <Label>{t('containerCode')}</Label>
            <div className="flex gap-2">
              <Input
                value={formData.containerCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, containerCode: e.target.value }))}
                placeholder={t('containerCodePlaceholder')}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
                disabled={generatingCode || !formData.containerType || !formData.usage}
              >
                {generatingCode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('autoGenerateCode')}
              </Button>
            </div>
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
