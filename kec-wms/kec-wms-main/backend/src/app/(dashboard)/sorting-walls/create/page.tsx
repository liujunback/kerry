import { SortingWallForm } from '@/components/sorting-walls/sorting-wall-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreateSortingWallPage() {
  const session = await auth()
  const t = await getTranslations('sortingWall')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/sorting-walls' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('sorting-wall:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <SortingWallForm mode="create" />
    </div>
  )
}
