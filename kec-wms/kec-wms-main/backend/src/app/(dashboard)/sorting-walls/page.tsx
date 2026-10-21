import { SortingWallFilter } from '@/components/sorting-walls/sorting-wall-filter'
import { SortingWallTable } from '@/components/sorting-walls/sorting-wall-table'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    warehouseId?: string
    workstationCode?: string
    isActive?: string
    sortStatus?: string
  }>
}

export default async function SortingWallsPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('sortingWall')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/sorting-walls' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('sorting-wall:read')

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const pageSize = 10
  const search = params.search || ''
  const requestedWarehouseId = params.warehouseId
  const warehouseId = resolveScopedWarehouseId(session.user, requestedWarehouseId)
  const workstationCode = params.workstationCode
  const isActive = params.isActive
  const sortStatus = params.sortStatus

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  }

  if (search) {
    where.OR = [
      { wallCode: { contains: search } },
      { wallName: { contains: search } },
    ]
  }

  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  if (workstationCode) {
    where.workstationCode = { contains: workstationCode }
  }

  if (isActive === 'true') {
    where.isActive = true
  } else if (isActive === 'false') {
    where.isActive = false
  }

  if (sortStatus) {
    where.sortStatus = sortStatus
  }

  const total = await prisma.sortingWall.count({ where })

  const sortingWalls = await prisma.sortingWall.findMany({
    where,
    select: {
      id: true,
      wallCode: true,
      wallName: true,
      workstationCode: true,
      horizontalCells: true,
      verticalCells: true,
      totalCells: true,
      isActive: true,
      sortStatus: true,
      locationCode: true,
      remarks: true,
      createdAt: true,
      warehouse: {
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const totalPages = Math.ceil(total / pageSize)
  const buildPageHref = (targetPage: number) => {
    const query = new URLSearchParams()
    query.set('page', String(targetPage))
    if (search) query.set('search', search)
    if (requestedWarehouseId) query.set('warehouseId', requestedWarehouseId)
    if (workstationCode) query.set('workstationCode', workstationCode)
    if (isActive) query.set('isActive', isActive)
    if (sortStatus) query.set('sortStatus', sortStatus)
    return `/sorting-walls?${query.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <Link href="/sorting-walls/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </Link>
      </div>

      <SortingWallFilter />

      <SortingWallTable sortingWalls={sortingWalls as never[]} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={buildPageHref(page - 1)}>
                <Button variant="outline" size="sm">
                  上一页
                </Button>
              </Link>
            )}
            <span className="text-sm">
              {tCommon('page', { current: page, total: totalPages })}
            </span>
            {page < totalPages && (
              <Link href={buildPageHref(page + 1)}>
                <Button variant="outline" size="sm">
                  下一页
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
