/**
 * 出库场景模板（5个）
 * 覆盖原有场景：OUT-ORDER-*, PICK-*, PACK-*, CHECKOUT-*, OUTBOUND-*
 */

import type { ScenarioTemplate } from './types'

const DEFAULT_ADDRESS = {
  contactName: 'E2E Receiver',
  contactPhone: '13800000000',
  addressLine: 'E2E Test Address',
  city: 'Shanghai',
  province: 'Shanghai',
  country: 'CN',
  postalCode: '200000',
}

function generateBatchNumber(prefix = 'OUTBATCH'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

function generateFutureDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function generateSerialNumbers(prefix: string, count: number): string[] {
  const ts = Date.now().toString(36).toUpperCase()
  return Array.from({ length: count }, (_, i) =>
    `${prefix}-${ts}-${String(i + 1).padStart(4, '0')}`,
  )
}

function buildOrderLines(skuType: string, qty: number, multiSku = false) {
  return multiSku
    ? [
        { skuType: 'normal', orderedQty: qty },
        { skuType, orderedQty: qty },
      ]
    : [{ skuType, orderedQty: qty }]
}

function buildPrepareInventory(
  orderLines: Array<{ skuType: string; orderedQty: number }>,
  enabled = true,
) {
  if (!enabled) return undefined

  return orderLines.map((line, index) => {
    const item: Record<string, unknown> = {
      skuType: line.skuType,
      quantity: line.orderedQty,
    }

    if (line.skuType === 'batch' || line.skuType === 'expiry' || line.skuType === 'serial' || line.skuType === 'full') {
      item.batchNumber = generateBatchNumber(`OUT-${index + 1}`)
    }
    if (line.skuType === 'expiry' || line.skuType === 'full') {
      item.expiryDate = generateFutureDate(180)
    }
    if (line.skuType === 'serial' || line.skuType === 'full') {
      item.serialNumbers = generateSerialNumbers(`OUTSN-${index + 1}`, line.orderedQty)
    }

    return item as {
      skuType: string
      quantity: number
      batchNumber?: string
      expiryDate?: string
      serialNumbers?: string[]
    }
  })
}

function totalQty(orderLines: Array<{ orderedQty: number }>): number {
  return orderLines.reduce((sum, line) => sum + line.orderedQty, 0)
}

export const OUT_ORDER_TEMPLATE: ScenarioTemplate = {
  code: 'OUT-ORDER',
  name: '出库订单创建',
  description: '创建出库订单，支持单SKU/多SKU，以及无效 SKU / 无库存的负向测试',
  domain: 'outbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    multiSku: { type: 'boolean', default: false },
    isNegative: { type: 'boolean', default: false },
    exceptionType: {
      type: 'enum',
      enum: ['invalid_sku', 'no_inventory'],
    },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    weight: 100,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const qty = (params.quantity as number) || 10
    const multiSku = params.multiSku as boolean
    const isNegative = params.isNegative as boolean
    const exceptionType = params.exceptionType as string | undefined
    const orderLines = buildOrderLines(skuType, qty, multiSku)

    return {
      outboundConfig: {
        flowType: 'ORDER',
        orderLines,
        address: DEFAULT_ADDRESS,
        priority: 'NORMAL',
        prepareInventory: buildPrepareInventory(orderLines, !(isNegative && exceptionType === 'no_inventory')),
        useNonExistentSkuCode: isNegative && exceptionType === 'invalid_sku',
        useInsufficientInventory: isNegative && exceptionType === 'no_inventory',
      },
    } as any
  },
  buildExpected: (params) => {
    const qty = (params.quantity as number) || 10
    const multiSku = params.multiSku as boolean
    const isNegative = params.isNegative as boolean
    const exceptionType = params.exceptionType as string | undefined
    const orderLines = buildOrderLines((params.skuType as string) || 'normal', qty, multiSku)

    if (isNegative) {
      return {
        outboundExpected: {
          shouldFail: true,
          errorContains: exceptionType === 'no_inventory' ? '库存' : undefined,
        },
      } as any
    }

    return {
      outboundExpected: {
        orderStatus: ['ALLOCATED', 'PENDING'],
      },
    } as any
  },
}

export const PICK_TEMPLATE: ScenarioTemplate = {
  code: 'PICK',
  name: '拣货',
  description: '拣货单创建与执行，支持单SKU/多SKU',
  domain: 'outbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    multiSku: { type: 'boolean', default: false },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    isNegative: false,
    weight: 90,
  },
  buildConfig: (params) => {
    const orderLines = buildOrderLines(
      (params.skuType as string) || 'normal',
      (params.quantity as number) || 10,
      params.multiSku as boolean,
    )

    return {
      outboundConfig: {
        flowType: 'PICK',
        orderLines,
        address: DEFAULT_ADDRESS,
        priority: 'NORMAL',
        prepareInventory: buildPrepareInventory(orderLines),
      },
    } as any
  },
  buildExpected: (params) => {
    const orderLines = buildOrderLines(
      (params.skuType as string) || 'normal',
      (params.quantity as number) || 10,
      params.multiSku as boolean,
    )

    return {
      outboundExpected: {
        pickOrderStatus: 'IN_PROGRESS',
      },
    } as any
  },
}

