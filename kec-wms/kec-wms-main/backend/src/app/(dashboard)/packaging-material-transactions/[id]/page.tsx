import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransactionTypeBadge } from '@/components/packaging-material-transactions/transaction-type-badge'
import { AuditStatusBadge } from '@/components/packaging-material-transactions/audit-status-badge'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterialTransaction')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }, { label: tMenuGroup('packagingMaterial') }],
    module: { label: t('title'), href: '/packaging-material-transactions' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const transaction = await prisma.packagingMaterialTransaction.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      material: {
        select: {
          id: true,
          materialCode: true,
          materialName: true,
          materialType: true,
          specification: true,
          unit: true,
        },
      },
    },
  })

  if (!transaction) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return formatDateTime(date)
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('detail'))} />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('materialInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('materialCode')}</p>
                <p className="font-medium">{transaction.materialCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('materialName')}</p>
                <p className="font-medium">{transaction.materialName}</p>
              </div>
            </div>
            {transaction.material && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('materialType')}</p>
                  <p className="font-medium">{transaction.material.materialType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('specification')}</p>
                  <p className="font-medium">{transaction.material.specification || '-'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('transactionInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('transactionType')}</p>
                <TransactionTypeBadge type={transaction.transactionType} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('auditStatusLabel')}</p>
                <AuditStatusBadge status={transaction.auditStatus} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('quantityBefore')}</p>
                <p className="font-medium">{transaction.quantityBefore}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('quantityChange')}</p>
                <p className={`text-xl font-bold ${transaction.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.quantityChange > 0 ? '+' : ''}{transaction.quantityChange}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('quantityAfter')}</p>
                <p className="font-medium">{transaction.quantityAfter}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('referenceInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('referenceType')}</p>
                <p className="font-medium">{transaction.referenceType || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('referenceNumber')}</p>
                <p className="font-medium">{transaction.referenceNumber || '-'}</p>
              </div>
            </div>
            {transaction.batchNumber && (
              <div>
                <p className="text-sm text-muted-foreground">{t('batchNumber')}</p>
                <p className="font-medium">{transaction.batchNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('operationInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('operatorName')}</p>
                <p className="font-medium">{transaction.operatorName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('operationTime')}</p>
                <p className="font-medium">{formatDate(transaction.operationTime) || '-'}</p>
              </div>
            </div>
            {transaction.auditedAt && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('auditedAt')}</p>
                  <p className="font-medium">{formatDate(transaction.auditedAt) || '-'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {transaction.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t('notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{transaction.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
