'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface BatchStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedContainerIds: string[]
  targetStatus: 'ENABLED' | 'DISABLED'
  onSuccess: () => void
}

export function BatchStatusDialog({
  open,
  onOpenChange,
  selectedContainerIds,
  targetStatus,
  onSuccess,
}: BatchStatusDialogProps) {
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/containers/batch/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerIds: selectedContainerIds,
          enabledStatus: targetStatus,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const statusText = targetStatus === 'ENABLED' ? t('batchEnable') : t('batchDisable')
  const confirmMessage =
    targetStatus === 'ENABLED'
      ? t('confirmBatchEnable', { count: selectedContainerIds.length })
      : t('confirmBatchDisable', { count: selectedContainerIds.length })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{statusText}</DialogTitle>
          <DialogDescription>{confirmMessage}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
