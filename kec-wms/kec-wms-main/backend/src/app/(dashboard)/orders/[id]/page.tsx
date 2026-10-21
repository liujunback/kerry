import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { OrderDetailInterceptionAction } from '@/components/orders/order-detail-interception-action'
import { OrderSkuTable } from '@/components/orders/order-sku-table'
import { OrderShipmentTable } from '@/components/orders/order-shipment-table'
import { OrderOperationLogTable } from '@/components/orders/order-operation-log-table'
import { OrderAddressInfo } from '@/components/orders/order-address-info'
import { OrderSerialNumberTable } from '@/components/orders/order-serial-number-table'
import { OrderInventoryTransactionTable } from '@/components/orders/order-inventory-transaction-table'
import { OrderPackingVideoTable } from '@/components/orders/order-packing-video-table'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-500 text-white',
  PENDING: 'bg-yellow-500 text-white',
  ALLOCATED: 'bg-blue-500 text-white',
  PENDING_WAVE: 'bg-cyan-500 text-white',
  IN_WAVE: 'bg-cyan-600 text-white',
  WAVED: 'bg-indigo-500 text-white',
  PICKING: 'bg-purple-500 text-white',
  PICKED: 'bg-indigo-500 text-white',
  SORTING: 'bg-orange-500 text-white',
  SORTED: 'bg-orange-600 text-white',
  PACKING: 'bg-pink-500 text-white',
  PACKED: 'bg-cyan-500 text-white',
  READY_SHIP: 'bg-orange-500 text-white',
  SHIPPED: 'bg-green-500 text-white',
  DELIVERED: 'bg-green-600 text-white',
  CANCELLED: 'bg-red-500 text-white',
  ON_HOLD: 'bg-gray-600 text-white',
  EXCEPTION: 'bg-red-600 text-white',
}

const statusLabels: Record<string, string> = {
  CREATED: '已创建',
  PENDING: '待处理',
  ALLOCATED: '已分配',
  PENDING_WAVE: '待加波',
  IN_WAVE: '已加波',
  WAVED: '波次释放',
  PICKING: '拣货中',
  PICKED: '已拣货',
  SORTING: '分拣中',
  SORTED: '已分拣',
  PACKING: '打包中',
  PACKED: '已打包',
  READY_SHIP: '待发货',
  SHIPPED: '已发货',
  DELIVERED: '已送达',
  CANCELLED: '已取消',
  ON_HOLD: '暂停',
  EXCEPTION: '异常',
}

const orderBusinessTypeLabels: Record<string, string> = {
  STANDARD: '标准出库',
  RETURN_WAREHOUSE: '退仓出库',
  SCRAP: '下架销毁',
  OTHER: '其他出库',
}

const orderTypeLabels: Record<string, string> = {
  SINGLE_ITEM_SINGLE: '单品单件',
  SINGLE_ITEM_MULTI: '单品多件',
  MULTI_ITEM: '多品',
}

const orderSourceLabels: Record<string, string> = {
  MANUAL: '手工创建',
  API: 'API导入',
  IMPORT: '批量导入',
  PLATFORM: '平台同步',
}

const numberChangeStatusLabels: Record<string, string> = {
  NONE: '不换号',
  SUCCESS: '换号成功',
  FAILED: '换号失败',
}

const interceptionStatusColors: Record<string, string> = {
  NOT_INTERCEPTED: 'bg-gray-100 text-gray-800',
  PENDING_INTERCEPTION: 'bg-yellow-100 text-yellow-800',
  INTERCEPTED: 'bg-red-100 text-red-800',
}

const interceptionStatusLabels: Record<string, string> = {
  NOT_INTERCEPTED: '未拦截',
  PENDING_INTERCEPTION: '待拦截',
  INTERCEPTED: '已拦截',
}

const interceptionSourceLabels: Record<string, string> = {
  FOMS_CANCEL: 'FOMS取消',
  MANUAL: '人工拦截',
}

