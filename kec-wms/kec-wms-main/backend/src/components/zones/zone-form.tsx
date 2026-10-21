'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'

interface ZoneFormData {
  warehouseId: string
  zoneCode: string
  zoneName: string
  zoneType: string
  qualityType: string
  capacityUnits: string
}

interface ZoneFormProps {
  initialData?: Partial<ZoneFormData> & { id?: string }
  mode: 'create' | 'edit'
}

export function ZoneForm({ initialData, mode }: ZoneFormProps) {
  const router = useRouter()
  const t = useTranslations('zone')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ZoneFormData>({
    warehouseId: initialData?.warehouseId || '',
    zoneCode: initialData?.zoneCode || '',
    zoneName: initialData?.zoneName || '',
    zoneType: initialData?.zoneType || 'STORAGE',
    qualityType: initialData?.qualityType || 'GOOD',
    capacityUnits: initialData?.capacityUnits?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create'
        ? '/api/v1/zones'
        : `/api/v1/zones/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacityUnits: formData.capacityUnits ? parseInt(formData.capacityUnits) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push('/zones')
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
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{t('warehouse')} *</Label>
              <WarehouseSelect
                value={formData.warehouseId}
                onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneCode">{t('code')} *</Label>
              <Input
                id="zoneCode"
                value={formData.zoneCode}
                onChange={(e) => setFormData({ ...formData, zoneCode: e.target.value.toUpperCase() })}
                placeholder={t('codePlaceholder')}
                required
                disabled={mode === 'edit'}
                className={mode === 'edit' ? 'bg-muted' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zoneName">{t('name')}</Label>
              <Input
                id="zoneName"
                value={formData.zoneName}
                onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneType">{t('type')} *</Label>
              <Select
                value={formData.zoneType}
                onValueChange={(value) => setFormData({ ...formData, zoneType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVING">{t('types.RECEIVING')}</SelectItem>
                  <SelectItem value="STORAGE">{t('types.STORAGE')}</SelectItem>
                  <SelectItem value="PICKING">{t('types.PICKING')}</SelectItem>
                  <SelectItem value="PACKING">{t('types.PACKING')}</SelectItem>
                  <SelectItem value="SHIPPING">{t('types.SHIPPING')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qualityType">{t('qualityType')}</Label>
              <Select
                value={formData.qualityType}
                onValueChange={(value) => setFormData({ ...formData, qualityType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD">{t('qualityTypes.GOOD')}</SelectItem>
                  <SelectItem value="DAMAGED">{t('qualityTypes.DAMAGED')}</SelectItem>
                  <SelectItem value="QUARANTINE">{t('qualityTypes.QUARANTINE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacityUnits">{t('capacity')}</Label>
              <Input
                id="capacityUnits"
                type="number"
                value={formData.capacityUnits}
                onChange={(e) => setFormData({ ...formData, capacityUnits: e.target.value })}
                placeholder={t('capacityPlaceholder')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
