'use client'

import { useState } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Material {
  id: string
  materialCode: string
  materialName: string
}

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface OutboundFormProps {
  materials: Material[]
  warehouses: Warehouse[]
}

export function OutboundForm({ materials, warehouses }: OutboundFormProps) {
  const router = useRouter()
  const t = useTranslations('packagingMaterialInventory')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    materialId: '',
    warehouseId: '',
    quantity: '',
    referenceType: '',
    referenceNumber: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/v1/packaging-material-inventory/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('outboundSuccess'))
        router.push('/packaging-material-inventory')
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
          <CardTitle>{t('outboundInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materialId">{t('material')} *</Label>
              <Select
                value={formData.materialId}
                onValueChange={(value) => setFormData({ ...formData, materialId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectMaterial')} />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.materialCode} - {m.materialName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{t('warehouse')} *</Label>
              <Select
                value={formData.warehouseId}
                onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectWarehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">{t('quantity')} *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referenceType">{t('referenceType')}</Label>
              <Select
                value={formData.referenceType}
                onValueChange={(value) => setFormData({ ...formData, referenceType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectReferenceType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES_ORDER">{t('referenceTypes.SALES_ORDER')}</SelectItem>
                  <SelectItem value="SHIPMENT">{t('referenceTypes.SHIPMENT')}</SelectItem>
                  <SelectItem value="ADJUSTMENT">{t('referenceTypes.ADJUSTMENT')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">{t('referenceNumber')}</Label>
              <Input
                id="referenceNumber"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder={t('referenceNumberPlaceholder')}
              />
            </div>
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
        <Button type="submit" disabled={loading || !formData.materialId || !formData.warehouseId || !formData.quantity}>
          {loading ? tCommon('loading') : t('confirmOutbound')}
        </Button>
      </div>
    </form>
  )
}
