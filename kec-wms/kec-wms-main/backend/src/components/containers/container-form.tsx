'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
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
import { Loader2 } from 'lucide-react'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface ContainerFormProps {
  container?: {
    id: string
    containerCode: string
    containerType: string
    usage: string
    warehouseId: string
    weightCapacityKg?: number | null
    lengthCm?: number | null
    widthCm?: number | null
    heightCm?: number | null
    remarks?: string | null
  }
  warehouses: Warehouse[]
  mode: 'create' | 'edit'
}

const containerTypes = ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'] as const
const usages = ['INBOUND', 'RETURN_INBOUND', 'OUTBOUND'] as const

export function ContainerForm({ container, warehouses, mode }: ContainerFormProps) {
  const router = useRouter()
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const currentWarehouseId = warehouseContext?.currentWarehouse?.warehouseId

  const [loading, setLoading] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [formData, setFormData] = useState({
    containerCode: container?.containerCode || '',
    containerType: container?.containerType || '',
    usage: container?.usage || '',
    warehouseId: container?.warehouseId || (mode === 'create' ? currentWarehouseId || '' : ''),
    weightCapacityKg: container?.weightCapacityKg?.toString() || '',
    lengthCm: container?.lengthCm?.toString() || '',
    widthCm: container?.widthCm?.toString() || '',
    heightCm: container?.heightCm?.toString() || '',
    remarks: container?.remarks || '',
  })

  useEffect(() => {
    if (mode !== 'create' || !currentWarehouseId) return
    setFormData((prev) => (
      prev.warehouseId === currentWarehouseId
        ? prev
        : { ...prev, warehouseId: currentWarehouseId }
    ))
  }, [mode, currentWarehouseId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
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
        body: JSON.stringify({
          containerType: formData.containerType,
          usage: formData.usage,
        }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/v1/containers' : `/api/v1/containers/${container?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push('/containers')
        router.refresh()
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="warehouseId">{t('warehouse')} *</Label>
          <Select
            value={formData.warehouseId}
            onValueChange={(value) => handleSelectChange('warehouseId', value)}
            disabled={mode === 'create' && !!currentWarehouseId}
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
          <Label htmlFor="containerType">{t('containerType')} *</Label>
          <Select
            value={formData.containerType}
            onValueChange={(value) => handleSelectChange('containerType', value)}
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
          <Label htmlFor="usage">{t('usage')} *</Label>
          <Select
            value={formData.usage}
            onValueChange={(value) => handleSelectChange('usage', value)}
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
          <Label htmlFor="containerCode">{t('containerCode')}</Label>
          <div className="flex gap-2">
            <Input
              id="containerCode"
              name="containerCode"
              value={formData.containerCode}
              onChange={handleInputChange}
              placeholder={t('containerCodePlaceholder')}
              disabled={mode === 'edit'}
            />
            {mode === 'create' && (
              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
                disabled={generatingCode || !formData.containerType || !formData.usage}
              >
                {generatingCode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('autoGenerateCode')}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weightCapacityKg">{t('weightCapacityKg')}</Label>
          <Input
            id="weightCapacityKg"
            name="weightCapacityKg"
            type="number"
            step="0.01"
            value={formData.weightCapacityKg}
            onChange={handleInputChange}
            placeholder={t('weightCapacityKgPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('physicalAttributes')}</Label>
          <div className="flex gap-2">
            <Input
              name="lengthCm"
              type="number"
              step="0.01"
              value={formData.lengthCm}
              onChange={handleInputChange}
              placeholder={t('lengthCmPlaceholder')}
            />
            <Input
              name="widthCm"
              type="number"
              step="0.01"
              value={formData.widthCm}
              onChange={handleInputChange}
              placeholder={t('widthCmPlaceholder')}
            />
            <Input
              name="heightCm"
              type="number"
              step="0.01"
              value={formData.heightCm}
              onChange={handleInputChange}
              placeholder={t('heightCmPlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="remarks">{t('remarks')}</Label>
          <Textarea
            id="remarks"
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            placeholder={t('remarksPlaceholder')}
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? tCommon('loading') : tCommon('save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  )
}
