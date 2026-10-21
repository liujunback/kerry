'use client'

import { useState, useEffect, use } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoleLevelBadge } from '@/components/roles/role-level-badge'
import { PermissionManager } from '@/components/roles/permission-manager'
import { PagePermissionGuard } from '@/components/ui/page-permission-guard'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Pencil, Loader2, Shield, Users } from 'lucide-react'
import { formatDate as formatDateValue } from '@/lib/utils/date-formatter'

interface RoleDetail {
  id: string
  roleCode: string
  roleName: string
  description: string | null
  roleLevel: number
  parentRoleId: string | null
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  parentRole: {
    id: string
    roleName: string
    roleCode: string
  } | null
  rolePermissions: {
    id: string
    permission: {
      id: string
      permissionCode: string
      permissionName: string
      category: string
    }
  }[]
  _count: {
    userRoles: number
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function RoleDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const t = useTranslations('role')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const tPermissions = useTranslations('permissions')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/roles' },
  })
  const router = useRouter()

  const [role, setRole] = useState<RoleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchRole = async () => {
    try {
      const response = await fetch(`/api/v1/roles/${id}`)
      const data = await response.json()
      if (data.success) {
        setRole(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRole()
  }, [id])

  const formatDate = (date: string) => formatDateValue(date) || '-'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!role) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCommon('noData')}
      </div>
    )
  }

  const permissionIds = role.rolePermissions.map((rp) => rp.permission.id)

  return (
    <PagePermissionGuard permission="role:read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumb.current(role.roleName)} />
          <Button onClick={() => router.push(`/roles/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            {tCommon('edit')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('level')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoleLevelBadge level={role.roleLevel} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('userCount')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{role._count.userRoles}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('permissionCount')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{role.rolePermissions.length}</span>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">{t('detail')}</TabsTrigger>
            <TabsTrigger value="permissions">{t('permissions')}</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('code')}</p>
                    <p className="font-mono">{role.roleCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('name')}</p>
                    <p>{role.roleName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('isSystem')}</p>
                    <div>{role.isSystem ? <Badge variant="secondary">{t('isSystem')}</Badge> : '-'}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('parentRole')}</p>
                    <p>{role.parentRole ? `${role.parentRole.roleName} (${role.parentRole.roleCode})` : '-'}</p>
                  </div>
                </div>
                {role.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
                    <p>{role.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">创建时间</p>
                    <p className="text-sm">{formatDate(role.createdAt) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">更新时间</p>
                    <p className="text-sm">{formatDate(role.updatedAt) || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>{tPermissions('title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PermissionManager
                  roleId={role.id}
                  initialPermissionIds={permissionIds}
                  onUpdate={fetchRole}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PagePermissionGuard>
  )
}

