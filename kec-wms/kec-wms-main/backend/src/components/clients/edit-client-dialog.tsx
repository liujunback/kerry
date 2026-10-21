'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

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

interface EditClientDialogProps {
  clientId: string
  trigger?: React.ReactNode
}

export function EditClientDialog({ clientId, trigger }: EditClientDialogProps) {
  const router = useRouter()
  const t = useTranslations('client')
  const tCommon = useTranslations('common')

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [formData, setFormData] = useState<ClientFormData>({
    clientCode: '',
    clientName: '',
    shortName: '',
    clientType: 'STANDARD',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    city: '',
    province: '',
    country: 'CN',
    postalCode: '',
    taxNumber: '',
    bankName: '',
    bankAccount: '',
    creditLimit: '',
    paymentTerms: '30',
    notes: '',
  })

  useEffect(() => {
    if (open) {
      fetchClient()
    }
  }, [open])

  const fetchClient = async () => {
    setFetching(true)
    try {
      const response = await fetch(`/api/v1/clients/${clientId}`)
      const result = await response.json()

      if (result.success) {
        const client = result.data
        setFormData({
          clientCode: client.clientCode,
          clientName: client.clientName,
          shortName: client.shortName || '',
          clientType: client.clientType,
          contactPerson: client.contactPerson || '',
          contactPhone: client.contactPhone || '',
          contactEmail: client.contactEmail || '',
          address: client.address || '',
          city: client.city || '',
          province: client.province || '',
          country: client.country || 'CN',
          postalCode: client.postalCode || '',
          taxNumber: client.taxNumber || '',
          bankName: client.bankName || '',
          bankAccount: client.bankAccount || '',
          creditLimit: client.creditLimit?.toString() || '',
          paymentTerms: client.paymentTerms?.toString() || '30',
          notes: client.notes || '',
        })
      } else {
        toast.error(result.message || tCommon('error'))
        setOpen(false)
      }
    } catch {
      toast.error(tCommon('error'))
      setOpen(false)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/v1/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
          paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms) : 30,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('updateSuccess'))
        router.refresh()
        // 延迟关闭对话框，确保刷新完成
        setTimeout(() => setOpen(false), 100)
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true) }}>
          <Pencil className="h-4 w-4 mr-2" />
          {tCommon('edit')}
        </DropdownMenuItem>
      )}
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('edit')}</DialogTitle>
        </DialogHeader>
        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">{tCommon('loading')}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">{t('basicInfo')}</TabsTrigger>
                <TabsTrigger value="contact">{t('contactInfo')}</TabsTrigger>
                <TabsTrigger value="financial">{t('financialInfo')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-clientCode">{t('code')} *</Label>
                    <Input
                      id="edit-clientCode"
                      value={formData.clientCode}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-clientName">{t('name')} *</Label>
                    <Input
                      id="edit-clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder={t('namePlaceholder')}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-shortName">{t('shortName')}</Label>
                    <Input
                      id="edit-shortName"
                      value={formData.shortName}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                      placeholder={t('shortNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-clientType">{t('type')} *</Label>
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
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contactPerson">{t('contactPerson')}</Label>
                    <Input
                      id="edit-contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder={t('contactPersonPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contactPhone">{t('contactPhone')}</Label>
                    <Input
                      id="edit-contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder={t('contactPhonePlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactEmail">{t('contactEmail')}</Label>
                  <Input
                    id="edit-contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder={t('contactEmailPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">{t('address')}</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t('addressPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">{t('city')}</Label>
                    <Input
                      id="edit-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder={t('cityPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-province">{t('province')}</Label>
                    <Input
                      id="edit-province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder={t('provincePlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-country">{t('country')}</Label>
                    <Input
                      id="edit-country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                      placeholder={t('countryPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-postalCode">{t('postalCode')}</Label>
                    <Input
                      id="edit-postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder={t('postalCodePlaceholder')}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-taxNumber">{t('taxNumber')}</Label>
                    <Input
                      id="edit-taxNumber"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      placeholder={t('taxNumberPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-bankName">{t('bankName')}</Label>
                    <Input
                      id="edit-bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder={t('bankNamePlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankAccount">{t('bankAccount')}</Label>
                  <Input
                    id="edit-bankAccount"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder={t('bankAccountPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-creditLimit">{t('creditLimit')}</Label>
                    <Input
                      id="edit-creditLimit"
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                      placeholder={t('creditLimitPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-paymentTerms">{t('paymentTerms')}</Label>
                    <Input
                      id="edit-paymentTerms"
                      type="number"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      placeholder={t('paymentTermsPlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">{t('notes')}</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('notesPlaceholder')}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tCommon('loading') : tCommon('save')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
