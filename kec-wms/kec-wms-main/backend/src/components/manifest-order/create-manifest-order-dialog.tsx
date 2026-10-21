'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'

interface CreateManifestOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateManifestOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateManifestOrderDialogProps) {
  const t = useTranslations('manifestOrder')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    warehouseId: '',
    channelCode: '',
    channelName: '',
    notes: '',
  })

  const resetForm = () => {
    setFormData({ warehouseId: '', channelCode: '', channelName: '', notes: '' })
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!formData.warehouseId || !formData.channelCode || !formData.channelName) {
      toast.error(t('createValidationError'))
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/manifest-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: formData.warehouseId,
          channelCode: formData.channelCode,
          channelName: formData.channelName,
          notes: formData.notes || null,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(t('createSuccess'))
        handleClose()
        onSuccess()
      } else {
        toast.error(result.error || result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const isValid = formData.warehouseId && formData.channelCode && formData.channelName

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('create')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>{t('warehouse')} *</Label>
            <WarehouseSelect
              value={formData.warehouseId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, warehouseId: value }))}
              placeholder={t('warehousePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('channelCode')} *</Label>
            <Input
              value={formData.channelCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, channelCode: e.target.value }))}
              placeholder={t('channelCodePlaceholder')}
              maxLength={64}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('channelNameLabel')} *</Label>
            <Input
              value={formData.channelName}
              onChange={(e) => setFormData((prev) => ({ ...prev, channelName: e.target.value }))}
              placeholder={t('channelNamePlaceholder')}
              maxLength={128}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>{t('notes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
