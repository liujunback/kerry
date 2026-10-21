import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { requirePermission } from '@/lib/auth/permissions'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { TenantTable } from '@/components/tenants/tenant-table'
import { TenantFilter } from '@/components/tenants/tenant-filter'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
  }>
}

export default async function TenantsPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('tenant')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/tenants' },
  })

  if (!session) {
    redirect('/login')
  }

  if (session.user.userType !== 'SYSTEM') {
    redirect('/forbidden')
  }

  await requirePermission('tenant:read')

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const pageSize = 10
  const search = params.search || ''
  const status = params.status

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { tenantCode: { contains: search } },
      { tenantName: { contains: search } },
      { contactPerson: { contains: search } },
    ]
  }

  if (status) {
    where.status = status
  }

  const total = await prisma.tenant.count({ where })

  const tenantsRaw = await prisma.tenant.findMany({
    where,
    select: {
      id: true,
      tenantCode: true,
      tenantName: true,
      contactPerson: true,
      contactPhone: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          warehouses: true,
          clients: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const tenants = tenantsRaw.map((tenant) => ({
    ...tenant,
    createdAt: tenant.createdAt as unknown as string,
  }))

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <Link href="/tenants/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </Link>
      </div>

      <TenantFilter />

      <TenantTable tenants={tenants} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/tenants?page=${page - 1}&search=${search}`}>
                <Button variant="outline" size="sm">
                  上一页
                </Button>
              </Link>
            )}
            <span className="text-sm">
              {tCommon('page', { current: page, total: totalPages })}
            </span>
            {page < totalPages && (
              <Link href={`/tenants?page=${page + 1}&search=${search}`}>
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
