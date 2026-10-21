import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { parseISO, addHours } from '@/lib/utils/date-formatter'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AsnStatusBadge } from '@/components/asn/asn-status-badge'
import { AsnLineTable } from '@/components/asn/asn-line-table'
import { AsnSkuSummaryTable } from '@/components/asn/asn-sku-summary-table'
import { AsnCartonSummaryTable } from '@/components/asn/asn-carton-summary-table'
import { AsnReceivingDetailTable } from '@/components/asn/asn-receiving-detail-table'
import { ReceivingBatchTable } from '@/components/asn/receiving-batch-table'
import { AsnOperationLogTable } from '@/components/asn/asn-operation-log-table'
import { AsnSerialNumberTable } from '@/components/asn/asn-serial-number-table'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AsnDetailPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('asn')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inbound') }],
    module: { label: t('title'), href: '/asn' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const asn = await prisma.asn.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      asnNumber: true,
      externalNumber: true,
      asnType: true,
      status: true,
      expectedArrivalDate: true,
      actualArrivalAt: true,
      receivingStartAt: true,
      receivingEndAt: true,
      putawayEndAt: true,
      signedAt: true,
      totalExpectedQty: true,
      totalReceivedQty: true,
      totalPutawayQty: true,
      notes: true,
      client: {
        select: {
          clientCode: true,
          clientName: true,
        },
      },
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
  })

  if (!asn) {
    notFound()
  }

  // 目标上架时间 = 收货开始时间 + 48小时
  const getExpectedPutawayDate = () => {
    if (!asn.receivingStartAt) return '-'
    // receivingStartAt 经过时区扩展后是字符串格式
    const startDate = typeof asn.receivingStartAt === 'string'
      ? parseISO(asn.receivingStartAt)
      : asn.receivingStartAt
    const expectedDate = addHours(startDate, 48)
    return formatDateTime(expectedDate)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Breadcrumb items={breadcrumb.current(t('detail'))} />
        </div>
      </div>

      {/* 基本信息卡片 - Tab外部 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 第一行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('asnNumber')}</p>
              <p className="font-medium">{asn.asnNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('status')}</p>
              <AsnStatusBadge status={asn.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('externalNumber')}</p>
              <p className="font-medium">{asn.externalNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('client')}</p>
              <p className="font-medium">{asn.client?.clientCode || '-'}</p>
            </div>
          </div>
          {/* 第二行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('detailInfo.signedAt')}</p>
              <p className="font-medium">{asn.signedAt ? formatDateTime(asn.signedAt as any) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('detailInfo.receivingEndAt')}</p>
              <p className="font-medium">{asn.receivingEndAt ? formatDateTime(asn.receivingEndAt as any) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('detailInfo.expectedPutawayDate')}</p>
              <p className="font-medium">{getExpectedPutawayDate()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('detailInfo.putawayEndAt')}</p>
              <p className="font-medium">{asn.putawayEndAt ? formatDateTime(asn.putawayEndAt as any) : '-'}</p>
            </div>
          </div>
          {/* 第三行 - 仓库备注 */}
          {asn.notes && (
            <div>
              <p className="text-sm text-muted-foreground">{t('detailInfo.warehouseNotes')}</p>
              <p className="font-medium">{asn.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6个Tab */}
      <Tabs defaultValue="lines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lines">{t('tabs.lines')}</TabsTrigger>
          <TabsTrigger value="skuSummary">{t('tabs.skuSummary')}</TabsTrigger>
          <TabsTrigger value="cartonSummary">{t('tabs.cartonSummary')}</TabsTrigger>
          <TabsTrigger value="receivingDetails">{t('tabs.receivingDetails')}</TabsTrigger>
          <TabsTrigger value="receivingBatch">{t('tabs.receivingBatchInventory')}</TabsTrigger>
          <TabsTrigger value="logs">{t('tabs.logs')}</TabsTrigger>
          <TabsTrigger value="serialNumbers">{t('tabs.serialNumbers')}</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <AsnLineTable asnId={id} asnStatus={asn.status} />
        </TabsContent>

        <TabsContent value="skuSummary">
          <AsnSkuSummaryTable asnId={id} asnStatus={asn.status} />
        </TabsContent>

        <TabsContent value="cartonSummary">
          <AsnCartonSummaryTable asnId={id} />
        </TabsContent>

        <TabsContent value="receivingDetails">
          <AsnReceivingDetailTable asnId={id} />
        </TabsContent>

        <TabsContent value="receivingBatch">
          <ReceivingBatchTable asnId={id} />
        </TabsContent>

        <TabsContent value="logs">
          <AsnOperationLogTable asnId={id} />
        </TabsContent>

        <TabsContent value="serialNumbers">
          <AsnSerialNumberTable asnId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
