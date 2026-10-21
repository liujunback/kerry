import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ZoneForm } from '@/components/zones/zone-form'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreateZonePage() {
  const session = await auth()
  const t = await getTranslations('zone')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/zones' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('zone:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <ZoneForm mode="create" />
    </div>
  )
}
