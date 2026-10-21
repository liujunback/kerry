'use client'

import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import type {
  PackingModule,
  PackingModuleContext,
  SkuScanResult,
  CloseBoxResult,
  ModuleScanInfoProps,
  ModuleContentProps,
} from './types'

// 订单模式状态
export interface OrderModuleState {
  orderId: string
  orderNumber: string
  totalExpected: number
  totalPacked: number
  isComplete: boolean
  lines: {
    lineId: string
    skuCode: string
    skuName: string | null
    expectedQty: number
    packedQty: number
  }[]
  pendingCloseOrder: { orderId: string; orderNumber: string } | null
  serialNumberDialog: {
    open: boolean
    skuCode: string
    skuName: string | null
    barcode: string
    requiredQuantity: number
  } | null
}

// SKU 扫描处理
async function onSkuScanned(
  barcode: string,
  context: PackingModuleContext,
  moduleState: OrderModuleState,
  setModuleState: (state: OrderModuleState) => void,
  serialNumbers: string[] = []
): Promise<SkuScanResult> {
  // 检查是否有未关箱的订单
  if (moduleState.pendingCloseOrder) {
    return {
      success: false,
      message: context.t('errors.orderNotClosed', { orderNumber: moduleState.pendingCloseOrder.orderNumber }),
    }
  }

  const response = await fetch(`/api/v1/packing/${context.pickOrderId}/scan-sku`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      barcode,
      quantity: 1,
      serialNumbers,
      orderId: moduleState.orderId, // 传递订单ID，确保只打包当前订单的商品
    }),
  })

  if (!response.ok) {
    const error = await response.json()

    // 检查是否是序列号错误
    if (error.message && error.message.includes('需要扫描')) {
      // 提取需要的序列号数量
      const match = error.message.match(/需要扫描 (\d+) 个序列号/)
      const requiredQuantity = match ? parseInt(match[1]) : 1

      // 触发序列号扫描对话框
      return {
        success: false,
        message: error.message,
        requireSerialNumbers: true,
        requiredQuantity,
      }
    }

    return {
      success: false,
      message: error.message || context.t('errors.skuNotInOrder'),
    }
  }

  const data = await response.json()
  const result = data.data

  // 重新查询订单最新数据，确保前端状态与数据库同步
  const refreshResponse = await fetch(`/api/v1/packing/lookup?scanCode=${encodeURIComponent(moduleState.orderNumber)}`)
  if (!refreshResponse.ok) {
    // 如果刷新失败，使用乐观更新（降级方案）
    const newTotalPacked = moduleState.totalPacked + 1
    const updatedLines = moduleState.lines.map((line) =>
      line.skuCode === result.skuCode
        ? { ...line, packedQty: line.packedQty + 1 }
        : line
    )

    if (result.isOrderComplete) {
      setModuleState({
        ...moduleState,
        totalPacked: newTotalPacked,
        lines: updatedLines,
        pendingCloseOrder: {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
        },
        serialNumberDialog: null,
      })
      context.triggerFocusMaterial()
      return {
        success: true,
        message: context.t('messages.skuPacked', { skuCode: result.skuCode }),
        isOrderComplete: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      }
    }

    setModuleState({
      ...moduleState,
      totalPacked: newTotalPacked,
      lines: updatedLines,
      serialNumberDialog: null,
    })
    context.triggerFocusSku()
    return {
      success: true,
      message: context.t('messages.skuPacked', { skuCode: result.skuCode }),
    }
  }

  // 使用服务器返回的最新数据更新状态
  const refreshData = await refreshResponse.json()
  const orderInfo = refreshData.data.orderInfo

  if (orderInfo) {
    // 如果订单打包完成，设置待关箱订单
    if (result.isOrderComplete) {
      setModuleState({
        ...moduleState,
        totalPacked: orderInfo.totalPacked,
        lines: orderInfo.lines.map((line: { skuCode: string; skuName: string | null; expectedQty: number; packedQty: number }) => ({
          lineId: '',
          skuCode: line.skuCode,
          skuName: line.skuName,
          expectedQty: line.expectedQty,
          packedQty: line.packedQty,
        })),
        pendingCloseOrder: {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
        },
        serialNumberDialog: null,
      })
      context.triggerFocusMaterial()
      return {
        success: true,
        message: context.t('messages.skuPacked', { skuCode: result.skuCode }),
        isOrderComplete: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      }
    }

    setModuleState({
      ...moduleState,
      totalPacked: orderInfo.totalPacked,
      lines: orderInfo.lines.map((line: { skuCode: string; skuName: string | null; expectedQty: number; packedQty: number }) => ({
        lineId: '',
        skuCode: line.skuCode,
        skuName: line.skuName,
        expectedQty: line.expectedQty,
        packedQty: line.packedQty,
      })),
      serialNumberDialog: null,
    })

    // 订单未完成，继续扫描下一个SKU
    context.triggerFocusSku()

    return {
      success: true,
      message: context.t('messages.skuPacked', { skuCode: result.skuCode }),
    }
  }

  // 如果没有 orderInfo（不应该发生），使用乐观更新
  const newTotalPacked = moduleState.totalPacked + 1
  const updatedLines = moduleState.lines.map((line) =>
    line.skuCode === result.skuCode
      ? { ...line, packedQty: line.packedQty + 1 }
      : line
  )

  setModuleState({
    ...moduleState,
    totalPacked: newTotalPacked,
    lines: updatedLines,
    serialNumberDialog: null,
  })
  context.triggerFocusSku()

  return {
    success: true,
    message: context.t('messages.skuPacked', { skuCode: result.skuCode }),
  }
}