export const PACK_TEMPLATE: ScenarioTemplate = {
  code: 'PACK',
  name: '打包',
  description: '打包操作，支持单SKU/多SKU，以及打包前签出的负向测试',
  domain: 'outbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    multiSku: { type: 'boolean', default: false },
    checkoutBeforePack: { type: 'boolean', default: false },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    weight: 85,
  },
  buildConfig: (params) => {
    const orderLines = buildOrderLines(
      (params.skuType as string) || 'normal',
      (params.quantity as number) || 10,
      params.multiSku as boolean,
    )

    return {
      outboundConfig: {
        flowType: 'PACK',
        orderLines,
        address: DEFAULT_ADDRESS,
        priority: 'NORMAL',
        prepareInventory: buildPrepareInventory(orderLines),
        checkoutBeforePacking: params.checkoutBeforePack,
      },
    } as any
  },
  buildExpected: (params) => {
    const orderLines = buildOrderLines(
      (params.skuType as string) || 'normal',
      (params.quantity as number) || 10,
      params.multiSku as boolean,
    )

    if (params.checkoutBeforePack) {
      return { outboundExpected: { shouldFail: true } } as any
    }

    return {
      outboundExpected: {
        packedQty: totalQty(orderLines),
      },
    } as any
  },
}

export const CHECKOUT_TEMPLATE: ScenarioTemplate = {
  code: 'CHECKOUT',
  name: '签出',
  description: '签出操作，支持普通签出和托盘签出',
  domain: 'outbound',
  priority: 'P0',
  parameters: {
    quantity: { type: 'number', default: 10 },
    usePallet: { type: 'boolean', default: false },
  },
  matchFeatures: {
    isNegative: false,
    weight: 80,
  },
  buildConfig: (params) => {
    const orderLines = buildOrderLines('normal', (params.quantity as number) || 10, false)

    return {
      outboundConfig: {
        flowType: 'CHECKOUT',
        orderLines,
        address: DEFAULT_ADDRESS,
        priority: 'NORMAL',
        prepareInventory: buildPrepareInventory(orderLines),
        checkoutConfig: {
          checkoutType: params.usePallet ? 'PALLET' : 'BAG',
          createMode: 'AUTO_GENERATE',
        },
      },
    } as any
  },
  buildExpected: (params) => {
    const orderLines = buildOrderLines('normal', (params.quantity as number) || 10, false)

    return {
      outboundExpected: {
        orderStatus: ['SHIPPED', 'CHECKED_OUT'],
        inventoryDeducted: totalQty(orderLines),
      },
    } as any
  },
}

export const OUTBOUND_FULL_TEMPLATE: ScenarioTemplate = {
  code: 'OUTBOUND-FULL',
  name: '完整出库流程',
  description: '端到端出库流程：创建订单 → 拣货 → 打包 → 签出，支持各种SKU类型',
  domain: 'outbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    multiSku: { type: 'boolean', default: false },
    noInventory: { type: 'boolean', default: false },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    weight: 70,
  },
  buildConfig: (params) => {
    const orderLines = buildOrderLines(
      (params.skuType as string) || 'normal',
      (params.quantity as number) || 10,
      params.multiSku as boolean,
    )
    const noInventory = params.noInventory as boolean
    const prepareInventory = buildPrepareInventory(orderLines, !noInventory)
    const firstPrepareItem = prepareInventory?.[0]

    return {
      outboundConfig: {
        flowType: 'FULL',
        orderLines,
        address: DEFAULT_ADDRESS,
        priority: 'NORMAL',
        prepareInventory,
        useInsufficientInventory: noInventory,
        skuAttributeTest: ['serial', 'full'].includes(orderLines[0]?.skuType)
          ? {
              skuType: orderLines[0].skuType as 'serial' | 'full',
              serialNumbers: firstPrepareItem?.serialNumbers as string[] | undefined,
              validateSerialOnPacking: true,
            }
          : undefined,
      },
    } as any
  },
  buildExpected: (params) => {
    const orderLines = buildOrderLines(
      (params.skuType as string) || 'normal',
      (params.quantity as number) || 10,
      params.multiSku as boolean,
    )

    if (params.noInventory) {
      return { outboundExpected: { shouldFail: true, errorContains: '库存' } } as any
    }

    return {
      outboundExpected: {
        orderStatus: ['SHIPPED', 'CHECKED_OUT'],
        inventoryDeducted: totalQty(orderLines),
      },
    } as any
  },
}

export const OUTBOUND_TEMPLATES = [
  OUT_ORDER_TEMPLATE,
  PICK_TEMPLATE,
  PACK_TEMPLATE,
  CHECKOUT_TEMPLATE,
  OUTBOUND_FULL_TEMPLATE,
] as const
