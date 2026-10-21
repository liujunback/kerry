'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Role {
  id: string
  roleCode: string
  roleName: string
}

interface BatchRoleAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUserIds: string[]
  onSuccess?: () => void
}

export function BatchRoleAssignDialog({
  open,
  onOpenChange,
  selectedUserIds,
  onSuccess,
}: BatchRoleAssignDialogProps) {
  const t = useTranslations('users')
  const tRole = useTranslations('role')
  const tCommon = useTranslations('common')

  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedScopeType, setSelectedScopeType] = useState('GLOBAL')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchRoles()
    }
  }, [open])

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/v1/roles')
      const result = await response.json()
      if (result.success) {
        setRoles(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }

  const handleBatchAssign = async () => {
    if (!selectedRoleId || selectedUserIds.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/v1/users/batch/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          assignments: [
            {
              roleId: selectedRoleId,
              scopeType: selectedScopeType,
            },
          ],
          skipExisting: true,
          continueOnError: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const { summary } = result.data
        toast.success(
          t('batchAssignSuccess', {
            successful: summary.successful,
            skipped: summary.skipped,
            failed: summary.failed,
          })
        )
        onOpenChange(false)
        setSelectedRoleId('')
        setSelectedScopeType('GLOBAL')
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
          <DialogTitle>{t('batchAssignRole')}</DialogTitle>
          <DialogDescription>
            {t('batchAssignRoleDesc', { count: selectedUserIds.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{tRole('selectRole')}</label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder={tRole('selectRolePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.roleName} ({role.roleCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('scopeType')}</label>
            <Select value={selectedScopeType} onValueChange={setSelectedScopeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">{t('scopeTypes.GLOBAL')}</SelectItem>
                <SelectItem value="WAREHOUSE">{t('scopeTypes.WAREHOUSE')}</SelectItem>
                <SelectItem value="ZONE">{t('scopeTypes.ZONE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleBatchAssign}
            disabled={loading || !selectedRoleId || selectedUserIds.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
