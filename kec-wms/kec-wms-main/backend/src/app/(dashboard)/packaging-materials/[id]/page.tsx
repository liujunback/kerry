import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PackagingMaterialStatusBadge } from '@/components/packaging-materials/packaging-material-status-badge'
import { PackagingTypeBadge } from '@/components/packaging-materials/packaging-type-badge'
import { PackagingSourceBadge } from '@/components/packaging-materials/packaging-source-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PackagingMaterialDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterial')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [
      { label: tMenuGroup('outbound') },
      { label: tMenuGroup('packagingMaterial') },
    ],
    module: { label: t('title'), href: '/packaging-materials' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const material = await prisma.packagingMaterial.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      inventories: {
        select: {
          id: true,
          warehouseId: true,
          totalQuantity: true,
          availableQuantity: true,
          status: true,
        },
      },
    },
  })

  if (!material) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/packaging-materials/${id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('code')}</p>
                <p className="font-medium">{material.materialCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('name')}</p>
                <p className="font-medium">{material.materialName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('type')}</p>
                <PackagingTypeBadge type={material.materialType} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('source')}</p>
                <PackagingSourceBadge source={material.source} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
                <PackagingMaterialStatusBadge isActive={material.isActive} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('barcode')}</p>
                <p className="font-medium">{material.barcode || '-'}</p>
              </div>
            </div>
            {material.specification && (
              <div>
                <p className="text-sm text-muted-foreground">{t('specification')}</p>
                <p className="font-medium">{material.specification}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('physicalAttributes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('dimensions')}</p>
                <p className="font-medium">
                  {material.lengthCm && material.widthCm && material.heightCm
                    ? `${material.lengthCm}×${material.widthCm}×${material.heightCm} cm`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('weightKg')}</p>
                <p className="font-medium">
                  {material.weightKg ? `${material.weightKg} kg` : '-'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('maxLoadWeightKg')}</p>
                <p className="font-medium">
                  {material.maxLoadWeightKg ? `${material.maxLoadWeightKg} kg` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('unit')}</p>
                <p className="font-medium">{material.unit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('priceInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('unitPrice')}</p>
                <p className="font-medium">
                  {material.unitPrice
                    ? `${material.unitPrice} ${material.currency || 'CNY'}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('supplierName')}</p>
                <p className="font-medium">{material.supplierName || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('isReusable')}</p>
              <p className="font-medium">{material.isReusable ? tCommon('yes') : tCommon('no')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('inventoryInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            {material.inventories.length > 0 ? (
              <div className="space-y-2">
                {material.inventories.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{t('totalQuantity')}: {inv.totalQuantity}</span>
                    <span>{t('availableQuantity')}: {inv.availableQuantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('noInventory')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {material.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t('notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{material.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
