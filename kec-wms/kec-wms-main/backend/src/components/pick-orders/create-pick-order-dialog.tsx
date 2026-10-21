'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface User {
  id: string
  fullName: string
  username: string
}

interface CreatePickOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouseId: string
  selectedOrderIds: string[]
  selectedOrderCount: number
  totalSkuCount: number
  totalItemCount: number
  users: User[]
  onSuccess: () => void
}

export function CreatePickOrderDialog({
  open,
  onOpenChange,
  warehouseId,
  selectedOrderIds,
  selectedOrderCount,
  totalSkuCount,
  totalItemCount,
  users,
  onSuccess,
}: CreatePickOrderDialogProps) {
  const t = useTranslations('pickOrder')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [assignedUserId, setAssignedUserId] = useState<string>('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error(t('selectOrdersFirst'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/pick-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          orderIds: selectedOrderIds,
          assignedUserId: assignedUserId || null,
          notes: notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || t('createFailed'))
      }

      toast.success(t('createSuccess'))
      onSuccess()
      onOpenChange(false)
      setAssignedUserId('')
      setNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('createFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('createPickOrder')}</DialogTitle>
          <DialogDescription>{t('createPickOrderDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 汇总信息 */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{selectedOrderCount}</div>
              <div className="text-xs text-muted-foreground">{t('orderCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalSkuCount}</div>
              <div className="text-xs text-muted-foreground">{t('skuCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalItemCount}</div>
              <div className="text-xs text-muted-foreground">{t('itemCount')}</div>
            </div>
          </div>

          {/* 拣货员选择 */}
          <div className="space-y-2">
            <Label>{t('assignedUser')}</Label>
            <Select value={assignedUserId || 'none'} onValueChange={(v) => setAssignedUserId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectUser')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('notAssigned')}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedOrderIds.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
