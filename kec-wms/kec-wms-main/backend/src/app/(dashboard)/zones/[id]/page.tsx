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
import { ZoneStatusBadge } from '@/components/zones/zone-status-badge'
import { ZoneTypeBadge } from '@/components/zones/zone-type-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ZoneDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('zone')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/zones' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('zone:read')

  const { id } = await params

  const zone = await prisma.zone.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      warehouse: {
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      },
      binLocations: {
        select: {
          id: true,
          locationCode: true,
          locationType: true,
          lockStatus: true,
          isPickable: true,
          isReceivable: true,
          status: true,
        },
        take: 20,
        orderBy: { locationCode: 'asc' },
      },
      _count: {
        select: { binLocations: true },
      },
    },
  })

  if (!zone) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/zones/${id}/edit`}>
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
                <p className="font-medium">{zone.zoneCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('name')}</p>
                <p className="font-medium">{zone.zoneName || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('type')}</p>
                <ZoneTypeBadge type={zone.zoneType} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
                <ZoneStatusBadge status={zone.status} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('warehouse')}</p>
              <Link href={`/warehouses/${zone.warehouse.id}`} className="text-primary hover:underline">
                {zone.warehouse.warehouseName}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('qualityType')}</p>
                <p className="font-medium">{t(`qualityTypes.${zone.qualityType}` as 'qualityTypes.GOOD')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('capacity')}</p>
                <p className="font-medium">
                  {zone.capacityUnits ? `${zone.currentUnits}/${zone.capacityUnits}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('statistics')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('bins')}</p>
              <p className="text-2xl font-bold">{zone._count.binLocations}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('binList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {zone.binLocations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{tCommon('noData')}</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {zone.binLocations.map((bin) => (
                <Link
                  key={bin.id}
                  href={`/bin-locations/${bin.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{bin.locationCode}</p>
                    <p className="text-sm text-muted-foreground">{bin.locationType || '-'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {zone._count.binLocations > 20 && (
            <div className="mt-4 text-center">
              <Link href={`/bin-locations?zoneId=${zone.id}`}>
                <Button variant="outline">{t('viewAllBins')}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
