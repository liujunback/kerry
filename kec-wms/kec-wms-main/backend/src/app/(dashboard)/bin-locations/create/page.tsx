import { BinLocationForm } from '@/components/bin-locations/bin-location-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreateBinLocationPage() {
  const session = await auth()
  const t = await getTranslations('binLocation')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/bin-locations' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('bin:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <BinLocationForm mode="create" />
    </div>
  )
}
