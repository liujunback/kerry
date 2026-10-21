'use client'

import { useState, useEffect } from 'react'
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

interface Client {
  id: string
  clientCode: string
  clientName: string
}

interface Category {
  id: string
  categoryCode: string
  categoryName: string
}

interface SkuFormData {
  skuCode: string
  skuName: string
  barcode: string
  clientId: string
  categoryId: string
  unit: string
  lengthCm: string
  widthCm: string
  heightCm: string
  weightKg: string
  unitPrice: string
  currency: string
  storageCondition: string
  isBatchManaged: boolean
  isSerialManaged: boolean
  isExpiryManaged: boolean
  isSelfPackaged: boolean
  notes: string
}

interface SkuFormProps {
  initialData: Partial<SkuFormData> & { id: string; isFirstReceiving?: boolean }
}

// 常用单位选项
const UNIT_OPTIONS = [
  { value: 'PCS', label: 'PCS (件)' },
  { value: 'EA', label: 'EA (个)' },
  { value: 'BOX', label: 'BOX (盒)' },
  { value: 'CTN', label: 'CTN (箱)' },
  { value: 'SET', label: 'SET (套)' },
  { value: 'PAIR', label: 'PAIR (双)' },
  { value: 'KG', label: 'KG (千克)' },
  { value: 'G', label: 'G (克)' },
  { value: 'L', label: 'L (升)' },
  { value: 'ML', label: 'ML (毫升)' },
  { value: 'M', label: 'M (米)' },
  { value: 'ROLL', label: 'ROLL (卷)' },
]

// 常用币种选项
const CURRENCY_OPTIONS = [
  { value: 'CNY', label: 'CNY (人民币)' },
  { value: 'USD', label: 'USD (美元)' },
  { value: 'EUR', label: 'EUR (欧元)' },
  { value: 'JPY', label: 'JPY (日元)' },
  { value: 'GBP', label: 'GBP (英镑)' },
  { value: 'HKD', label: 'HKD (港币)' },
  { value: 'TWD', label: 'TWD (新台币)' },
  { value: 'KRW', label: 'KRW (韩元)' },
]

