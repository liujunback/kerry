import { ContainerForm } from '@/components/containers/container-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function CreateContainerPage() {
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

  // 获取仓库列表
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: session.user.tenantId, status: 'ACTIVE' },
    select: { id: true, warehouseCode: true, warehouseName: true },
    orderBy: { warehouseName: 'asc' },
  })

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('create'))} />
      <div className="max-w-2xl">
        <ContainerForm warehouses={warehouses} mode="create" />
      </div>
    </div>
  )
}
