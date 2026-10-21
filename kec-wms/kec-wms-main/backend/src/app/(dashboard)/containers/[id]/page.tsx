import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { ContainerStatusBadge } from '@/components/containers/container-status-badge'
import { ContainerTypeBadge } from '@/components/containers/container-type-badge'
import { formatDate, formatDateTime } from '@/lib/utils/date-formatter'
import {
  UsageLabel,
} from '@/lib/validations/container'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContainerDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('containers')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/containers' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const container = await prisma.container.findFirst({
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
      containerItems: {
        include: {
          sku: {
            select: {
              skuCode: true,
              skuName: true,
              barcode: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!container) {
    notFound()
  }

  const formatDateOrNull = (date: Date | null) => {
    if (!date) return '-'
    return formatDateTime(date)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/containers/${id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('containerCode')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-mono font-bold">{container.containerCode}</p>
            </div>
            <div className="flex gap-2">
              <ContainerTypeBadge type={container.containerType} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('usage')}</p>
              <p>{UsageLabel[container.usage] || container.usage}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('enabledStatus')}</p>
              <ContainerStatusBadge
                enabledStatus={container.enabledStatus}
                workStatus={container.workStatus}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('warehouse')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('warehouse')}</p>
              <p>{container.warehouse?.warehouseName || '-'}</p>
              <p className="text-sm text-muted-foreground">
                {container.warehouse?.warehouseCode}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('lastOccupiedTime')}</p>
              <p>{formatDateOrNull(container.lastOccupiedTime) || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('physicalAttributes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('weightCapacityKg')}</p>
              <p>{container.weightCapacityKg ? `${container.weightCapacityKg} kg` : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dimensions')}</p>
              <p>
                {container.lengthCm && container.widthCm && container.heightCm
                  ? `${container.lengthCm} × ${container.widthCm} × ${container.heightCm} cm`
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('remarks')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{container.remarks || '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('systemInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('createdAt')}</p>
            <p>{formatDateOrNull(container.createdAt) || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{tCommon('updatedAt')}</p>
            <p>{formatDateOrNull(container.updatedAt) || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* 容器内货物信息 - 仅入库类型且有收货数据时显示 */}
      {container.usage === 'INBOUND' && container.containerItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('containerItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                      {t('skuCode')}
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                      {t('skuName')}
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                      {t('quantity')}
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                      {t('batchNumber')}
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                      {t('qualityType')}
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                      {t('expiryDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {container.containerItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 px-4 font-mono text-sm">{item.skuCode}</td>
                      <td className="py-2 px-4 text-sm">{item.skuName || '-'}</td>
                      <td className="py-2 px-4 text-sm">{item.quantity}</td>
                      <td className="py-2 px-4 text-sm font-mono">{item.batchNumber || '-'}</td>
                      <td className="py-2 px-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.qualityType === 'GOOD'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.qualityType === 'GOOD' ? t('good') : t('damaged')}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