export function SkuForm({ initialData }: SkuFormProps) {
  const router = useRouter()
  const t = useTranslations('sku')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // 是否已首次收货（首次收货后限制编辑）
  const isReceivedBefore = initialData.isFirstReceiving === false

  const [formData, setFormData] = useState<SkuFormData>({
    skuCode: initialData.skuCode || '',
    skuName: initialData.skuName || '',
    barcode: initialData.barcode || '',
    clientId: initialData.clientId || '',
    categoryId: initialData.categoryId || '',
    unit: initialData.unit || 'PCS',
    lengthCm: initialData.lengthCm?.toString() || '',
    widthCm: initialData.widthCm?.toString() || '',
    heightCm: initialData.heightCm?.toString() || '',
    weightKg: initialData.weightKg?.toString() || '',
    unitPrice: initialData.unitPrice?.toString() || '',
    currency: initialData.currency || 'CNY',
    storageCondition: initialData.storageCondition || 'NORMAL',
    isBatchManaged: initialData.isBatchManaged || false,
    isSerialManaged: initialData.isSerialManaged || false,
    isExpiryManaged: initialData.isExpiryManaged || false,
    isSelfPackaged: initialData.isSelfPackaged || false,
    notes: initialData.notes || '',
  })

  useEffect(() => {
    fetchClients()
    fetchCategories()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/v1/clients?pageSize=100&isActive=true')
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/sku-categories?isActive=true')
      const result = await response.json()
      if (result.success) {
        // Flatten tree structure for select
        const flatCategories: Category[] = []
        const flatten = (items: Category[], prefix = '') => {
          items.forEach((item: Category & { children?: Category[] }) => {
            flatCategories.push({
              ...item,
              categoryName: prefix + item.categoryName,
            })
            if (item.children) {
              flatten(item.children, prefix + '  ')
            }
          })
        }
        flatten(result.data)
        setCategories(flatCategories)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/v1/skus/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
          widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          categoryId: formData.categoryId || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('updateSuccess'))
        router.push('/sku')
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {isReceivedBefore && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
          <p className="text-sm font-medium">{t('receivedWarning')}</p>
          <p className="text-xs mt-1">{t('receivedWarningDetail')}</p>
        </div>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="clientId" className="text-sm">{t('client')} *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                disabled
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clientCode} - {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="skuCode" className="text-sm">{t('code')} *</Label>
              <Input
                id="skuCode"
                value={formData.skuCode}
                onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
                placeholder={t('codePlaceholder')}
                required
                disabled={isReceivedBefore}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="skuName" className="text-sm">{t('name')} *</Label>
              <Input
                id="skuName"
                value={formData.skuName}
                onChange={(e) => setFormData({ ...formData, skuName: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
                disabled={isReceivedBefore}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="barcode" className="text-sm">{t('barcode')}</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder={t('barcodePlaceholder')}
                disabled={isReceivedBefore}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit" className="text-sm">{t('unit')} *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                disabled={isReceivedBefore}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('selectUnit')} />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">{t('physicalAttributes')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="lengthCm" className="text-sm">{t('lengthCm')}</Label>
              <Input
                id="lengthCm"
                type="number"
                step="0.01"
                value={formData.lengthCm}
                onChange={(e) => setFormData({ ...formData, lengthCm: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="widthCm" className="text-sm">{t('widthCm')}</Label>
              <Input
                id="widthCm"
                type="number"
                step="0.01"
                value={formData.widthCm}
                onChange={(e) => setFormData({ ...formData, widthCm: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="heightCm" className="text-sm">{t('heightCm')}</Label>
              <Input
                id="heightCm"
                type="number"
                step="0.01"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weightKg" className="text-sm">{t('weightKg')}</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.001"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t('managementSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="storageCondition" className="text-sm">{t('storageConditionLabel')}</Label>
              <Select
                value={formData.storageCondition}
                onValueChange={(value) => setFormData({ ...formData, storageCondition: value })}
                disabled={isReceivedBefore}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">{t('storageCondition.NORMAL')}</SelectItem>
                  <SelectItem value="COLD">{t('storageCondition.COLD')}</SelectItem>
                  <SelectItem value="FROZEN">{t('storageCondition.FROZEN')}</SelectItem>
                  <SelectItem value="HAZMAT">{t('storageCondition.HAZMAT')}</SelectItem>
                  <SelectItem value="CONTROLLED">{t('storageCondition.CONTROLLED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isBatchManaged"
                  checked={formData.isBatchManaged}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isBatchManaged: checked as boolean })
                  }
                  disabled={isReceivedBefore}
                />
                <Label htmlFor="isBatchManaged" className="text-sm">{t('isBatchManaged')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isSerialManaged"
                  checked={formData.isSerialManaged}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isSerialManaged: checked as boolean })
                  }
                  disabled={isReceivedBefore}
                />
                <Label htmlFor="isSerialManaged" className="text-sm">{t('isSerialManaged')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isExpiryManaged"
                  checked={formData.isExpiryManaged}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isExpiryManaged: checked as boolean })
                  }
                  disabled={isReceivedBefore}
                />
                <Label htmlFor="isExpiryManaged" className="text-sm">{t('isExpiryManaged')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isSelfPackaged"
                  checked={formData.isSelfPackaged}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isSelfPackaged: checked as boolean })
                  }
                  disabled={isReceivedBefore}
                />
                <Label htmlFor="isSelfPackaged" className="text-sm">{t('isSelfPackaged')}</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t('otherInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="unitPrice" className="text-sm">{t('unitPrice')}</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="h-9"
                  disabled={isReceivedBefore}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency" className="text-sm">{t('currency')}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  disabled={isReceivedBefore}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('selectCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-sm">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('notesPlaceholder')}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
