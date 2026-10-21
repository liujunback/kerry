import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { UserForm } from '@/components/users/user-form'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

export default async function CreateUserPage() {
  const session = await auth()
  const t = await getTranslations('users')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/users' },
  })

  if (!session) {
    redirect('/login')
  }

  // 权限检查
  await requirePermission('user:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <UserForm mode="create" currentUserType={session.user.userType} />
    </div>
  )
}
