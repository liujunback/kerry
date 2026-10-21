import { Breadcrumb } from '@/components/ui/breadcrumb'
import { WarehouseForm } from '@/components/warehouses/warehouse-form'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditWarehousePage({ params }: PageProps) {
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

  await requirePermission('warehouse:update')

  const { id } = await params

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!warehouse) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <WarehouseForm
        mode="edit"
        initialData={{
          id: warehouse.id,
          warehouseCode: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
          warehouseType: warehouse.warehouseType,
          address: warehouse.address || '',
          city: warehouse.city || '',
          country: warehouse.country || '',
          zipCode: warehouse.zipCode || '',
          region: warehouse.region || '',
          warehouseArea: warehouse.warehouseArea?.toString() || '',
          contactName: warehouse.contactName || '',
          contactPhone: warehouse.contactPhone || '',
          contactEmail: warehouse.contactEmail || '',
        }}
      />
    </div>
  )
}
