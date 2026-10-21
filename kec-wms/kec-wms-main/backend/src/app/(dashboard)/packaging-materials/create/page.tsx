import { PackagingMaterialForm } from '@/components/packaging-materials/packaging-material-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreatePackagingMaterialPage() {
  const session = await auth()
  const t = await getTranslations('packagingMaterial')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [
      { label: tMenuGroup('outbound') },
      { label: tMenuGroup('packagingMaterial') },
    ],
    module: { label: t('title'), href: '/packaging-materials' },
  })

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <PackagingMaterialForm mode="create" />
    </div>
  )
}
