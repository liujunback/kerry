import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { SortingWallDetail } from '@/components/sorting-walls/sorting-wall-detail'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SortingWallDetailPage({ params }: PageProps) {
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

  await requirePermission('sorting-wall:read')

  const { id } = await params

  const [sortingWall, allocations] = await Promise.all([
    prisma.sortingWall.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        warehouse: {
          select: { id: true, warehouseCode: true, warehouseName: true },
        },
        cells: {
          orderBy: [{ rowNumber: 'asc' }, { columnNumber: 'asc' }],
        },
      },
    }),
    prisma.sortingCellAllocation.findMany({
      where: {
        sortingWallId: id,
        tenantId: session.user.tenantId,
        status: { not: 'RELEASED' },  // 不显示已释放的分配记录
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            referenceNumber: true,
          },
        },
        sortingTask: {
          select: { id: true, taskNumber: true, status: true },
        },
      },
      orderBy: { allocatedAt: 'desc' },
    }),
  ])

  if (!sortingWall) {
    notFound()
  }

  // 查询每个分配记录对应的 SKU 明细
  const taskIds = [...new Set(allocations.map((a) => a.sortingTaskId))]
  const taskLines = taskIds.length > 0
    ? await prisma.sortingTaskLine.findMany({
        where: {
          sortingTaskId: { in: taskIds },
          tenantId: session.user.tenantId,
        },
        include: {
          sku: {
            select: { id: true, skuCode: true, skuName: true },
          },
        },
      })
    : []

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('detail'))} />

      <SortingWallDetail
        sortingWall={sortingWall as never}
        allocations={allocations as never[]}
        taskLines={taskLines as never[]}
      />
    </div>
  )
}
