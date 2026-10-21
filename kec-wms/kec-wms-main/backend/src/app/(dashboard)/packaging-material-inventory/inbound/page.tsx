import { InboundForm } from '@/components/packaging-material-inventory/inbound-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function InboundPage() {
  const session = await auth()
  const t = await getTranslations('packagingMaterialInventory')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }, { label: tMenuGroup('packagingMaterial') }],
    module: { label: t('title'), href: '/packaging-material-inventory' },
  })

  if (!session) {
    redirect('/login')
  }

  // 获取可用的包材列表
  const materials = await prisma.packagingMaterial.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
    },
    select: {
      id: true,
      materialCode: true,
      materialName: true,
    },
    orderBy: { materialCode: 'asc' },
  })

  // 获取仓库列表
  const warehouses = await prisma.warehouse.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      warehouseCode: true,
      warehouseName: true,
    },
    orderBy: { warehouseCode: 'asc' },
  })

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('inbound'))} />
      <InboundForm materials={materials} warehouses={warehouses} />
    </div>
  )
}
