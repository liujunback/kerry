import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InventoryStatusBadge } from '@/components/packaging-material-inventory/inventory-status-badge'
import { formatDate } from '@/lib/utils/date-formatter'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InventoryDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterialInventory')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }, { label: tMenuGroup('packagingMaterial') }],
    module: { label: t('title'), href: '/packaging-material-inventory' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const inventory = await prisma.packagingMaterialInventory.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      material: true,
    },
  })

  if (!inventory) {
    notFound()
  }

  // 获取最近10条流水
  const recentTransactions = await prisma.packagingMaterialTransaction.findMany({
    where: {
      materialId: inventory.materialId,
      warehouseId: inventory.warehouseId,
    },
    orderBy: { operationTime: 'desc' },
    take: 10,
    select: {
      id: true,
      transactionType: true,
      quantityChange: true,
      quantityAfter: true,
      referenceNumber: true,
      operatorName: true,
      operationTime: true,
    },
  })

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
                <p className="font-medium">{inventory.materialCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('materialName')}</p>
                <p className="font-medium">{inventory.materialName}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
              <InventoryStatusBadge status={inventory.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('quantityInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalQuantity')}</p>
                <p className="text-2xl font-bold">{inventory.totalQuantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('availableQuantity')}</p>
                <p className="text-2xl font-bold text-green-600">{inventory.availableQuantity}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('allocatedQuantity')}</p>
                <p className="font-medium">{inventory.allocatedQuantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('onOrderQuantity')}</p>
                <p className="font-medium">{inventory.onOrderQuantity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('stockSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('safetyStock')}</p>
                <p className="font-medium">{inventory.safetyStock}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('minimumStock')}</p>
                <p className="font-medium">{inventory.minimumStock}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('maximumStock')}</p>
                <p className="font-medium">{inventory.maximumStock || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('recentTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                    <span className={tx.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}>
                      {tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange}
                    </span>
                    <span>{tx.transactionType}</span>
                    <span className="text-muted-foreground">
                      {formatDate(tx.operationTime) || '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('noTransactions')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
