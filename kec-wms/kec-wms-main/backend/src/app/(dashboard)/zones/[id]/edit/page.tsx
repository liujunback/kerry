import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ZoneForm } from '@/components/zones/zone-form'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditZonePage({ params }: PageProps) {
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

  await requirePermission('zone:update')

  const { id } = await params

  const zone = await prisma.zone.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!zone) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <ZoneForm
        mode="edit"
        initialData={{
          id: zone.id,
          warehouseId: zone.warehouseId,
          zoneCode: zone.zoneCode,
          zoneName: zone.zoneName || '',
          zoneType: zone.zoneType,
          qualityType: zone.qualityType,
          capacityUnits: zone.capacityUnits?.toString() || '',
        }}
      />
    </div>
  )
}
