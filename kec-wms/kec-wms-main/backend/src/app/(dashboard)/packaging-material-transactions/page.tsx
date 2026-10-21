import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { TransactionTable } from '@/components/packaging-material-transactions/transaction-table'
import { TransactionFilter } from '@/components/packaging-material-transactions/transaction-filter'

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    transactionType?: string
    auditStatus?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function PackagingMaterialTransactionsPage({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterialTransaction')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }, { label: tMenuGroup('packagingMaterial') }],
    module: { label: t('title'), href: '/packaging-material-transactions' },
  })

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const pageSize = 20
  const search = params.search || ''
  const transactionType = params.transactionType
  const auditStatus = params.auditStatus
  const startDate = params.startDate
  const endDate = params.endDate

  const where: Record<string, unknown> = {
    tenantId: session.user.tenantId,
  }

  if (search) {
    where.OR = [
      { materialCode: { contains: search } },
      { materialName: { contains: search } },
      { referenceNumber: { contains: search } },
      { operatorName: { contains: search } },
    ]
  }

  if (transactionType) {
    where.transactionType = transactionType
  }

  if (auditStatus) {
    where.auditStatus = auditStatus
  }

  if (startDate || endDate) {
    where.operationTime = {}
    if (startDate) {
      (where.operationTime as Record<string, Date>).gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      ;(where.operationTime as Record<string, Date>).lte = end
    }
  }

  const total = await prisma.packagingMaterialTransaction.count({ where })

  const transactionsRaw = await prisma.packagingMaterialTransaction.findMany({
    where,
    select: {
      id: true,
      warehouseId: true,
      materialId: true,
      materialCode: true,
      materialName: true,
      transactionType: true,
      quantityChange: true,
      quantityBefore: true,
      quantityAfter: true,
      referenceType: true,
      referenceNumber: true,
      operatorId: true,
      operatorName: true,
      operationTime: true,
      auditStatus: true,
      notes: true,
    },
    orderBy: { operationTime: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const transactions = transactionsRaw.map((tx) => ({
    ...tx,
    operationTime: tx.operationTime as unknown as string, // timezone-extension 已将 Date 转换为字符串
  }))

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
      </div>

      <TransactionFilter />

      <TransactionTable transactions={transactions} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon('total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/packaging-material-transactions?page=${page - 1}&search=${search}`}>
                <Button variant="outline" size="sm">
                  上一页
                </Button>
              </Link>
            )}
            <span className="text-sm">
              {tCommon('page', { current: page, total: totalPages })}
            </span>
            {page < totalPages && (
              <Link href={`/packaging-material-transactions?page=${page + 1}&search=${search}`}>
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
