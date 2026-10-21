'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PackagingMaterialFormData {
  materialCode: string
  materialName: string
  materialType: string
  specification: string
  lengthCm: string
  widthCm: string
  heightCm: string
  weightKg: string
  maxLoadWeightKg: string
  unit: string
  unitPrice: string
  currency: string
  supplierName: string
  barcode: string
  source: string
  isReusable: boolean
  notes: string
}

interface PackagingMaterialFormProps {
  initialData?: Partial<PackagingMaterialFormData> & { id?: string }
  mode: 'create' | 'edit'
}

export function PackagingMaterialForm({ initialData, mode }: PackagingMaterialFormProps) {
  const router = useRouter()
  const t = useTranslations('packagingMaterial')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PackagingMaterialFormData>({
    materialCode: initialData?.materialCode || '',
    materialName: initialData?.materialName || '',
    materialType: initialData?.materialType || 'BOX',
    specification: initialData?.specification || '',
    lengthCm: initialData?.lengthCm?.toString() || '',
    widthCm: initialData?.widthCm?.toString() || '',
    heightCm: initialData?.heightCm?.toString() || '',
    weightKg: initialData?.weightKg?.toString() || '',
    maxLoadWeightKg: initialData?.maxLoadWeightKg?.toString() || '',
    unit: initialData?.unit || 'PCS',
    unitPrice: initialData?.unitPrice?.toString() || '',
    currency: initialData?.currency || 'CNY',
    supplierName: initialData?.supplierName || '',
    barcode: initialData?.barcode || '',
    source: initialData?.source || 'PURCHASE',
    isReusable: initialData?.isReusable || false,
    notes: initialData?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create'
        ? '/api/v1/packaging-materials'
        : `/api/v1/packaging-materials/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
          widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          maxLoadWeightKg: formData.maxLoadWeightKg ? parseFloat(formData.maxLoadWeightKg) : null,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push('/packaging-materials')
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
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materialCode">{t('code')} *</Label>
              <Input
                id="materialCode"
                value={formData.materialCode}
                onChange={(e) => setFormData({ ...formData, materialCode: e.target.value.toUpperCase() })}
                placeholder={t('codePlaceholder')}
                required
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialName">{t('name')} *</Label>
              <Input
                id="materialName"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materialType">{t('type')} *</Label>
              <Select
                value={formData.materialType}
                onValueChange={(value) => setFormData({ ...formData, materialType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOX">{t('types.BOX')}</SelectItem>
                  <SelectItem value="BAG">{t('types.BAG')}</SelectItem>
                  <SelectItem value="ENVELOPE">{t('types.ENVELOPE')}</SelectItem>
                  <SelectItem value="BUBBLE_WRAP">{t('types.BUBBLE_WRAP')}</SelectItem>
                  <SelectItem value="FOAM">{t('types.FOAM')}</SelectItem>
                  <SelectItem value="TAPE">{t('types.TAPE')}</SelectItem>
                  <SelectItem value="LABEL">{t('types.LABEL')}</SelectItem>
                  <SelectItem value="FILLER">{t('types.FILLER')}</SelectItem>
                  <SelectItem value="OTHER">{t('types.OTHER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">{t('source')} *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">{t('sources.PURCHASE')}</SelectItem>
                  <SelectItem value="CUSTOMER_PROVIDED">{t('sources.CUSTOMER_PROVIDED')}</SelectItem>
                  <SelectItem value="RECYCLED">{t('sources.RECYCLED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">{t('barcode')}</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder={t('barcodePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specification">{t('specification')}</Label>
            <Input
              id="specification"
              value={formData.specification}
              onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              placeholder={t('specificationPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('physicalAttributes')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lengthCm">{t('lengthCm')}</Label>
              <Input
                id="lengthCm"
                type="number"
                step="0.01"
                value={formData.lengthCm}
                onChange={(e) => setFormData({ ...formData, lengthCm: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="widthCm">{t('widthCm')}</Label>
              <Input
                id="widthCm"
                type="number"
                step="0.01"
                value={formData.widthCm}
                onChange={(e) => setFormData({ ...formData, widthCm: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightCm">{t('heightCm')}</Label>
              <Input
                id="heightCm"
                type="number"
                step="0.01"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">{t('weightKg')}</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.001"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                placeholder="0.000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxLoadWeightKg">{t('maxLoadWeightKg')}</Label>
              <Input
                id="maxLoadWeightKg"
                type="number"
                step="0.01"
                value={formData.maxLoadWeightKg}
                onChange={(e) => setFormData({ ...formData, maxLoadWeightKg: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t('unit')}</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="PCS"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('priceInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{t('unitPrice')}</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t('currency')}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierName">{t('supplierName')}</Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder={t('supplierNamePlaceholder')}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isReusable"
              checked={formData.isReusable}
              onCheckedChange={(checked) => setFormData({ ...formData, isReusable: checked === true })}
            />
            <Label htmlFor="isReusable">{t('isReusable')}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? tCommon('loading') : tCommon('save')}
        </Button>
      </div>
    </form>
  )
}
