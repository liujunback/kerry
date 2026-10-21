import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserStatusBadge } from '@/components/users/user-status-badge'
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog'
import { UserRoleManager } from '@/components/users/user-role-manager'
import { UserWarehouseManager } from '@/components/users/user-warehouse-manager'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('users')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/users' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('user:read')

  const { id } = await params

  const user = await prisma.user.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      employeeId: true,
      department: true,
      position: true,
      userType: true,
      status: true,
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        where: { isActive: true },
        select: {
          id: true,
          role: {
            select: {
              id: true,
              roleCode: true,
              roleName: true,
              roleLevel: true,
              description: true,
            },
          },
          scopeType: true,
          scopeId: true,
          assignedAt: true,
        },
      },
      userWarehouses: {
        where: { isActive: true },
        select: {
          id: true,
          warehouseId: true,
          isDefault: true,
          isActive: true,
          warehouse: {
            select: {
              warehouseCode: true,
              warehouseName: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' },
        ],
      },
    },
  })

  if (!user) {
    notFound()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return formatDateTime(date) || '-'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <div className="flex items-center gap-2">
          <ResetPasswordDialog userId={user.id} username={user.username} />
          <Link href={`/users/${user.id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              {tCommon('edit')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('username')}</p>
                <p className="font-medium">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('fullName')}</p>
                <p className="font-medium">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('email')}</p>
                <p className="font-medium">{user.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('phone')}</p>
                <p className="font-medium">{user.phone || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('status')}</p>
              <UserStatusBadge status={user.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('workInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('employeeId')}</p>
                <p className="font-medium">{user.employeeId || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('department')}</p>
                <p className="font-medium">{user.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('position')}</p>
                <p className="font-medium">{user.position || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('userType')}</p>
                <p className="font-medium">
                  {t(`userTypes.${user.userType}` as 'userTypes.INTERNAL' | 'userTypes.EXTERNAL' | 'userTypes.SYSTEM' | 'userTypes.API')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('loginInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('lastLoginAt')}</p>
                <p className="font-medium">{formatDate(user.lastLoginAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('lastLoginIp')}</p>
                <p className="font-medium">{user.lastLoginIp || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('createdAt')}</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
                <p className="font-medium">{formatDate(user.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('roleManagement')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserRoleManager
              userId={user.id}
              userRoles={user.userRoles.map((ur) => ({
                ...ur,
                assignedAt: ur.assignedAt as unknown as string,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('warehouseManagement')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserWarehouseManager
              userId={user.id}
              bindings={user.userWarehouses.map((binding) => ({
                id: binding.id,
                warehouseId: binding.warehouseId,
                warehouseCode: binding.warehouse.warehouseCode,
                warehouseName: binding.warehouse.warehouseName,
                isDefault: binding.isDefault,
                isActive: binding.isActive,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
