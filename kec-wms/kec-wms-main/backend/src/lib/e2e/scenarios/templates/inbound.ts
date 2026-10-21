/**
 * 入库场景模板（8个）
 * 覆盖原有场景：ASN-RECV-*, RCV-*, RECV-*, INBOUND-*
 */

import type { ScenarioTemplate } from './types'
import { E2E_BIN_CODES } from '../../setup-e2e-tenant'

const DEFAULT_STORAGE_BIN = E2E_BIN_CODES.storage[0]
const DEFAULT_DAMAGE_BIN = E2E_BIN_CODES.damage

function generateBatchNumber(prefix = 'BATCH'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

function generateFutureDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function generatePastDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function generateSerialNumbers(prefix: string, count: number): string[] {
  const ts = Date.now().toString(36).toUpperCase()
  return Array.from({ length: count }, (_, i) =>
    `${prefix}-${ts}-${String(i + 1).padStart(4, '0')}`,
  )
}

function splitQuantities(totalQty: number, parts: number): number[] {
  const safeParts = Math.max(1, parts)
  const baseQty = Math.floor(totalQty / safeParts)
  return Array.from({ length: safeParts }, (_, index) =>
    index === safeParts - 1 ? totalQty - baseQty * index : baseQty,
  )
}

function buildSkuParams(skuType: string, qty: number, params: Record<string, unknown>) {
  const base: Record<string, unknown> = { skuType, expectedQty: qty }
  if (skuType === 'batch' || skuType === 'expiry' || skuType === 'serial' || skuType === 'full') {
    base.batchNumber = (params.batchNumber as string) || generateBatchNumber()
  }
  if (skuType === 'expiry' || skuType === 'full') {
    base.expiryDate = (params.expiryDate as string) || generateFutureDate(180)
  }
  return base
}

function buildReceivingStep(
  qty: number,
  options: {
    qualityStatus?: 'GOOD' | 'DAMAGED'
    serialNumbers?: string[]
    targetContainer?: string
    receivingMode?: 'SKU' | 'CONTAINER'
  } = {},
) {
  return {
    qty,
    qualityStatus: options.qualityStatus,
    serialNumbers: options.serialNumbers,
    targetContainer: options.targetContainer,
    receivingMode: options.receivingMode,
  }
}

function buildPutawayStep(
  qty: number,
  toBin: string,
  options: {
    mode?: 'BY_ORDER' | 'BY_CONTAINER'
    containerCode?: string
    skuType?: string
    batchNumber?: string
    serialNumbers?: string[]
    qualityStatus?: 'GOOD' | 'DAMAGED'
  } = {},
) {
  return {
    mode: options.mode || 'BY_ORDER',
    containerCode: options.containerCode,
    items: [
      {
        qty,
        toBin,
        skuType: options.skuType,
        batchNumber: options.batchNumber,
        serialNumbers: options.serialNumbers,
        qualityStatus: options.qualityStatus,
      },
    ],
  }
}

export const RECV_NORMAL_TEMPLATE: ScenarioTemplate = {
  code: 'RECV-NORMAL',
  name: '正常收货',
  description: '标准收货流程，通过 skuType 参数覆盖普通/批次/效期/序列号/全属性场景',
  domain: 'inbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    multiSku: { type: 'boolean', default: false },
    skuCount: { type: 'number', default: 1 },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    quantityDirection: 'exact',
    isNegative: false,
    weight: 100,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const qty = (params.quantity as number) || 10
    const multiSku = params.multiSku as boolean
    const skuParams = buildSkuParams(skuType, qty, params)
    const serialNumbers = skuType === 'serial' || skuType === 'full'
      ? generateSerialNumbers('SN', qty)
      : undefined

    const config: Record<string, unknown> = { ...skuParams }
    if (multiSku) {
      config.multiSku = true
      config.skuItems = [
        { skuType: 'normal', expectedQty: qty },
        { skuType: 'batch', expectedQty: qty, batchNumber: generateBatchNumber() },
      ]
    }
    config.receivingSteps = [buildReceivingStep(qty, { serialNumbers })]
    return config as any
  },
  buildExpected: (params) => {
    const qty = (params.quantity as number) || 10
    return { asnStatus: 'RECEIVED', totalReceivedQty: qty } as any
  },
}

