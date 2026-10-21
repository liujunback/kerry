'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BatchPdaQrcodeExpiryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUserIds: string[]
  onSuccess?: () => void
}

function toLocalDatetimeValue(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function BatchPdaQrcodeExpiryDialog({
  open,
  onOpenChange,
  selectedUserIds,
  onSuccess,
}: BatchPdaQrcodeExpiryDialogProps) {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const initialDate = new Date()
  initialDate.setMinutes(initialDate.getMinutes() + 30)
  const defaultDatetime = toLocalDatetimeValue(initialDate)
  const [expiresAt, setExpiresAt] = useState(defaultDatetime)

  useEffect(() => {
    if (open) {
      const date = new Date()
      date.setMinutes(date.getMinutes() + 30)
      setExpiresAt(toLocalDatetimeValue(date))
    }
  }, [open])

  const submit = async (value: string | null) => {
    if (selectedUserIds.length === 0) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/users/batch/pda-login-qrcode-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          expiresAt: value ? new Date(value).toISOString() : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          t('batchPdaQrcodeExpirySuccess', {
            successful: result.data.summary.successful,
            failed: result.data.summary.failed,
          })
        )
        onOpenChange(false)
        onSuccess?.()
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('batchSetPdaQrcodeExpiry')}</DialogTitle>
          <DialogDescription>
            {t('batchSetPdaQrcodeExpiryDesc', { count: selectedUserIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <label htmlFor="pda-qrcode-expiry" className="text-sm font-medium">
            {t('pdaQrcodeExpiry')}
          </label>
          <input
            id="pda-qrcode-expiry"
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t('pdaQrcodeExpiryHint')}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => submit(null)}
            disabled={loading}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {t('clearPdaQrcodeExpiry')}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => submit(expiresAt)}
              disabled={loading || !expiresAt || selectedUserIds.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('confirm')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
