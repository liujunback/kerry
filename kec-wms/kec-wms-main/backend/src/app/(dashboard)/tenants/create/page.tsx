import { TenantForm } from '@/components/tenants/tenant-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreateTenantPage() {
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
  await requirePermission('tenant:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <TenantForm mode="create" />
    </div>
  )
}
