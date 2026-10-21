import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { BinLocationStatusBadge } from '@/components/bin-locations/bin-location-status-badge'
import { BinLocationLockBadge } from '@/components/bin-locations/bin-location-lock-badge'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BinLocationDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('binLocation')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/bin-locations' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('bin:read')

  const { id } = await params

  const binLocation = await prisma.binLocation.findFirst({
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
      zone: {
        select: {
          id: true,
          zoneCode: true,
          zoneName: true,
          zoneType: true,
        },
      },
    },
  })

  if (!binLocation) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/bin-locations/${id}/edit`}>
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
                <p className="font-medium">{binLocation.locationCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('type')}</p>
                <p className="font-medium">{binLocation.locationType || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
                <BinLocationStatusBadge status={binLocation.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('lock')}</p>
                <BinLocationLockBadge lockStatus={binLocation.lockStatus} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('warehouse')}</p>
              <Link href={`/warehouses/${binLocation.warehouse.id}`} className="text-primary hover:underline">
                {binLocation.warehouse.warehouseName}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('zone')}</p>
              <Link href={`/zones/${binLocation.zone.id}`} className="text-primary hover:underline">
                {binLocation.zone.zoneCode} - {binLocation.zone.zoneName || binLocation.zone.zoneType}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('locationInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('aisle')}</p>
                <p className="font-medium">{binLocation.aisle || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('rack')}</p>
                <p className="font-medium">{binLocation.rack || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('shelf')}</p>
                <p className="font-medium">{binLocation.shelf || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('bin')}</p>
                <p className="font-medium">{binLocation.bin || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('flags')}</p>
              <div className="flex gap-2 mt-1">
                {binLocation.isPickable && <Badge>{t('isPickable')}</Badge>}
                {binLocation.isReceivable && <Badge>{t('isReceivable')}</Badge>}
                {!binLocation.isPickable && !binLocation.isReceivable && <span>-</span>}
              </div>
            </div>
            {binLocation.lastCountedAt && (
              <div>
                <p className="text-sm text-muted-foreground">{t('lastCountedAt')}</p>
                <p className="font-medium">{formatDateTime(binLocation.lastCountedAt) || '-'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
