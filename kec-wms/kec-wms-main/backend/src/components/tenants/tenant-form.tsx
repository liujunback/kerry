'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TenantFormData {
  tenantCode: string
  tenantName: string
  contactPerson: string
  contactPhone: string
  contactEmail: string
  address: string
}

interface DefaultAdminInfo {
  username: string
  password: string
  fullName: string
}

interface TenantFormProps {
  initialData?: Partial<TenantFormData> & { id?: string }
  mode: 'create' | 'edit'
}

export function TenantForm({ initialData, mode }: TenantFormProps) {
  const router = useRouter()
  const t = useTranslations('tenant')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [defaultAdmin, setDefaultAdmin] = useState<DefaultAdminInfo | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [formData, setFormData] = useState<TenantFormData>({
    tenantCode: initialData?.tenantCode || '',
    tenantName: initialData?.tenantName || '',
    contactPerson: initialData?.contactPerson || '',
    contactPhone: initialData?.contactPhone || '',
    contactEmail: initialData?.contactEmail || '',
    address: initialData?.address || '',
  })

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDialogClose = () => {
    setShowCredentialsDialog(false)
    router.push('/tenants')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create'
        ? '/api/v1/tenants'
        : `/api/v1/tenants/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        if (mode === 'create' && result.data?.defaultAdmin) {
          setDefaultAdmin(result.data.defaultAdmin)
          setShowCredentialsDialog(true)
          toast.success(t('createSuccess'))
        } else {
          toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
          router.push('/tenants')
          router.refresh()
        }
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
              <Label htmlFor="tenantCode">{t('code')} *</Label>
              <Input
                id="tenantCode"
                value={formData.tenantCode}
                onChange={(e) => setFormData({ ...formData, tenantCode: e.target.value.toUpperCase() })}
                placeholder={t('codePlaceholder')}
                required
                disabled={mode === 'edit'}
              />
              <p className="text-xs text-muted-foreground">{t('codeHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantName">{t('name')} *</Label>
              <Input
                id="tenantName"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                placeholder={t('namePlaceholder')}
                required
              />
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
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('addressPlaceholder')}
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

      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('defaultAdminCreated')}</DialogTitle>
            <DialogDescription>
              {t('defaultAdminDescription')}
            </DialogDescription>
          </DialogHeader>
          {defaultAdmin && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('adminUsername')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={defaultAdmin.username} readOnly className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(defaultAdmin.username, 'username')}
                  >
                    {copiedField === 'username' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('adminPassword')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={defaultAdmin.password} readOnly className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(defaultAdmin.password, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-amber-600">
                {t('passwordWarning')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleDialogClose}>{tCommon('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
