import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Pencil } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientStatusBadge } from '@/components/clients/client-status-badge'
import { ClientTypeBadge } from '@/components/clients/client-type-badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('client')
  const tCommon = await getTranslations('common')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/clients' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const client = await prisma.client.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      clientWarehouses: {
        where: { isActive: true },
        include: {
          warehouse: {
            select: {
              id: true,
              warehouseCode: true,
              warehouseName: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: {
          inventoryBuckets: true,
        },
      },
    },
  })

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <Link href={`/clients/${id}/edit`}>
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
                <p className="font-medium">{client.clientCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('name')}</p>
                <p className="font-medium">{client.clientName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('shortName')}</p>
                <p className="font-medium">{client.shortName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('type')}</p>
                <ClientTypeBadge type={client.clientType} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('statusLabel')}</p>
              <ClientStatusBadge isActive={client.isActive} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('contactPerson')}</p>
                <p className="font-medium">{client.contactPerson || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('contactPhone')}</p>
                <p className="font-medium">{client.contactPhone || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('contactEmail')}</p>
              <p className="font-medium">{client.contactEmail || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('address')}</p>
              <p className="font-medium">{client.address || '-'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('city')}</p>
                <p className="font-medium">{client.city || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('province')}</p>
                <p className="font-medium">{client.province || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('country')}</p>
                <p className="font-medium">{client.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('financialInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('taxNumber')}</p>
                <p className="font-medium">{client.taxNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('bankName')}</p>
                <p className="font-medium">{client.bankName || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('bankAccount')}</p>
                <p className="font-medium">{client.bankAccount || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('creditLimit')}</p>
                <p className="font-medium">{client.creditLimit != null ? client.creditLimit.toString() : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('paymentTerms')}</p>
                <p className="font-medium">{client.paymentTerms} {t('days')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('warehouses')}</CardTitle>
          </CardHeader>
          <CardContent>
            {client.clientWarehouses.length === 0 ? (
              <p className="text-muted-foreground">{tCommon('noData')}</p>
            ) : (
              <div className="space-y-2">
                {client.clientWarehouses.map((cw) => (
                  <div key={cw.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{cw.warehouse.warehouseName}</p>
                      <p className="text-sm text-muted-foreground">{cw.warehouse.warehouseCode}</p>
                    </div>
                    {cw.isDefault && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        {t('default')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t('notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