export const RECV_QUANTITY_TEMPLATE: ScenarioTemplate = {
  code: 'RECV-QUANTITY',
  name: '收货数量异常',
  description: '超收/欠收/零数量/负数量场景，通过 direction + ratio 参数控制',
  domain: 'inbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    expectedQty: { type: 'number', default: 100, required: true },
    actualQty: { type: 'number', required: true },
    direction: { type: 'enum', enum: ['over', 'under', 'zero', 'negative'], required: true },
  },
  matchFeatures: {
    quantityDirection: 'over',
    isNegative: false,
    weight: 90,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const expectedQty = (params.expectedQty as number) || 100
    const actualQty = params.actualQty as number
    const skuParams = buildSkuParams(skuType, expectedQty, params)
    return {
      ...skuParams,
      receivingSteps: [buildReceivingStep(actualQty)],
    } as any
  },
  buildExpected: (params) => {
    const direction = params.direction as string
    const actualQty = params.actualQty as number
    if (direction === 'zero' || direction === 'negative') {
      return { shouldFail: true, errorContains: '数量' } as any
    }
    if (direction === 'over') {
      return { shouldFail: true, errorContains: '超收' } as any
    }
    return {
      totalReceivedQty: actualQty,
      asnStatus: 'RECEIVED',
    } as any
  },
}

export const RECV_QUALITY_TEMPLATE: ScenarioTemplate = {
  code: 'RECV-QUALITY',
  name: '质量混合收货',
  description: '良品/残品混合收货，通过 goodQty + damagedQty 控制比例',
  domain: 'inbound',
  priority: 'P1',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    expectedQty: { type: 'number', default: 100 },
    goodQty: { type: 'number', required: true },
    damagedQty: { type: 'number', required: true },
  },
  matchFeatures: {
    qualityStatus: 'mixed',
    isNegative: false,
    weight: 85,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const expectedQty = (params.expectedQty as number) || 100
    const goodQty = params.goodQty as number
    const damagedQty = params.damagedQty as number
    const skuParams = buildSkuParams(skuType, expectedQty, params)
    const receivingSteps = [
      goodQty > 0 ? buildReceivingStep(goodQty, { qualityStatus: 'GOOD' }) : null,
      damagedQty > 0 ? buildReceivingStep(damagedQty, { qualityStatus: 'DAMAGED' }) : null,
    ].filter(Boolean)

    return {
      ...skuParams,
      receivingSteps,
    } as any
  },
  buildExpected: (params) => ({
    asnStatus: 'RECEIVED',
    goodQty: (params.goodQty as number) > 0 ? params.goodQty as number : undefined,
    damagedQty: (params.damagedQty as number) > 0 ? params.damagedQty as number : undefined,
    totalReceivedQty: (params.goodQty as number) + (params.damagedQty as number),
  } as any),
}

export const RECV_CONTAINER_TEMPLATE: ScenarioTemplate = {
  code: 'RECV-CONTAINER',
  name: '容器收货',
  description: '容器模式收货，支持单容器/多容器/追加/冲突场景',
  domain: 'inbound',
  priority: 'P1',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    containerCount: { type: 'number', default: 1 },
    appendMode: { type: 'boolean', default: false },
  },
  matchFeatures: {
    operationMode: 'container',
    isNegative: false,
    weight: 80,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const qty = (params.quantity as number) || 10
    const skuParams = buildSkuParams(skuType, qty, params)
    const serialNumbers = skuType === 'serial' || skuType === 'full'
      ? generateSerialNumbers('SN', qty)
      : undefined
    return {
      ...skuParams,
      receivingMode: 'CONTAINER',
      receivingSteps: [
        buildReceivingStep(qty, {
          targetContainer: 'E2E-CONT-001',
          serialNumbers,
          receivingMode: 'CONTAINER',
        }),
      ],
    } as any
  },
  buildExpected: (params) => ({
    asnStatus: 'RECEIVED',
    totalReceivedQty: (params.quantity as number) || 10,
  } as any),
}

