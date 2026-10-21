import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { WarehouseStatusBadge } from '@/components/warehouses/warehouse-status-badge'
import { WarehouseTypeBadge } from '@/components/warehouses/warehouse-type-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WarehouseDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('warehouse')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/warehouses' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('warehouse:read')

  const { id } = await params

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      zones: {
        select: {
          id: true,
          zoneCode: true,
          zoneName: true,
          zoneType: true,
          status: true,
          _count: {
            select: { binLocations: true },
          },
        },
        orderBy: { zoneCode: 'asc' },
      },
      _count: {
        select: {
          zones: true,
          binLocations: true,
        },
      },
    },
  })

  if (!warehouse) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/warehouses/${id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('code')}</p>
                <p className="font-medium">{warehouse.warehouseCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('name')}</p>
                <p className="font-medium">{warehouse.warehouseName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('type')}</p>
                <WarehouseTypeBadge type={warehouse.warehouseType} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
                <WarehouseStatusBadge status={warehouse.status} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('address')}</p>
              <p className="font-medium">{warehouse.address || '-'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('city')}</p>
                <p className="font-medium">{warehouse.city || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('country')}</p>
                <p className="font-medium">{warehouse.country || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('region')}</p>
                <p className="font-medium">{warehouse.region || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('statistics')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('zones')}</p>
                <p className="text-2xl font-bold">{warehouse._count.zones}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('bins')}</p>
                <p className="text-2xl font-bold">{warehouse._count.binLocations}</p>
              </div>
            </div>
            {warehouse.warehouseArea && (
              <div>
                <p className="text-sm text-muted-foreground">{t('area')}</p>
                <p className="font-medium">{warehouse.warehouseArea.toString()} m²</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('zoneList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {warehouse.zones.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{tCommon('noData')}</p>
          ) : (
            <div className="grid gap-2">
              {warehouse.zones.map((zone) => (
                <Link
                  key={zone.id}
                  href={`/zones/${zone.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{zone.zoneCode}</p>
                    <p className="text-sm text-muted-foreground">{zone.zoneName || zone.zoneType}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {zone._count.binLocations} {t('bins')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
