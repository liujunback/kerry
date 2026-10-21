import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Pencil, Package } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkuStatusBadge } from '@/components/sku/sku-status-badge'
import { StorageConditionBadge } from '@/components/sku/storage-condition-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SkuDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('sku')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/sku' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const sku = await prisma.sku.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      client: {
        select: {
          id: true,
          clientCode: true,
          clientName: true,
        },
      },
      category: {
        select: {
          id: true,
          categoryCode: true,
          categoryName: true,
        },
      },
      uoms: {
        orderBy: { sortOrder: 'asc' },
      },
      barcodes: true,
      _count: {
        select: {
          inventoryBuckets: true,
        },
      },
    },
  })

  if (!sku) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Breadcrumb items={breadcrumb.current(sku.skuName)} />
          <SkuStatusBadge status={sku.status} />
          {!sku.isFirstReceiving && (
            <Badge variant="secondary">{t('received')}</Badge>
          )}
        </div>
        <Link href={`/sku/${id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              {sku.imageUrl ? (
                <img
                  src={sku.imageUrl}
                  alt={sku.skuName}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('code')}</p>
                  <p className="font-medium">{sku.skuCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('barcode')}</p>
                  <p className="font-medium">{sku.barcode || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('client')}</p>
                  <p className="font-medium">{sku.client.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('category')}</p>
                  <p className="font-medium">{sku.category?.categoryName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('unit')}</p>
                  <p className="font-medium">{sku.unit}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('managementSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('storageConditionLabel')}</p>
              {sku.storageCondition && (
                <StorageConditionBadge condition={sku.storageCondition} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {sku.isBatchManaged && <Badge variant="outline">{t('isBatchManaged')}</Badge>}
              {sku.isSerialManaged && <Badge variant="outline">{t('isSerialManaged')}</Badge>}
              {sku.isExpiryManaged && <Badge variant="outline">{t('isExpiryManaged')}</Badge>}
              {sku.isSelfPackaged && <Badge variant="outline">{t('isSelfPackaged')}</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('physicalAttributes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('lengthCm')}</p>
              <p className="font-medium">{sku.lengthCm?.toString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('widthCm')}</p>
              <p className="font-medium">{sku.widthCm?.toString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('heightCm')}</p>
              <p className="font-medium">{sku.heightCm?.toString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('volumeCbm')}</p>
              <p className="font-medium">{sku.volumeCbm?.toString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('weightKg')}</p>
              <p className="font-medium">{sku.weightKg?.toString() || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {sku.uoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('uoms')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sku.uoms.map((uom) => (
                <div key={uom.id} className="flex items-center gap-4 p-2 border rounded">
                  <span className="font-medium">{uom.uomCode}</span>
                  <span>{uom.uomName}</span>
                  <span className="text-muted-foreground">
                    1 {uom.uomCode} = {uom.conversionFactor.toString()} {sku.unit}
                  </span>
                  {uom.isBaseUom && <Badge>基本单位</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