export const PUTAWAY_NORMAL_TEMPLATE: ScenarioTemplate = {
  code: 'PUT-NORMAL',
  name: '正常上架',
  description: '标准上架流程，支持普通/批次/效期/序列号/分批/容器上架',
  domain: 'putaway',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    splitCount: { type: 'number', default: 1, description: '分批上架次数' },
    qualityStatus: { type: 'enum', enum: ['GOOD', 'DAMAGED'], default: 'GOOD' },
    useContainer: { type: 'boolean', default: false },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    isNegative: false,
    weight: 100,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const qty = (params.quantity as number) || 10
    const splitCount = (params.splitCount as number) || 1
    const qualityStatus = ((params.qualityStatus as string) || 'GOOD') as 'GOOD' | 'DAMAGED'
    const useContainer = params.useContainer as boolean
    const skuParams = buildSkuParams(skuType, qty, params)
    const serialNumbers = skuType === 'serial' || skuType === 'full'
      ? generateSerialNumbers('PUT', qty)
      : undefined
    const splitQtys = splitQuantities(qty, splitCount)
    let serialOffset = 0

    return {
      ...skuParams,
      receivingSteps: [
        buildReceivingStep(qty, {
          qualityStatus,
          serialNumbers,
          receivingMode: useContainer ? 'CONTAINER' : 'SKU',
          targetContainer: useContainer ? 'E2E-CONT-001' : undefined,
        }),
      ],
      putawaySteps: splitQtys.map((stepQty) => {
        const stepSerials = serialNumbers?.slice(serialOffset, serialOffset + stepQty)
        serialOffset += stepQty
        return buildPutawayStep(
          stepQty,
          qualityStatus === 'DAMAGED' ? DEFAULT_DAMAGE_BIN : DEFAULT_STORAGE_BIN,
          {
            mode: useContainer ? 'BY_CONTAINER' : 'BY_ORDER',
            containerCode: useContainer ? 'E2E-CONT-001' : undefined,
            serialNumbers: stepSerials,
            qualityStatus,
          },
        )
      }),
    } as any
  },
  buildExpected: (params) => ({
    putawayStatus: 'COMPLETED',
    inventoryInBins: [
      {
        binCode: ((params.qualityStatus as string) || 'GOOD') === 'DAMAGED' ? DEFAULT_DAMAGE_BIN : DEFAULT_STORAGE_BIN,
        qty: (params.quantity as number) || 10,
      },
    ],
  } as any),
}

export const PUTAWAY_FAIL_TEMPLATE: ScenarioTemplate = {
  code: 'PUT-FAIL',
  name: '上架失败',
  description: '上架异常场景：质量区域冲突/批次效期冲突/重复上架/库位锁定等',
  domain: 'putaway',
  priority: 'P1',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    exceptionType: {
      type: 'enum',
      enum: ['quality_zone_conflict', 'batch_conflict', 'expiry_conflict', 'duplicate', 'location_locked', 'over_qty', 'serial_mismatch'],
      required: true,
    },
  },
  matchFeatures: {
    isNegative: true,
    exceptionType: 'conflict',
    weight: 85,
  },
  buildConfig: (params) => {
    const exceptionType = params.exceptionType as string
    const qty = (params.quantity as number) || 10
    const effectiveSkuType =
      exceptionType === 'batch_conflict'
        ? 'batch'
        : exceptionType === 'expiry_conflict'
          ? 'expiry'
          : ((params.skuType as string) || 'normal')
    const skuParams = buildSkuParams(effectiveSkuType, qty, params)

    const config: Record<string, unknown> = {
      ...skuParams,
      receivingSteps: [buildReceivingStep(qty, { qualityStatus: 'GOOD' })],
    }

    switch (exceptionType) {
      case 'quality_zone_conflict':
        config.putawaySteps = [buildPutawayStep(qty, DEFAULT_DAMAGE_BIN, { qualityStatus: 'GOOD' })]
        break
      case 'batch_conflict':
        config.preloadDifferentBatchInBin = true
        config.preloadBinCode = DEFAULT_STORAGE_BIN
        config.preloadBatchNumber = generateBatchNumber('PRELOAD')
        config.putawaySteps = [buildPutawayStep(qty, DEFAULT_STORAGE_BIN, { batchNumber: skuParams.batchNumber as string })]
        break
      case 'expiry_conflict':
        config.preloadDifferentExpiryInBin = true
        config.preloadBinCode = DEFAULT_STORAGE_BIN
        config.preloadExpiryDate = generateFutureDate(30)
        config.putawaySteps = [buildPutawayStep(qty, DEFAULT_STORAGE_BIN, { batchNumber: skuParams.batchNumber as string })]
        break
      case 'duplicate':
        config.createDuplicatePutawayOrder = true
        break
      case 'location_locked':
        config.putawaySteps = [buildPutawayStep(qty, E2E_BIN_CODES.locked)]
        break
      case 'over_qty':
        config.putawaySteps = [buildPutawayStep(qty + 1, DEFAULT_STORAGE_BIN)]
        break
      default:
        config.putawaySteps = [buildPutawayStep(qty, DEFAULT_STORAGE_BIN)]
        break
    }

    return config as any
  },
  buildExpected: () => ({
    shouldFail: true,
  } as any),
}

