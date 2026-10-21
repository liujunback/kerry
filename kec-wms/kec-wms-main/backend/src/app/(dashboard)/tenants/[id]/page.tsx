import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TenantStatusBadge } from '@/components/tenants/tenant-status-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('tenant')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/tenants' },
  })

  if (!session) {
    redirect('/login')
  }

  if (session.user.userType !== 'SYSTEM') {
    redirect('/forbidden')
  }

  await requirePermission('tenant:read')

  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          warehouses: true,
          clients: true,
        },
      },
    },
  })

  if (!tenant) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/tenants/${id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('code')}</p>
                <p className="font-medium">{tenant.tenantCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('name')}</p>
                <p className="font-medium">{tenant.tenantName}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
              <TenantStatusBadge status={tenant.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('contactPerson')}</p>
                <p className="font-medium">{tenant.contactPerson || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('contactPhone')}</p>
                <p className="font-medium">{tenant.contactPhone || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contactEmail')}</p>
              <p className="font-medium">{tenant.contactEmail || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('address')}</p>
              <p className="font-medium">{tenant.address || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('statistics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded">
                <p className="text-3xl font-bold">{tenant._count.users}</p>
                <p className="text-sm text-muted-foreground">{t('userCount')}</p>
              </div>
              <div className="text-center p-4 border rounded">
                <p className="text-3xl font-bold">{tenant._count.warehouses}</p>
                <p className="text-sm text-muted-foreground">{t('warehouseCount')}</p>
              </div>
              <div className="text-center p-4 border rounded">
                <p className="text-3xl font-bold">{tenant._count.clients}</p>
                <p className="text-sm text-muted-foreground">{t('clientCount')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
