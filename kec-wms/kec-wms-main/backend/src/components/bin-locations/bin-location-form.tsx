'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { ZoneSelect } from '@/components/zones/zone-select'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'

interface BinLocationFormData {
  warehouseId: string
  zoneId: string
  locationCode: string
  aisle: string
  rack: string
  shelf: string
  bin: string
  locationType: string
  isPickable: boolean
  isReceivable: boolean
  lengthCm: string
  widthCm: string
  heightCm: string
  putawayPriority: number
  pickPriority: number
  pickSequence: number
  maxSkuCount: number
}

interface BinLocationFormProps {
  initialData?: Partial<BinLocationFormData> & { id?: string }
  mode: 'create' | 'edit'
}

function normalizeNumericSegment(value: string) {
  return value.replace(/\D+/g, '')
}

export function BinLocationForm({ initialData, mode }: BinLocationFormProps) {
  const router = useRouter()
  const t = useTranslations('binLocation')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const currentWarehouseId = warehouseContext?.currentWarehouse?.warehouseId || ''

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<BinLocationFormData>({
    warehouseId: initialData?.warehouseId || '',
    zoneId: initialData?.zoneId || '',
    locationCode: initialData?.locationCode || '',
    aisle: initialData?.aisle || '',
    rack: initialData?.rack || '',
    shelf: initialData?.shelf || '',
    bin: initialData?.bin || '',
    locationType: initialData?.locationType || '',
    isPickable: initialData?.isPickable || false,
    isReceivable: initialData?.isReceivable || false,
    lengthCm: initialData?.lengthCm || '',
    widthCm: initialData?.widthCm || '',
    heightCm: initialData?.heightCm || '',
    putawayPriority: initialData?.putawayPriority ?? 100,
    pickPriority: initialData?.pickPriority ?? 100,
    pickSequence: initialData?.pickSequence ?? 0,
    maxSkuCount: initialData?.maxSkuCount ?? 1,
  })

  useEffect(() => {
    if (!formData.warehouseId && currentWarehouseId) {
      setFormData((current) => ({
        ...current,
        warehouseId: currentWarehouseId,
      }))
    }
  }, [currentWarehouseId, formData.warehouseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create'
        ? '/api/v1/bin-locations'
        : `/api/v1/bin-locations/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          locationType: formData.locationType || null,
          lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
          widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push('/bin-locations')
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
              <Label>{t('warehouse')} *</Label>
              <WarehouseSelect
                value={formData.warehouseId}
                onValueChange={(value) => setFormData((current) => ({ ...current, warehouseId: value, zoneId: '' }))}
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('zone')} *</Label>
              <ZoneSelect
                warehouseId={formData.warehouseId}
                value={formData.zoneId}
                onValueChange={(value) => setFormData((current) => ({ ...current, zoneId: value }))}
                disabled={mode === 'edit'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationCode">{t('code')} *</Label>
              <Input
                id="locationCode"
                value={formData.locationCode}
                onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })}
                placeholder={t('codePlaceholder')}
                required
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationType">{t('type')}</Label>
              <Select
                value={formData.locationType}
                onValueChange={(value) => setFormData({ ...formData, locationType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RACK">{t('locationTypes.RACK')}</SelectItem>
                  <SelectItem value="SHELF">{t('locationTypes.SHELF')}</SelectItem>
                  <SelectItem value="FLOOR">{t('locationTypes.FLOOR')}</SelectItem>
                  <SelectItem value="STAGING">{t('locationTypes.STAGING')}</SelectItem>
                  <SelectItem value="DOCK">{t('locationTypes.DOCK')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aisle">{t('aisle')}</Label>
              <Input
                id="aisle"
                value={formData.aisle}
                onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                placeholder={t('aislePlaceholder')}
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rack">{t('rack')}</Label>
              <Input
                id="rack"
                value={formData.rack}
                onChange={(e) => setFormData({ ...formData, rack: normalizeNumericSegment(e.target.value) })}
                placeholder={t('rackPlaceholder')}
                maxLength={8}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shelf">{t('shelf')}</Label>
              <Input
                id="shelf"
                value={formData.shelf}
                onChange={(e) => setFormData({ ...formData, shelf: normalizeNumericSegment(e.target.value) })}
                placeholder={t('shelfPlaceholder')}
                maxLength={8}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bin">{t('bin')}</Label>
              <Input
                id="bin"
                value={formData.bin}
                onChange={(e) => setFormData({ ...formData, bin: normalizeNumericSegment(e.target.value) })}
                placeholder={t('binPlaceholder')}
                maxLength={8}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lengthCm">{t('lengthCm')}</Label>
              <Input
                id="lengthCm"
                type="number"
                step="0.01"
                min="0"
                value={formData.lengthCm}
                onChange={(e) => setFormData({ ...formData, lengthCm: e.target.value })}
                placeholder={t('lengthCmPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="widthCm">{t('widthCm')}</Label>
              <Input
                id="widthCm"
                type="number"
                step="0.01"
                min="0"
                value={formData.widthCm}
                onChange={(e) => setFormData({ ...formData, widthCm: e.target.value })}
                placeholder={t('widthCmPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightCm">{t('heightCm')}</Label>
              <Input
                id="heightCm"
                type="number"
                step="0.01"
                min="0"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                placeholder={t('heightCmPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="putawayPriority">{t('putawayPriority')}</Label>
              <Input
                id="putawayPriority"
                type="number"
                min="1"
                value={formData.putawayPriority}
                onChange={(e) => setFormData({ ...formData, putawayPriority: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickPriority">{t('pickPriority')}</Label>
              <Input
                id="pickPriority"
                type="number"
                min="1"
                value={formData.pickPriority}
                onChange={(e) => setFormData({ ...formData, pickPriority: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickSequence">{t('pickSequence')}</Label>
              <Input
                id="pickSequence"
                type="number"
                min="0"
                value={formData.pickSequence}
                onChange={(e) => setFormData({ ...formData, pickSequence: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxSkuCount">{t('maxSkuCount')}</Label>
              <Input
                id="maxSkuCount"
                type="number"
                min="1"
                value={formData.maxSkuCount}
                onChange={(e) => setFormData({ ...formData, maxSkuCount: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPickable"
                checked={formData.isPickable}
                onCheckedChange={(checked) => setFormData({ ...formData, isPickable: checked as boolean })}
              />
              <Label htmlFor="isPickable">{t('isPickable')}</Label>
              <span className="text-xs text-muted-foreground">({t('isPickableHint')})</span>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isReceivable"
                checked={formData.isReceivable}
                onCheckedChange={(checked) => setFormData({ ...formData, isReceivable: checked as boolean })}
              />
              <Label htmlFor="isReceivable">{t('isReceivable')}</Label>
              <span className="text-xs text-muted-foreground">({t('isReceivableHint')})</span>
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