export const RECV_NEGATIVE_TEMPLATE: ScenarioTemplate = {
  code: 'RECV-NEGATIVE',
  name: '收货负向测试',
  description: '收货流程中各类异常场景，通过 exceptionType 参数覆盖所有失败路径',
  domain: 'inbound',
  priority: 'P1',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    exceptionType: {
      type: 'enum',
      enum: [
        'no_batch_number', 'no_expiry_date', 'expired', 'serial_count_mismatch',
        'after_force_complete', 'not_signed', 'mode_switch', 'asn_not_found',
        'line_not_found', 'container_disabled', 'container_occupied',
        'invalid_status', 'already_signed', 'cancelled_asn', 'no_reason',
        'rollback_after_putaway', 'duplicate_serial',
      ],
      required: true,
    },
  },
  matchFeatures: {
    isNegative: true,
    exceptionType: 'validation',
    weight: 80,
  },
  buildConfig: (params) => {
    const exceptionType = params.exceptionType as string
    const qty = (params.quantity as number) || 10

    if (exceptionType === 'no_batch_number') {
      return {
        skuType: 'batch',
        expectedQty: qty,
        skipBatchNumberGeneration: true,
        receivingSteps: [buildReceivingStep(qty)],
      } as any
    }

    if (exceptionType === 'no_expiry_date') {
      return {
        skuType: 'expiry',
        expectedQty: qty,
        batchNumber: generateBatchNumber(),
        skipExpiryDateGeneration: true,
        receivingSteps: [buildReceivingStep(qty)],
      } as any
    }

    if (exceptionType === 'expired') {
      return {
        skuType: 'expiry',
        expectedQty: qty,
        batchNumber: generateBatchNumber(),
        expiryDate: generatePastDate(1),
        receivingSteps: [buildReceivingStep(qty)],
      } as any
    }

    if (exceptionType === 'serial_count_mismatch') {
      return {
        skuType: 'serial',
        expectedQty: qty,
        batchNumber: generateBatchNumber(),
        receivingSteps: [buildReceivingStep(qty, { serialNumbers: generateSerialNumbers('SN', Math.max(0, qty - 1)) })],
      } as any
    }

    if (exceptionType === 'after_force_complete') {
      return {
        skuType: 'normal',
        expectedQty: qty,
        forceComplete: true,
        receivingSteps: [buildReceivingStep(Math.max(1, qty - 1))],
        additionalReceivingAfterComplete: [buildReceivingStep(1)],
      } as any
    }

    return {
      ...buildSkuParams((params.skuType as string) || 'normal', qty, params),
      receivingSteps: [buildReceivingStep(qty)],
    } as any
  },
  buildExpected: () => ({
    shouldFail: true,
  } as any),
}

