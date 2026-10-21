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

interface ClientFormData {
  clientCode: string
  clientName: string
  shortName: string
  clientType: string
  contactPerson: string
  contactPhone: string
  contactEmail: string
  address: string
  city: string
  province: string
  country: string
  postalCode: string
  taxNumber: string
  bankName: string
  bankAccount: string
  creditLimit: string
  paymentTerms: string
  notes: string
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData> & { id?: string }
  mode: 'create' | 'edit'
}

export function ClientForm({ initialData, mode }: ClientFormProps) {
  const router = useRouter()
  const t = useTranslations('client')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ClientFormData>({
    clientCode: initialData?.clientCode || '',
    clientName: initialData?.clientName || '',
    shortName: initialData?.shortName || '',
    clientType: initialData?.clientType || 'STANDARD',
    contactPerson: initialData?.contactPerson || '',
    contactPhone: initialData?.contactPhone || '',
    contactEmail: initialData?.contactEmail || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    country: initialData?.country || 'CN',
    postalCode: initialData?.postalCode || '',
    taxNumber: initialData?.taxNumber || '',
    bankName: initialData?.bankName || '',
    bankAccount: initialData?.bankAccount || '',
    creditLimit: initialData?.creditLimit?.toString() || '',
    paymentTerms: initialData?.paymentTerms?.toString() || '30',
    notes: initialData?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create'
        ? '/api/v1/clients'
        : `/api/v1/clients/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
          paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms) : 30,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push('/clients')
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
              <Label htmlFor="clientCode">{t('code')} *</Label>
              <Input
                id="clientCode"
                value={formData.clientCode}
                onChange={(e) => setFormData({ ...formData, clientCode: e.target.value.toUpperCase() })}
                placeholder={t('codePlaceholder')}
                required
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">{t('name')} *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shortName">{t('shortName')}</Label>
              <Input
                id="shortName"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder={t('shortNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientType">{t('type')} *</Label>
              <Select
                value={formData.clientType}
                onValueChange={(value) => setFormData({ ...formData, clientType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">{t('types.STANDARD')}</SelectItem>
                  <SelectItem value="VIP">{t('types.VIP')}</SelectItem>
                  <SelectItem value="ENTERPRISE">{t('types.ENTERPRISE')}</SelectItem>
                  <SelectItem value="TRIAL">{t('types.TRIAL')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('contactInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">{t('contactPerson')}</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder={t('contactPersonPlaceholder')}
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

          <div className="space-y-2">
            <Label htmlFor="address">{t('address')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('addressPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
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
              <Label htmlFor="province">{t('province')}</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder={t('provincePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t('country')}</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                placeholder={t('countryPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('postalCode')}</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder={t('postalCodePlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('financialInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxNumber">{t('taxNumber')}</Label>
              <Input
                id="taxNumber"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                placeholder={t('taxNumberPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">{t('bankName')}</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder={t('bankNamePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccount">{t('bankAccount')}</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder={t('bankAccountPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">{t('creditLimit')}</Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder={t('creditLimitPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">{t('paymentTerms')}</Label>
              <Input
                id="paymentTerms"
                type="number"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder={t('paymentTermsPlaceholder')}
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
        <Button type="submit" disabled={loading}>
          {loading ? tCommon('loading') : tCommon('save')}
        </Button>
      </div>
    </form>
  )
}
