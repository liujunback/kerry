import { TenantForm } from '@/components/tenants/tenant-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTenantPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('tenant')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/tenants' },
  })

  if (!session) {
    redirect('/login')
  }

  // 超级管理员权限检查
  if (session.user.userType !== 'SYSTEM') {
    redirect('/forbidden')
  }

  // 权限检查
  await requirePermission('tenant:update')

  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
  })

  if (!tenant) {
    notFound()
  }

  const initialData = {
    id: tenant.id,
    tenantCode: tenant.tenantCode,
    tenantName: tenant.tenantName,
    contactPerson: tenant.contactPerson || '',
    contactPhone: tenant.contactPhone || '',
    contactEmail: tenant.contactEmail || '',
    address: tenant.address || '',
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <TenantForm mode="edit" initialData={initialData} />
    </div>
  )
}
