'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogTrigger,
} from '@/components/ui/dialog'

interface Role {
  id: string
  roleCode: string
  roleName: string
  roleLevel: number
  description?: string | null
}

interface UserRole {
  id: string
  role: Role
  scopeType: string
  scopeId?: string | null
  assignedAt: string
}

interface UserRoleManagerProps {
  userId: string
  userRoles: UserRole[]
  userTenantId?: string  // 目标用户的租户 ID（SYSTEM 用户分配其他租户用户角色时使用）
  onUpdate?: () => void
}

export function UserRoleManager({ userId, userRoles, userTenantId, onUpdate }: UserRoleManagerProps) {
  const t = useTranslations('users')
  const tRole = useTranslations('role')
  const tCommon = useTranslations('common')

  const [currentUserRoles, setCurrentUserRoles] = useState<UserRole[]>(userRoles)
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedScopeType, setSelectedScopeType] = useState('GLOBAL')
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchUserRoles = async () => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/roles`)
      const result = await response.json()
      if (result.success) {
        setCurrentUserRoles(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch user roles:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      // 如果指定了目标用户的租户 ID，则获取该租户的角色
      const url = userTenantId
        ? `/api/v1/roles?tenantId=${userTenantId}`
        : '/api/v1/roles'
      const response = await fetch(url)
      const result = await response.json()
      if (result.success) {
        setRoles(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedRoleId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRoleId,
          scopeType: selectedScopeType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('roleAssignSuccess'))
        setDialogOpen(false)
        setSelectedRoleId('')
        setSelectedScopeType('GLOBAL')
        await fetchUserRoles()
        onUpdate?.()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveRole = async (userRoleId: string) => {
    if (!confirm(t('confirmRemoveRole'))) return

    try {
      const response = await fetch(`/api/v1/users/${userId}/roles/${userRoleId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('roleRemoveSuccess'))
        await fetchUserRoles()
        onUpdate?.()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    }
  }

  // 过滤掉已分配的角色
  const availableRoles = roles.filter(
    (role) => !currentUserRoles.some((ur) => ur.role.id === role.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('roles')}</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t('assignRole')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('assignRole')}</DialogTitle>
              <DialogDescription>
                {tRole('selectRolePlaceholder')}
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
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.roleName} ({role.roleCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('scopeTypes.GLOBAL')}</label>
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleAssignRole} disabled={loading || !selectedRoleId}>
                {loading ? tCommon('loading') : tCommon('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {currentUserRoles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
      ) : (
        <div className="space-y-2">
          {currentUserRoles.map((userRole) => (
            <div
              key={userRole.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{userRole.role.roleName}</p>
                  <p className="text-sm text-muted-foreground">
                    {userRole.role.roleCode}
                  </p>
                </div>
                <Badge variant="outline">
                  {t(`scopeTypes.${userRole.scopeType}` as 'scopeTypes.GLOBAL' | 'scopeTypes.WAREHOUSE' | 'scopeTypes.ZONE')}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRole(userRole.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
