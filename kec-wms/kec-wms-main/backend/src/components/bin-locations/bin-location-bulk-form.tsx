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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { ZoneSelect } from '@/components/zones/zone-select'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'

interface BulkFormData {
  warehouseId: string
  zoneId: string
  prefix: string
  aisleStart: string
  aisleEnd: string
  rackStart: string
  rackEnd: string
  shelfStart: string
  shelfEnd: string
  binStart: string
  binEnd: string
  locationType: string
  isPickable: boolean
  isReceivable: boolean
}

const MAX_BULK_CREATE_COUNT = 1000

function normalizeNumericSegment(value: string) {
  return value.replace(/\D+/g, '')
}

export function BinLocationBulkForm() {
  const router = useRouter()
  const t = useTranslations('binLocation')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const currentWarehouseId = warehouseContext?.currentWarehouse?.warehouseId || ''

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<BulkFormData>({
    warehouseId: '',
    zoneId: '',
    prefix: '',
    aisleStart: '01',
    aisleEnd: '01',
    rackStart: '01',
    rackEnd: '01',
    shelfStart: '01',
    shelfEnd: '01',
    binStart: '',
    binEnd: '',
    locationType: 'RACK',
    isPickable: false,
    isReceivable: false,
  })

  useEffect(() => {
    if (!formData.warehouseId && currentWarehouseId) {
      setFormData((current) => ({
        ...current,
        warehouseId: currentWarehouseId,
      }))
    }
  }, [currentWarehouseId, formData.warehouseId])

  const calculateCount = () => {
    const parseRange = (start: string, end: string) => {
      const s = parseInt(start, 10)
      const e = parseInt(end, 10)
      if (isNaN(s) || isNaN(e)) return 1
      return Math.max(1, e - s + 1)
    }

    const aisles = parseRange(formData.aisleStart, formData.aisleEnd)
    const racks = parseRange(formData.rackStart, formData.rackEnd)
    const shelves = parseRange(formData.shelfStart, formData.shelfEnd)
    const bins = formData.binStart && formData.binEnd
      ? parseRange(formData.binStart, formData.binEnd)
      : 1

    return aisles * racks * shelves * bins
  }

  const totalCount = calculateCount()
  const exceedsBulkLimit = totalCount > MAX_BULK_CREATE_COUNT

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/v1/bin-locations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('bulkCreateSuccess', { count: result.data.count }))
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
          <CardTitle>{t('bulkCreate')}</CardTitle>
          <CardDescription>{t('bulkCreateDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('warehouse')} *</Label>
              <WarehouseSelect
                value={formData.warehouseId}
                onValueChange={(value) => setFormData((current) => ({ ...current, warehouseId: value, zoneId: '' }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('zone')} *</Label>
              <ZoneSelect
                warehouseId={formData.warehouseId}
                value={formData.zoneId}
                onValueChange={(value) => setFormData((current) => ({ ...current, zoneId: value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">{t('prefix')} *</Label>
              <Input
                id="prefix"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                placeholder={t('prefixPlaceholder')}
                required
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationType">{t('type')} *</Label>
              <Select
                value={formData.locationType}
                onValueChange={(value) => setFormData({ ...formData, locationType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('aisleRange')} *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.aisleStart}
                  onChange={(e) => setFormData({ ...formData, aisleStart: e.target.value })}
                  placeholder="01"
                  maxLength={8}
                  required
                />
                <span>-</span>
                <Input
                  value={formData.aisleEnd}
                  onChange={(e) => setFormData({ ...formData, aisleEnd: e.target.value })}
                  placeholder="01"
                  maxLength={8}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('rackRange')} *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.rackStart}
                  onChange={(e) => setFormData({ ...formData, rackStart: normalizeNumericSegment(e.target.value) })}
                  placeholder="01"
                  maxLength={8}
                  required
                  inputMode="numeric"
                />
                <span>-</span>
                <Input
                  value={formData.rackEnd}
                  onChange={(e) => setFormData({ ...formData, rackEnd: normalizeNumericSegment(e.target.value) })}
                  placeholder="01"
                  maxLength={8}
                  required
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('shelfRange')} *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.shelfStart}
                  onChange={(e) => setFormData({ ...formData, shelfStart: normalizeNumericSegment(e.target.value) })}
                  placeholder="01"
                  maxLength={8}
                  required
                  inputMode="numeric"
                />
                <span>-</span>
                <Input
                  value={formData.shelfEnd}
                  onChange={(e) => setFormData({ ...formData, shelfEnd: normalizeNumericSegment(e.target.value) })}
                  placeholder="01"
                  maxLength={8}
                  required
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('binRange')}</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={formData.binStart}
                  onChange={(e) => setFormData({ ...formData, binStart: normalizeNumericSegment(e.target.value) })}
                  placeholder={t('optional')}
                  maxLength={8}
                  inputMode="numeric"
                />
                <span>-</span>
                <Input
                  value={formData.binEnd}
                  onChange={(e) => setFormData({ ...formData, binEnd: normalizeNumericSegment(e.target.value) })}
                  placeholder={t('optional')}
                  maxLength={8}
                  inputMode="numeric"
                />
              </div>
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
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isReceivable"
                checked={formData.isReceivable}
                onCheckedChange={(checked) => setFormData({ ...formData, isReceivable: checked as boolean })}
              />
              <Label htmlFor="isReceivable">{t('isReceivable')}</Label>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              {t('willCreate')}: <strong>{totalCount}</strong> {t('bins')}
            </p>
            {exceedsBulkLimit && (
              <p className="mt-2 text-sm text-destructive">
                当前范围将创建 {totalCount} 个库位，已超过单次最多 {MAX_BULK_CREATE_COUNT} 个的限制，请缩小范围后再保存。
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={loading || exceedsBulkLimit}>
              {loading ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
