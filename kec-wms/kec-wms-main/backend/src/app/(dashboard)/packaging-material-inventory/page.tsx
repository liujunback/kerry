import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { InventoryTable } from '@/components/packaging-material-inventory/inventory-table'
import { InventoryFilter } from '@/components/packaging-material-inventory/inventory-filter'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    warehouseId?: string
  }>
}

export default async function PackagingMaterialInventoryPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterialInventory')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }, { label: tMenuGroup('packagingMaterial') }],
    module: { label: t('title'), href: '/packaging-material-inventory' },
  })

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const pageSize = 10
  const search = params.search || ''
  const status = params.status
  const warehouseId = params.warehouseId

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  }

  if (search) {
    where.OR = [
      { materialCode: { contains: search } },
      { materialName: { contains: search } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  const total = await prisma.packagingMaterialInventory.count({ where })

  const inventoriesRaw = await prisma.packagingMaterialInventory.findMany({
    where,
    select: {
      id: true,
      warehouseId: true,
      materialId: true,
      materialCode: true,
      materialName: true,
      totalQuantity: true,
      availableQuantity: true,
      allocatedQuantity: true,
      safetyStock: true,
      minimumStock: true,
      maximumStock: true,
      unit: true,
      status: true,
      lastMovementAt: true,
      material: {
        select: {
          materialType: true,
          unitPrice: true,
          currency: true,
        },
      },
    },
    orderBy: { materialCode: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const inventories = inventoriesRaw.map((inv) => ({
    ...inv,
    lastMovementAt: inv.lastMovementAt as unknown as string | null, // timezone-extension 已将 Date 转换为字符串
    material: inv.material ? {
      ...inv.material,
      unitPrice: inv.material.unitPrice ? Number(inv.material.unitPrice) : null,
    } : undefined,
  }))

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex gap-2">
          <Link href="/packaging-material-inventory/inbound">
            <Button>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              {t('inbound')}
            </Button>
          </Link>
          <Link href="/packaging-material-inventory/outbound">
            <Button variant="outline">
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              {t('outbound')}
            </Button>
          </Link>
        </div>
      </div>

      <InventoryFilter />

      <InventoryTable inventories={inventories} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/packaging-material-inventory?page=${page - 1}&search=${search}`}>
                <Button variant="outline" size="sm">
                  上一页
                </Button>
              </Link>
            )}
            <span className="text-sm">
              {tCommon('page', { current: page, total: totalPages })}
            </span>
            {page < totalPages && (
              <Link href={`/packaging-material-inventory?page=${page + 1}&search=${search}`}>
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
