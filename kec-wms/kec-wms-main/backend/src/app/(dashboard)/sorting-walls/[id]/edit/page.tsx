import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { SortingWallForm } from '@/components/sorting-walls/sorting-wall-form'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditSortingWallPage({ params }: PageProps) {
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

  await requirePermission('sorting-wall:update')

  const { id } = await params

  // Fetch the sorting wall
  const sortingWall = await prisma.sortingWall.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      wallCode: true,
      wallName: true,
      workstationCode: true,
      horizontalCells: true,
      verticalCells: true,
      totalCells: true,
      locationCode: true,
      remarks: true,
      isActive: true,
      sortStatus: true,
      warehouseId: true,
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
  })

  if (!sortingWall) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <SortingWallForm
        mode="edit"
        warehouseLabel={`${sortingWall.warehouse.warehouseName} (${sortingWall.warehouse.warehouseCode})`}
        initialData={{
          ...sortingWall,
          remarks: sortingWall.remarks ?? undefined,
          workstationCode: sortingWall.workstationCode ?? undefined,
        }}
      />
    </div>
  )
}