// 关箱处理
async function onCloseBox(
  context: PackingModuleContext,
  moduleState: OrderModuleState,
  setModuleState: (state: OrderModuleState) => void
): Promise<CloseBoxResult> {
  if (!moduleState.pendingCloseOrder) {
    return { success: false, message: context.t('errors.noPendingCloseOrder') }
  }

  if (context.packagingMaterials.length === 0) {
    return { success: false, message: context.t('errors.selectMaterial') }
  }

  const response = await fetch(`/api/v1/packing/${context.pickOrderId}/complete-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: moduleState.pendingCloseOrder.orderId,
      packagingMaterials: context.packagingMaterials.map((m) => ({
        materialId: m.materialId,
        quantity: m.quantity,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { success: false, message: error.message || context.t('errors.closeBoxFailed') }
  }

  const data = await response.json()
  const orderNumber = moduleState.pendingCloseOrder.orderNumber

  // 更新状态为完成
  setModuleState({
    ...moduleState,
    isComplete: true,
    pendingCloseOrder: null,
  })
  context.clearPackagingMaterials()

  toast.success(context.t('messages.orderClosed', { orderNumber }))

  return {
    success: true,
    labelData: data.data?.labelData,
    videoWindows: data.data?.videoWindow ? [data.data.videoWindow] : [],
    shouldReload: false, // 订单模式不需要重新加载，显示完成状态
    completedOrder: {
      orderId: moduleState.orderId,
      orderNumber: moduleState.orderNumber,
      totalExpected: moduleState.totalExpected,
      totalPacked: moduleState.totalExpected,
    },
  }
}

// 订单信息显示组件
function OrderScanInfo({ moduleState }: { moduleState: OrderModuleState }) {
  const t = useTranslations('packing')

  if (moduleState.isComplete) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t('status.closeBoxCompleted')}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">{t('labels.orderNumber')}：</span>
            <span className="font-medium">{moduleState.orderNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('labels.packed')}：</span>
            <span className="font-medium text-green-600">
              {moduleState.totalPacked}/{moduleState.totalExpected}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3 bg-muted rounded-lg">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">{t('labels.orderNumber')}：</span>
          <span className="font-medium">{moduleState.orderNumber}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('labels.pendingPack')}：</span>
          <span className="font-medium">{moduleState.totalExpected}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('labels.packed')}：</span>
          <span className="font-medium text-green-600">{moduleState.totalPacked}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('labels.status')}：</span>
          <span className={`font-medium ${moduleState.pendingCloseOrder ? 'text-orange-600' : 'text-blue-600'}`}>
            {moduleState.pendingCloseOrder ? t('status.pendingClose') : t('status.packing')}
          </span>
        </div>
      </div>
    </div>
  )
}

// 订单行项目显示组件
function OrderContent({ moduleState }: { moduleState: OrderModuleState }) {
  const t = useTranslations('packing')

  if (moduleState.lines.length === 0) return null

  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-medium">{t('orderDetails')}</h3>
          <span className="text-sm text-muted-foreground">
            {t('labels.orderNumber')}：<span className="font-medium text-foreground">{moduleState.orderNumber}</span>
          </span>
        </div>
        <div className="p-4">
          <table className="w-full text-sm text-foreground">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">{t('table.skuCode')}</th>
                <th className="text-left py-2 font-medium">{t('table.skuName')}</th>
                <th className="text-right py-2 font-medium">{t('table.pendingScan')}</th>
                <th className="text-right py-2 font-medium">{t('table.scanned')}</th>
              </tr>
            </thead>
            <tbody>
              {moduleState.lines.map((line, index) => {
                const isComplete = line.packedQty >= line.expectedQty
                const isInProgress = line.packedQty > 0 && line.packedQty < line.expectedQty
                return (
                  <tr
                    key={index}
                    className={`border-b last:border-0 ${
                      isComplete
                        ? 'bg-green-50 text-slate-900 dark:bg-green-950/30 dark:text-slate-100'
                        : isInProgress
                          ? 'bg-yellow-50 text-slate-900 dark:bg-yellow-950/30 dark:text-slate-100'
                          : 'text-foreground'
                    }`}
                  >
                    <td className="py-2">{line.skuCode}</td>
                    <td className="py-2">{line.skuName || '-'}</td>
                    <td className="text-right py-2">{line.expectedQty - line.packedQty}</td>
                    <td className="text-right py-2">
                      <span className={isComplete ? 'font-medium text-green-700 dark:text-green-400' : ''}>
                        {line.packedQty}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// 创建订单模块实例
export function createOrderModule(): PackingModule & {
  getInitialState: (orderInfo: {
    orderId: string
    orderNumber: string
    totalExpected: number
    totalPacked: number
    isComplete: boolean
    lines: { skuCode: string; skuName: string | null; expectedQty: number; packedQty: number }[]
  }) => OrderModuleState
  createHandlers: () => {
    onSkuScanned: (barcode: string, context: PackingModuleContext, moduleState: OrderModuleState, setModuleState: (state: OrderModuleState) => void, serialNumbers?: string[]) => Promise<SkuScanResult>
    onCloseBox: (context: PackingModuleContext, moduleState: OrderModuleState, setModuleState: (state: OrderModuleState) => void, payload?: { weight?: number }) => Promise<CloseBoxResult>
  }
  OrderScanInfo: typeof OrderScanInfo
  OrderContent: typeof OrderContent
} {
  return {
    type: 'ORDER',
    displayName: 'ORDER',

    getInitialState: (orderInfo) => ({
      orderId: orderInfo.orderId,
      orderNumber: orderInfo.orderNumber,
      totalExpected: orderInfo.totalExpected,
      totalPacked: orderInfo.totalPacked,
      isComplete: orderInfo.isComplete,
      lines: orderInfo.lines.map((line) => ({
        lineId: '',
        skuCode: line.skuCode,
        skuName: line.skuName,
        expectedQty: line.expectedQty,
        packedQty: line.packedQty,
      })),
      pendingCloseOrder: null,
      serialNumberDialog: null,
    }),

    createHandlers: () => ({
      onSkuScanned: (barcode: string, context: PackingModuleContext, moduleState: OrderModuleState, setModuleState: (state: OrderModuleState) => void, serialNumbers: string[] = []) =>
        onSkuScanned(barcode, context, moduleState, setModuleState, serialNumbers),
      onCloseBox,
    }),

    // 基础接口实现
    onSkuScanned: async (_barcode, context) => ({ success: false, message: context.t('errors.useCreateHandlers') }),
    onCloseBox: async (context) => ({ success: false, message: context.t('errors.useCreateHandlers') }),

    renderContent: ({ moduleState }: ModuleContentProps<OrderModuleState>) => <OrderContent moduleState={moduleState} />,
    renderScanInfo: ({ moduleState }: ModuleScanInfoProps<OrderModuleState>) => (
      <OrderScanInfo moduleState={moduleState} />
    ),

    // 导出组件供外部使用
    OrderScanInfo,
    OrderContent,
  }
}

export const orderModule = createOrderModule()
