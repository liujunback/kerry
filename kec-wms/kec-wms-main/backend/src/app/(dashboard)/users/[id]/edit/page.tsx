import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { UserForm } from '@/components/users/user-form'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: PageProps) {
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

  await requirePermission('user:update')

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
    },
  })

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <UserForm user={user} mode="edit" currentUserType={session.user.userType} />
    </div>
  )
}
