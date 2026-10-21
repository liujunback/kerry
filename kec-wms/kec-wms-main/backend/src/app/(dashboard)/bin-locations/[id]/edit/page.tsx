import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { BinLocationForm } from '@/components/bin-locations/bin-location-form'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBinLocationPage({ params }: PageProps) {
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

  await requirePermission('bin:update')

  const { id } = await params

  const binLocation = await prisma.binLocation.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!binLocation) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <BinLocationForm
        mode="edit"
        initialData={{
          id: binLocation.id,
          warehouseId: binLocation.warehouseId,
          zoneId: binLocation.zoneId,
          locationCode: binLocation.locationCode,
          aisle: binLocation.aisle || '',
          rack: binLocation.rack || '',
          shelf: binLocation.shelf || '',
          bin: binLocation.bin || '',
          locationType: binLocation.locationType || '',
          isPickable: binLocation.isPickable,
          isReceivable: binLocation.isReceivable,
        }}
      />
    </div>
  )
}
