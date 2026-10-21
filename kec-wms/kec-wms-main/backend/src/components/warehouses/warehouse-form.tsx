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

interface WarehouseFormData {
  warehouseCode: string
  warehouseName: string
  warehouseType: string
  address: string
  city: string
  country: string
  zipCode: string
  region: string
  warehouseArea: string
  contactName: string
  contactPhone: string
  contactEmail: string
}

interface WarehouseFormProps {
  initialData?: Partial<WarehouseFormData> & { id?: string }
  mode: 'create' | 'edit'
}

export function WarehouseForm({ initialData, mode }: WarehouseFormProps) {
  const router = useRouter()
  const t = useTranslations('warehouse')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<WarehouseFormData>({
    warehouseCode: initialData?.warehouseCode || '',
    warehouseName: initialData?.warehouseName || '',
    warehouseType: initialData?.warehouseType || 'SELF_BUILT',
    address: initialData?.address || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
    zipCode: initialData?.zipCode || '',
    region: initialData?.region || '',
    warehouseArea: initialData?.warehouseArea?.toString() || '',
    contactName: initialData?.contactName || '',
    contactPhone: initialData?.contactPhone || '',
    contactEmail: initialData?.contactEmail || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create'
        ? '/api/v1/warehouses'
        : `/api/v1/warehouses/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          warehouseArea: formData.warehouseArea ? parseFloat(formData.warehouseArea) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push('/warehouses')
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
              <Label htmlFor="warehouseCode">{t('code')} *</Label>
              <Input
                id="warehouseCode"
                value={formData.warehouseCode}
                onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value.toUpperCase() })}
                placeholder={t('codePlaceholder')}
                required
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseName">{t('name')} *</Label>
              <Input
                id="warehouseName"
                value={formData.warehouseName}
                onChange={(e) => setFormData({ ...formData, warehouseName: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warehouseType">{t('type')} *</Label>
              <Select
                value={formData.warehouseType}
                onValueChange={(value) => setFormData({ ...formData, warehouseType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF_BUILT">{t('types.SELF_BUILT')}</SelectItem>
                  <SelectItem value="THIRD_PARTY">{t('types.THIRD_PARTY')}</SelectItem>
                  <SelectItem value="BONDED">{t('types.BONDED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseArea">{t('area')}</Label>
              <Input
                id="warehouseArea"
                type="number"
                value={formData.warehouseArea}
                onChange={(e) => setFormData({ ...formData, warehouseArea: e.target.value })}
                placeholder={t('areaPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('address')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('addressPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t('city')}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t('cityPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t('country')}</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                placeholder={t('countryPlaceholder')}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">{t('region')}</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder={t('regionPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">{t('contactName')}</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder={t('contactNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder={t('contactPhonePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder={t('contactEmailPlaceholder')}
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
