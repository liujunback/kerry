import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { prismaRead } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { JobTable } from '@/components/jobs/job-table'
import { JobFilter } from '@/components/jobs/job-filter'
import { PaginationState, SortingState } from '@tanstack/react-table'

interface PageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    search?: string
    jobType?: string
    status?: string
    sortBy?: string
    sortOrder?: string
  }>
}

const sortableFields = new Set([
  'jobNumber',
  'jobType',
  'jobName',
  'status',
  'progress',
  'createdAt',
])

export default async function JobsListPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('jobs')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('operationRules')),
    module: { label: t('title'), href: '/jobs' },
  })

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const page = Math.max(parseInt(params.page || '1', 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(params.pageSize || '10', 10) || 10, 1), 1000)
  const search = params.search || ''
  const jobType = params.jobType
  const status = params.status
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'
  const orderByField = sortableFields.has(sortBy) ? sortBy : 'createdAt'

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  }

  if (search) {
    where.OR = [
      { jobNumber: { contains: search } },
      { jobName: { contains: search } },
    ]
  }

  if (jobType) {
    where.jobType = jobType
  }

  if (status) {
    where.status = status
  }

  const total = await prismaRead.backgroundJob.count({ where })

  const jobsRaw = await prismaRead.backgroundJob.findMany({
    where,
    select: {
      id: true,
      jobNumber: true,
      jobType: true,
      jobSubType: true,
      jobName: true,
      description: true,
      status: true,
      progress: true,
      progressMessage: true,
      processedCount: true,
      totalCount: true,
      successCount: true,
      failedCount: true,
      errorMessage: true,
      resultFilePath: true,
      resultFileName: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
    orderBy: { [orderByField]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const jobs = jobsRaw.map((j) => ({
    ...j,
    createdAt: formatDateTime(j.createdAt),
    startedAt: j.startedAt ? formatDateTime(j.startedAt) : null,
    completedAt: j.completedAt ? formatDateTime(j.completedAt) : null,
  }))

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortableFields.has(sortBy)
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : [{ id: 'createdAt', desc: true }]

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-shrink-0 items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
      </div>

      <JobFilter />

      <JobTable
        jobs={jobs}
        total={total}
        pagination={pagination}
        sorting={sorting}
      />
    </div>
  )
}