export const INBOUND_FULL_TEMPLATE: ScenarioTemplate = {
  code: 'INBOUND-FULL',
  name: '完整入库流程',
  description: '端到端入库流程：创建ASN → 签收 → 收货 → 上架，支持各种SKU类型和数量场景',
  domain: 'inbound',
  priority: 'P0',
  parameters: {
    skuType: { type: 'enum', enum: ['normal', 'batch', 'expiry', 'serial', 'full'], default: 'normal' },
    quantity: { type: 'number', default: 10 },
    receiveSplits: { type: 'number', default: 1, description: '分批收货次数' },
    putawaySplits: { type: 'number', default: 1, description: '分批上架次数' },
    quantityDirection: { type: 'enum', enum: ['exact', 'over', 'under'], default: 'exact' },
    qualityMix: { type: 'boolean', default: false },
    goodRatio: { type: 'number', default: 1.0, description: '良品比例 0-1' },
    cancelAfterSign: { type: 'boolean', default: false },
    rollbackAfterReceive: { type: 'boolean', default: false },
  },
  matchFeatures: {
    skuTypes: ['normal', 'batch', 'expiry', 'serial', 'full'],
    isNegative: false,
    weight: 70,
  },
  buildConfig: (params) => {
    const skuType = (params.skuType as string) || 'normal'
    const qty = (params.quantity as number) || 10
    const receiveSplits = (params.receiveSplits as number) || 1
    const putawaySplits = (params.putawaySplits as number) || 1
    const qualityMix = params.qualityMix as boolean
    const goodRatio = (params.goodRatio as number) ?? 1.0
    const skuParams = buildSkuParams(skuType, qty, params)
    const allSerialNumbers = skuType === 'serial' || skuType === 'full'
      ? generateSerialNumbers('FULL', qty)
      : undefined
    const receivingSteps = splitQuantities(qty, receiveSplits).flatMap((stepQty, index) => {
      const stepSerials = allSerialNumbers?.slice(
        splitQuantities(qty, receiveSplits).slice(0, index).reduce((sum, current) => sum + current, 0),
        splitQuantities(qty, receiveSplits).slice(0, index + 1).reduce((sum, current) => sum + current, 0),
      )
      if (qualityMix) {
        const goodQty = Math.floor(stepQty * goodRatio)
        return [
          buildReceivingStep(goodQty, { qualityStatus: 'GOOD', serialNumbers: stepSerials?.slice(0, goodQty) }),
          buildReceivingStep(stepQty - goodQty, { qualityStatus: 'DAMAGED', serialNumbers: stepSerials?.slice(goodQty) }),
        ]
      }
      return [buildReceivingStep(stepQty, { qualityStatus: 'GOOD', serialNumbers: stepSerials })]
    })

    let serialOffset = 0
    const putawaySteps = splitQuantities(qty, putawaySplits).map((stepQty) => {
      const stepSerials = allSerialNumbers?.slice(serialOffset, serialOffset + stepQty)
      serialOffset += stepQty
      return buildPutawayStep(stepQty, DEFAULT_STORAGE_BIN, { serialNumbers: stepSerials, qualityStatus: 'GOOD' })
    })

    return {
      ...skuParams,
      receivingSteps,
      putawaySteps,
      cancelBeforeReceiving: params.cancelAfterSign,
      rollbackAfterReceiving: params.rollbackAfterReceive,
    } as any
  },
  buildExpected: (params) => {
    if (params.cancelAfterSign || params.rollbackAfterReceive) {
      return {} as any
    }

    return {
      totalReceivedQty: (params.quantity as number) || 10,
      putawayStatus: 'COMPLETED',
    } as any
  },
}

export const INBOUND_TEMPLATES = [
  RECV_NORMAL_TEMPLATE,
  RECV_QUANTITY_TEMPLATE,
  RECV_QUALITY_TEMPLATE,
  RECV_CONTAINER_TEMPLATE,
  PUTAWAY_NORMAL_TEMPLATE,
  PUTAWAY_FAIL_TEMPLATE,
  RECV_NEGATIVE_TEMPLATE,
  INBOUND_FULL_TEMPLATE,
] as const
