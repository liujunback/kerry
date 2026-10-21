import { Breadcrumb } from '@/components/ui/breadcrumb'
import { WarehouseForm } from '@/components/warehouses/warehouse-form'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreateWarehousePage() {
  const session = await auth()
  const t = await getTranslations('warehouse')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/warehouses' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('warehouse:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <WarehouseForm mode="create" />
    </div>
  )
}
