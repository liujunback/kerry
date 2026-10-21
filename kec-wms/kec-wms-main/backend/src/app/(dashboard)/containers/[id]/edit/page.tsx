import { ContainerForm } from '@/components/containers/container-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditContainerPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('containers')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/containers' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const container = await prisma.container.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      containerCode: true,
      containerType: true,
      usage: true,
      warehouseId: true,
      weightCapacityKg: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      remarks: true,
    },
  })

  if (!container) {
    notFound()
  }

  // 获取仓库列表
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: session.user.tenantId, status: 'ACTIVE' },
    select: { id: true, warehouseCode: true, warehouseName: true },
    orderBy: { warehouseName: 'asc' },
  })

  // 转换 Decimal 类型为 number
  const containerData = {
    ...container,
    weightCapacityKg: container.weightCapacityKg ? Number(container.weightCapacityKg) : null,
    lengthCm: container.lengthCm ? Number(container.lengthCm) : null,
    widthCm: container.widthCm ? Number(container.widthCm) : null,
    heightCm: container.heightCm ? Number(container.heightCm) : null,
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <div className="max-w-2xl">
        <ContainerForm container={containerData} warehouses={warehouses} mode="edit" />
      </div>
    </div>
  )
}
