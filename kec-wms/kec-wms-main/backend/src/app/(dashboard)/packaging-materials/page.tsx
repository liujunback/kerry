import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PackagingMaterialTable } from '@/components/packaging-materials/packaging-material-table'
import { PackagingMaterialFilter } from '@/components/packaging-materials/packaging-material-filter'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    materialType?: string
    source?: string
    isActive?: string
  }>
}

export default async function PackagingMaterialsPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterial')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }, { label: tMenuGroup('packagingMaterial') }],
    module: { label: t('title'), href: '/packaging-materials' },
  })

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const pageSize = 10
  const search = params.search || ''
  const materialType = params.materialType
  const source = params.source
  const isActive = params.isActive

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  }

  if (search) {
    where.OR = [
      { materialCode: { contains: search } },
      { materialName: { contains: search } },
      { barcode: { contains: search } },
      { specification: { contains: search } },
    ]
  }

  if (materialType) {
    where.materialType = materialType
  }

  if (source) {
    where.source = source
  }

  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true'
  }

  const total = await prisma.packagingMaterial.count({ where })

  const materialsRaw = await prisma.packagingMaterial.findMany({
    where,
    select: {
      id: true,
      materialCode: true,
      materialName: true,
      materialType: true,
      specification: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      weightKg: true,
      unit: true,
      unitPrice: true,
      currency: true,
      barcode: true,
      source: true,
      isReusable: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const materials = materialsRaw.map((m) => ({
    ...m,
    lengthCm: m.lengthCm ? Number(m.lengthCm) : null,
    widthCm: m.widthCm ? Number(m.widthCm) : null,
    heightCm: m.heightCm ? Number(m.heightCm) : null,
    weightKg: m.weightKg ? Number(m.weightKg) : null,
    unitPrice: m.unitPrice ? Number(m.unitPrice) : null,
    createdAt: m.createdAt as unknown as string, // timezone-extension 已将 Date 转换为字符串
  }))

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <Link href="/packaging-materials/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </Link>
      </div>

      <PackagingMaterialFilter />

      <PackagingMaterialTable materials={materials} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/packaging-materials?page=${page - 1}&search=${search}`}>
                <Button variant="outline" size="sm">
                  上一页
                </Button>
              </Link>
            )}
            <span className="text-sm">
              {tCommon('page', { current: page, total: totalPages })}
            </span>
            {page < totalPages && (
              <Link href={`/packaging-materials?page=${page + 1}&search=${search}`}>
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
