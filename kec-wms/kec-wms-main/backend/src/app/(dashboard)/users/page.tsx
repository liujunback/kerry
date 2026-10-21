import { ListContextLink } from '@/components/navigation/list-context-link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { UserFilter } from '@/components/users/user-filter'
import { UserTable } from '@/components/users/user-table'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { PaginationState,SortingState } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
interface PageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    search?: string
    status?: string
    userType?: string
    sortBy?: string
    sortOrder?: string
  }>
}

const sortableFields = new Set([
  'username',
  'fullName',
  'department',
  'userType',
  'status',
  'lastLoginAt',
  'createdAt',
])

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('users')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/users' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('user:read')

  const params = await searchParams
  const currentListParams = new URLSearchParams()
  if (params.page) currentListParams.set('page', params.page)
  if (params.pageSize) currentListParams.set('pageSize', params.pageSize)
  if (params.search) currentListParams.set('search', params.search)
  if (params.status) currentListParams.set('status', params.status)
  if (params.userType) currentListParams.set('userType', params.userType)
  if (params.sortBy) currentListParams.set('sortBy', params.sortBy)
  if (params.sortOrder) currentListParams.set('sortOrder', params.sortOrder)
  const currentListUrl = currentListParams.toString() ? `/users?${currentListParams.toString()}` : '/users'
  const page = Math.max(parseInt(params.page || '1', 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(params.pageSize || '10', 10) || 10, 1), 1000)
  const search = params.search || ''
  const status = params.status
  const userType = params.userType
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'
  const orderByField = sortableFields.has(sortBy) ? sortBy : 'createdAt'

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  }

  if (search) {
    where.OR = [
      { username: { contains: search } },
      { fullName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { employeeId: { contains: search } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (userType) {
    where.userType = userType
  }

  const total = await prisma.user.count({ where })

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      employeeId: true,
      department: true,
      userType: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      userWarehouses: {
        where: { isActive: true },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' },
        ],
        select: {
          warehouseId: true,
          isDefault: true,
          warehouse: {
            select: {
              warehouseCode: true,
              warehouseName: true,
            },
          },
        },
      },
      userRoles: {
        where: { isActive: true },
        select: {
          role: {
            select: {
              id: true,
              roleCode: true,
              roleName: true,
            },
          },
          scopeType: true,
        },
      },
    },
    orderBy: { [orderByField]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortableFields.has(sortBy) && sortBy !== 'createdAt'
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <ListContextLink context="users" contextUrl={currentListUrl} href="/users/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </ListContextLink>
      </div>

      <UserFilter />

      <div className="flex-1 min-h-0">
        <UserTable
          users={users}
          total={total}
          pagination={pagination}
          sorting={sorting}
        />
      </div>
    </div>
  )
}