const handlingActionLabels: Record<string, string> = {
  WAIT: '等待',
  RESTOCK: '回库',
}

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await auth()
  const tMenuGroup = await getTranslations('menuGroup')
  const t = await getTranslations('outbound.order')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('outbound') }],
    module: { label: t('title'), href: '/orders' },
  })

  if (!session) {
    redirect('/login')
  }

  await requirePermission('order:read')

  const { id } = await params

  const order = await prisma.outboundOrder.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      orderNumber: true,
      referenceNumber: true,
      platformOrderId: true,
      platform: true,
      orderSource: true,
      orderBusinessType: true,
      orderType: true,
      status: true,
      trackingNumber: true,
      numberChangeStatus: true,
      totalWeightKg: true,
      totalOrderedQty: true,
      totalAllocatedQty: true,
      totalPickedQty: true,
      totalPackedQty: true,
      totalShippedQty: true,
      hasSerialItems: true,
      notes: true,
      createdAt: true,
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
      extension: {
        select: {
          channel: true,
          logisticsTrackingNumber: true,
          checkOutWeightKg: true,
        },
      },
      timeline: {
        select: {
          expectedOutboundTime: true,
          allocatedAt: true,
          packedAt: true,
          checkedOutAt: true,
        },
      },
        interceptionCases: {
          where: {
            isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          source: true,
          remark: true,
            status: true,
            markedBy: true,
            markedAt: true,
            blockedAtCheckout: true,
            handlingAction: true,
            handledAt: true,
          },
        },
    },
  })

  if (!order) {
    notFound()
  }

  const formatDateTimeOrDash = (date: Date | null | undefined) => {
    if (!date) return '-'
    return formatDateTime(date)
  }

  const interceptionCase = order.interceptionCases[0] || null
  const markedByUser = interceptionCase?.markedBy
    ? await prisma.user.findUnique({
        where: { id: interceptionCase.markedBy },
        select: {
          fullName: true,
          username: true,
        },
      })
    : null
  const interceptionStatus = interceptionCase?.status || 'NOT_INTERCEPTED'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('detail'))} />
        <OrderDetailInterceptionAction orderNumber={order.orderNumber} orderStatus={order.status} />
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 第一行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">出库订单号</p>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">出库单类型</p>
              <p className="font-medium">
                {orderBusinessTypeLabels[order.orderBusinessType] || order.orderBusinessType}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">状态</p>
              <Badge className={statusColors[order.status] || 'bg-gray-500 text-white'}>
                {statusLabels[order.status] || order.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">订单来源</p>
              <p className="font-medium">
                {orderSourceLabels[order.orderSource] || order.orderSource}
              </p>
            </div>
          </div>

          {/* 第二行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">参考号</p>
              <p className="font-medium">{order.referenceNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">平台交易号</p>
              <p className="font-medium">{order.platformOrderId || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">订单类型</p>
              <p className="font-medium">
                {orderTypeLabels[order.orderType] || order.orderType}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">客户</p>
              <p className="font-medium">{order.client?.clientName || '-'}</p>
            </div>
          </div>

          {/* 第三行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">仓库</p>
              <p className="font-medium">{order.warehouse?.warehouseName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">物流单号</p>
              <p className="font-medium">{order.extension?.logisticsTrackingNumber || order.trackingNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">换号状态</p>
              <p className="font-medium">
                {numberChangeStatusLabels[order.numberChangeStatus] || order.numberChangeStatus}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">渠道</p>
              <p className="font-medium">{order.extension?.channel || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总重量(KG)</p>
              <p className="font-medium">{order.totalWeightKg?.toString() || '-'}</p>
            </div>
          </div>

          {/* 第四行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">签出总重(KG)</p>
              <p className="font-medium">{order.extension?.checkOutWeightKg?.toString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">创建时间</p>
              <p className="font-medium">{formatDateTimeOrDash(order.createdAt) || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">审核时间</p>
              <p className="font-medium">{formatDateTimeOrDash(order.timeline?.allocatedAt) || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">打包时间</p>
              <p className="font-medium">{formatDateTimeOrDash(order.timeline?.packedAt) || '-'}</p>
            </div>
          </div>

          {/* 第五行 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">出库时间</p>
              <p className="font-medium">{formatDateTimeOrDash(order.timeline?.checkedOutAt) || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">预计出库时间</p>
              <p className="font-medium">{formatDateTimeOrDash(order.timeline?.expectedOutboundTime) || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">订单备注</p>
              <p className="font-medium">{order.notes || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t pt-4">
            <div>
              <p className="text-sm text-muted-foreground">拦截状态</p>
              <Badge className={interceptionStatusColors[interceptionStatus] || interceptionStatusColors.NOT_INTERCEPTED}>
                {interceptionStatusLabels[interceptionStatus] || interceptionStatus}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">拦截来源</p>
              <p className="font-medium">{interceptionCase ? (interceptionSourceLabels[interceptionCase.source] || interceptionCase.source) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">标记时间</p>
              <p className="font-medium">{formatDateTimeOrDash(interceptionCase?.markedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">标记人</p>
              <p className="font-medium">{interceptionCase ? (markedByUser?.fullName || markedByUser?.username || '系统') : '-'}</p>
            </div>
            <div className="col-span-4">
              <p className="text-sm text-muted-foreground">拦截备注</p>
              <p className="font-medium">{interceptionCase?.remark || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">处理动作</p>
              <p className="font-medium">{interceptionCase?.handlingAction ? (handlingActionLabels[interceptionCase.handlingAction] || interceptionCase.handlingAction) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">处理时间</p>
              <p className="font-medium">{formatDateTimeOrDash(interceptionCase?.handledAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab区域 */}
      <Tabs defaultValue="sku" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sku">SKU信息</TabsTrigger>
          <TabsTrigger value="shipment">包裹信息</TabsTrigger>
          <TabsTrigger value="inventory">库存流水</TabsTrigger>
          <TabsTrigger value="logs">操作日志</TabsTrigger>
          <TabsTrigger value="address">收件人信息</TabsTrigger>
          <TabsTrigger value="serialNumbers">SN信息</TabsTrigger>
          <TabsTrigger value="packingVideo">打包视频</TabsTrigger>
        </TabsList>

        <TabsContent value="sku">
          <OrderSkuTable orderId={id} />
        </TabsContent>

        <TabsContent value="shipment">
          <OrderShipmentTable orderId={id} />
        </TabsContent>

        <TabsContent value="inventory">
          <OrderInventoryTransactionTable orderId={id} />
        </TabsContent>

        <TabsContent value="logs">
          <OrderOperationLogTable orderId={id} />
        </TabsContent>

        <TabsContent value="address">
          <OrderAddressInfo orderId={id} />
        </TabsContent>

        <TabsContent value="serialNumbers">
          <OrderSerialNumberTable orderId={id} />
        </TabsContent>

        <TabsContent value="packingVideo">
          <OrderPackingVideoTable orderId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
