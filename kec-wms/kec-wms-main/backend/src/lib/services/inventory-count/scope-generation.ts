import { Prisma } from '@prisma/client'
import type { TransactionClient } from '@/lib/db/prisma'
import {
  updateBucketsInTransaction,
  type BucketUpdateParams,
} from '@/lib/services/inventory-bucket-service'
import {
  BucketType,
  type BucketTypeValue,
  createCountHoldEvents,
} from '@/lib/services/inventory-event-service'
import {
  InventoryCountOwnerScopeMode,
  type InventoryCountOwnerScopeConfig,
  type InventoryCountScopeConfig,
} from '@/lib/validations/inventory-count'

type TxClient = TransactionClient

export interface InventoryCountOrderContext {
  id: string
  tenantId: string
  orderNumber: string
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  orderType: string
  countMode: string
  status: string
  ownerScopeMode: string
  ownerScopeConfigJson: Prisma.JsonValue
  scopeConfigJson: Prisma.JsonValue
  executionConfigJson: Prisma.JsonValue
}

export interface InventoryCountScopeBucket {
  id: string
  tenantId: string
  clientId: string
  warehouseId: string
  zoneId: string
  locationId: string
  locationCode: string
  locationPickPriority: number
  locationPickSequence: number
  skuId: string
  skuCode: string
  batchNumber: string
  lpn: string
  asnNumber: string
  bucketType: string
  quantity: number
  expiryDate: Date | null
  productionDate: Date | null
  clientName: string | null
  fifoDate?: Date | null
}

export interface InventoryCountScopeBatchPlan {
  key: string
  clientId: string
  clientName: string | null
  warehouseId: string
  locationIds: string[]
  locationCodes: string[]
  scopeSummary: string
  bucketIds: string[]
}

const countScopeExcludedBucketTypes = [
  BucketType.COUNT_HOLD,
  BucketType.COUNT_SURPLUS,
  BucketType.COUNT_SHORTAGE,
] as const

function parseOwnerScopeConfig(value: Prisma.JsonValue): InventoryCountOwnerScopeConfig {
  const fallback: InventoryCountOwnerScopeConfig = {
    mode: InventoryCountOwnerScopeMode.ALL,
    clientIds: [],
    clientNames: [],
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback
  }

  const data = value as Record<string, unknown>
  return {
    mode: data.mode === InventoryCountOwnerScopeMode.PARTIAL
      ? InventoryCountOwnerScopeMode.PARTIAL
      : InventoryCountOwnerScopeMode.ALL,
    clientIds: Array.isArray(data.clientIds)
      ? data.clientIds.filter((item): item is string => typeof item === 'string')
      : [],
    clientNames: Array.isArray(data.clientNames)
      ? data.clientNames.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function parseScopeConfig(value: Prisma.JsonValue): InventoryCountScopeConfig {
  const fallback: InventoryCountScopeConfig = {
    inventoryStatuses: [],
    skuCodes: [],
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback
  }

  const data = value as Record<string, unknown>
  return {
    inventoryStatuses: Array.isArray(data.inventoryStatuses)
      ? data.inventoryStatuses.filter((item): item is string => typeof item === 'string')
      : [],
    startLocationCode: typeof data.startLocationCode === 'string' ? data.startLocationCode : undefined,
    endLocationCode: typeof data.endLocationCode === 'string' ? data.endLocationCode : undefined,
    zoneId: typeof data.zoneId === 'string' ? data.zoneId : undefined,
    zoneName: typeof data.zoneName === 'string' ? data.zoneName : undefined,
    aisle: typeof data.aisle === 'string' ? data.aisle : undefined,
    rack: typeof data.rack === 'string' ? data.rack : undefined,
    shelfStart: typeof data.shelfStart === 'string' ? data.shelfStart : undefined,
    shelfEnd: typeof data.shelfEnd === 'string' ? data.shelfEnd : undefined,
    skuCodes: Array.isArray(data.skuCodes)
      ? data.skuCodes.filter((item): item is string => typeof item === 'string')
      : [],
    cycleDays: typeof data.cycleDays === 'number' ? data.cycleDays : undefined,
    calendarCode: typeof data.calendarCode === 'string' ? data.calendarCode : undefined,
    timeWindow: typeof data.timeWindow === 'string' ? data.timeWindow : undefined,
    excludeRules: typeof data.excludeRules === 'string' ? data.excludeRules : undefined,
    maxLocationsPerBatch: typeof data.maxLocationsPerBatch === 'number' ? data.maxLocationsPerBatch : undefined,
  }
}

function buildLocationRelationFilter(scopeConfig: InventoryCountScopeConfig) {
  const locationFilter: Prisma.BinLocationWhereInput = {}

  if (scopeConfig.zoneId) {
    locationFilter.zoneId = scopeConfig.zoneId
  }

  if (scopeConfig.aisle) {
    locationFilter.aisle = scopeConfig.aisle
  }

  if (scopeConfig.rack) {
    locationFilter.rack = scopeConfig.rack
  }

  if (scopeConfig.shelfStart || scopeConfig.shelfEnd) {
    locationFilter.shelf = {}
    if (scopeConfig.shelfStart) {
      locationFilter.shelf.gte = scopeConfig.shelfStart
    }
    if (scopeConfig.shelfEnd) {
      locationFilter.shelf.lte = scopeConfig.shelfEnd
    }
  }

  if (scopeConfig.startLocationCode || scopeConfig.endLocationCode) {
    locationFilter.locationCode = {}
    if (scopeConfig.startLocationCode) {
      locationFilter.locationCode.gte = scopeConfig.startLocationCode
    }
    if (scopeConfig.endLocationCode) {
      locationFilter.locationCode.lte = scopeConfig.endLocationCode
    }
  }

  return locationFilter
}

function buildScopeBucketWhere(order: InventoryCountOrderContext): Prisma.InventoryBucketWhereInput {
  const ownerScopeConfig = parseOwnerScopeConfig(order.ownerScopeConfigJson)
  const scopeConfig = parseScopeConfig(order.scopeConfigJson)

  if (scopeConfig.inventoryStatuses.some((status) => countScopeExcludedBucketTypes.includes(status as never))) {
    throw new Error('盘点范围不允许选择盘点暂扣或盘点差异库存')
  }

  const where: Prisma.InventoryBucketWhereInput = {
    tenantId: order.tenantId,
    warehouseId: order.warehouseId,
    quantity: { gt: 0 },
  }

  if (ownerScopeConfig.mode === InventoryCountOwnerScopeMode.PARTIAL && ownerScopeConfig.clientIds.length > 0) {
    where.clientId = {
      in: ownerScopeConfig.clientIds,
    }
  }

  if (scopeConfig.inventoryStatuses.length > 0) {
    where.bucketType = {
      in: scopeConfig.inventoryStatuses,
    }
  }

  if (order.orderType === 'LOCATION') {
    where.location = buildLocationRelationFilter(scopeConfig)
  }

  if (order.orderType === 'SKU') {
    where.skuCode = {
      in: scopeConfig.skuCodes,
    }
  }

  if (order.orderType === 'CYCLE') {
    const cycleThreshold = new Date()
    cycleThreshold.setDate(cycleThreshold.getDate() - (scopeConfig.cycleDays || 0))
    where.location = {
      ...buildLocationRelationFilter(scopeConfig),
      OR: [
        { lastCountedAt: null },
        { lastCountedAt: { lte: cycleThreshold } },
      ],
    }
  }

  return where
}

function buildScopeDirtyBucketWhere(order: InventoryCountOrderContext): Prisma.InventoryBucketWhereInput {
  const ownerScopeConfig = parseOwnerScopeConfig(order.ownerScopeConfigJson)
  const scopeConfig = parseScopeConfig(order.scopeConfigJson)
  const where: Prisma.InventoryBucketWhereInput = {
    tenantId: order.tenantId,
    warehouseId: order.warehouseId,
    bucketType: {
      in: [...countScopeExcludedBucketTypes],
    },
    quantity: { gt: 0 },
  }

  if (ownerScopeConfig.mode === InventoryCountOwnerScopeMode.PARTIAL && ownerScopeConfig.clientIds.length > 0) {
    where.clientId = {
      in: ownerScopeConfig.clientIds,
    }
  }

  if (order.orderType === 'LOCATION') {
    where.location = buildLocationRelationFilter(scopeConfig)
  }

  if (order.orderType === 'SKU') {
    where.skuCode = {
      in: scopeConfig.skuCodes,
    }
  }

  if (order.orderType === 'CYCLE') {
    where.location = buildLocationRelationFilter(scopeConfig)
  }

  return where
}

export async function resolveInventoryCountScopeBuckets(
  tx: TxClient,
  order: InventoryCountOrderContext
): Promise<InventoryCountScopeBucket[]> {
  const buckets = await tx.inventoryBucket.findMany({
    where: buildScopeBucketWhere(order),
    select: {
      id: true,
      tenantId: true,
      clientId: true,
      warehouseId: true,
      zoneId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      bucketType: true,
      quantity: true,
      expiryDate: true,
      productionDate: true,
      fifoDate: true,
      location: {
        select: {
          locationCode: true,
          pickPriority: true,
          pickSequence: true,
        },
      },
      client: {
        select: {
          clientName: true,
        },
      },
    },
    orderBy: [
      { clientId: 'asc' },
      { locationId: 'asc' },
      { skuCode: 'asc' },
      { batchNumber: 'asc' },
      { lpn: 'asc' },
      { bucketType: 'asc' },
    ],
  })

  return buckets.map((bucket) => ({
    id: bucket.id,
    tenantId: bucket.tenantId,
    clientId: bucket.clientId,
    warehouseId: bucket.warehouseId,
    zoneId: bucket.zoneId,
    locationId: bucket.locationId,
    locationCode: bucket.location.locationCode,
    locationPickPriority: bucket.location.pickPriority,
    locationPickSequence: bucket.location.pickSequence,
    skuId: bucket.skuId,
    skuCode: bucket.skuCode,
    batchNumber: bucket.batchNumber,
    lpn: bucket.lpn,
    asnNumber: bucket.asnNumber,
    bucketType: bucket.bucketType,
    quantity: bucket.quantity,
    expiryDate: bucket.expiryDate,
    productionDate: bucket.productionDate,
    fifoDate: bucket.fifoDate,
    clientName: bucket.client.clientName,
  }))
}

export async function assertNoDirtyCountDifferenceBucketsForOrderScope(
  tx: TxClient,
  order: InventoryCountOrderContext
) {
  const countDiffBuckets = await tx.inventoryBucket.findMany({
    where: buildScopeDirtyBucketWhere(order),
    select: {
      id: true,
      bucketType: true,
      tenantId: true,
      clientId: true,
      warehouseId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      expiryDate: true,
      quantity: true,
      location: {
        select: {
          locationCode: true,
        },
      },
    },
    take: 20,
  })

  for (const bucket of countDiffBuckets) {
    if (bucket.bucketType !== BucketType.COUNT_HOLD) {
      const expectedDisposalType = bucket.bucketType === BucketType.COUNT_SURPLUS
        ? 'COUNT_SURPLUS'
        : 'COUNT_SHORTAGE'
      const diffFilter = bucket.bucketType === BucketType.COUNT_SURPLUS
        ? { gt: 0 }
        : { lt: 0 }
      const diffDetail = await tx.inventoryCountDetail.findFirst({
        where: {
          tenantId: bucket.tenantId,
          warehouseId: bucket.warehouseId,
          clientId: bucket.clientId,
          locationId: bucket.locationId,
          skuId: bucket.skuId,
          batchNumber: bucket.batchNumber,
          lpn: bucket.lpn,
          expiryDate: bucket.expiryDate,
          diffQuantity: diffFilter,
          status: 'ADJUSTED',
          disposalId: {
            not: null,
          },
        },
        select: {
          disposalId: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      const diffDisposal = diffDetail?.disposalId
        ? await tx.inventoryCountDisposal.findFirst({
            where: {
              id: diffDetail.disposalId,
              status: 'DONE',
              disposalType: expectedDisposalType,
            },
            select: {
              id: true,
            },
          })
        : null

      if (diffDisposal) {
        continue
      }

      throw new Error(
        `存在无有效盘点差异来源的 ${bucket.bucketType} 库存，请先修复：库位 ${bucket.location.locationCode}，SKU ${bucket.skuCode}，批次 ${bucket.batchNumber || '-'}，ASN ${bucket.asnNumber || '-'}，数量 ${bucket.quantity}`
      )
    }

    const activeLock = await tx.inventoryCountLock.findFirst({
      where: {
        tenantId: bucket.tenantId,
        warehouseId: bucket.warehouseId,
        locationId: bucket.locationId,
        skuId: bucket.skuId,
        clientId: bucket.clientId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        orderId: true,
      },
    })

    if (!activeLock) {
      throw new Error(
        `存在无有效盘点锁的 COUNT_HOLD 库存，请先修复：库位 ${bucket.location.locationCode}，SKU ${bucket.skuCode}，批次 ${bucket.batchNumber || '-'}，ASN ${bucket.asnNumber || '-'}，数量 ${bucket.quantity}`
      )
    }

    if (activeLock.orderId !== order.id) {
      const lockedOrder = await tx.inventoryCountOrder.findUnique({
        where: { id: activeLock.orderId },
        select: {
          orderNumber: true,
        },
      })
      throw new Error(`存在已被其他盘点单锁定的 COUNT_HOLD 库存：${lockedOrder?.orderNumber || activeLock.orderId}`)
    }
  }
}

export async function assertInventoryCountScopeBucketsUnlocked(
  tx: TxClient,
  orderId: string,
  bucketIds: string[],
  releasedBy?: string
) {
  if (bucketIds.length === 0) {
    return
  }

  const activeLocks = await tx.inventoryCountLock.findMany({
    where: {
      orderId: { not: orderId },
      status: 'ACTIVE',
      sourceBucketId: {
        in: bucketIds,
      },
    },
    select: {
      id: true,
      orderId: true,
      sourceBucketId: true,
    },
  })

  if (activeLocks.length === 0) {
    return
  }

  const lockedOrderIds = [...new Set(activeLocks.map((lock) => lock.orderId))]
  const lockedOrders = await tx.inventoryCountOrder.findMany({
    where: {
      id: {
        in: lockedOrderIds,
      },
    },
    select: {
      id: true,
      orderNumber: true,
    },
  })

  const existingOrderIdSet = new Set(lockedOrders.map((item) => item.id))
  const orphanLockIds = activeLocks
    .filter((lock) => !existingOrderIdSet.has(lock.orderId))
    .map((lock) => lock.id)

  if (orphanLockIds.length > 0) {
    await tx.inventoryCountLock.updateMany({
      where: {
        id: {
          in: orphanLockIds,
        },
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedBy: releasedBy || null,
      },
    })
  }

  const validOrderNumbers = lockedOrders.map((item) => item.orderNumber).filter(Boolean)
  if (validOrderNumbers.length > 0) {
    throw new Error(`存在已被其他盘点单锁定的库存：${validOrderNumbers.join('、')}`)
  }

  if (orphanLockIds.length > 0) {
    throw new Error('存在已被其他盘点任务锁定的库存（锁记录异常）')
  }
}

export function groupInventoryCountScopeBatchesByLocation(
  buckets: InventoryCountScopeBucket[],
  maxLocationsPerBatch = 1
): InventoryCountScopeBatchPlan[] {
  const limit = Math.max(1, Math.floor(maxLocationsPerBatch || 1))
  const grouped = new Map<string, {
    clientId: string
    clientName: string | null
    warehouseId: string
    locations: Map<string, {
      locationId: string
      locationCode: string
      locationPickPriority: number
      locationPickSequence: number
      bucketIds: string[]
    }>
  }>()

  const sortedBuckets = [...buckets].sort((left, right) => {
    const clientCompare = left.clientId.localeCompare(right.clientId)
    if (clientCompare !== 0) return clientCompare

    const warehouseCompare = left.warehouseId.localeCompare(right.warehouseId)
    if (warehouseCompare !== 0) return warehouseCompare

    if (left.locationPickPriority !== right.locationPickPriority) {
      return left.locationPickPriority - right.locationPickPriority
    }

    if (left.locationPickSequence !== right.locationPickSequence) {
      return left.locationPickSequence - right.locationPickSequence
    }

    const locationCompare = left.locationCode.localeCompare(right.locationCode, undefined, { numeric: true })
    if (locationCompare !== 0) return locationCompare

    const skuCompare = left.skuCode.localeCompare(right.skuCode, undefined, { numeric: true })
    if (skuCompare !== 0) return skuCompare

    return left.id.localeCompare(right.id)
  })

  for (const bucket of sortedBuckets) {
    const groupKey = `${bucket.clientId}:${bucket.warehouseId}:FIRST`
    let group = grouped.get(groupKey)
    if (!group) {
      group = {
        clientId: bucket.clientId,
        clientName: bucket.clientName,
        warehouseId: bucket.warehouseId,
        locations: new Map(),
      }
      grouped.set(groupKey, group)
    }

    const currentLocation = group.locations.get(bucket.locationId)
    if (currentLocation) {
      currentLocation.bucketIds.push(bucket.id)
    } else {
      group.locations.set(bucket.locationId, {
        locationId: bucket.locationId,
        locationCode: bucket.locationCode,
        locationPickPriority: bucket.locationPickPriority,
        locationPickSequence: bucket.locationPickSequence,
        bucketIds: [bucket.id],
      })
    }
  }

  const plans: InventoryCountScopeBatchPlan[] = []

  for (const [groupKey, group] of grouped) {
    const locations = [...group.locations.values()].sort((left, right) => {
      if (left.locationPickPriority !== right.locationPickPriority) {
        return left.locationPickPriority - right.locationPickPriority
      }

      if (left.locationPickSequence !== right.locationPickSequence) {
        return left.locationPickSequence - right.locationPickSequence
      }

      return left.locationCode.localeCompare(right.locationCode, undefined, { numeric: true })
    })
    for (let index = 0; index < locations.length; index += limit) {
      const chunk = locations.slice(index, index + limit)
      const locationCodes = chunk.map((location) => location.locationCode)
      const scopeSummary = locationCodes.length === 1
        ? locationCodes[0]
        : `${locationCodes[0]} - ${locationCodes[locationCodes.length - 1]}（${locationCodes.length}个货位）`

      plans.push({
        key: `${groupKey}:${Math.floor(index / limit) + 1}`,
        clientId: group.clientId,
        clientName: group.clientName,
        warehouseId: group.warehouseId,
        locationIds: chunk.map((location) => location.locationId),
        locationCodes,
        scopeSummary,
        bucketIds: chunk.flatMap((location) => location.bucketIds),
      })
    }
  }

  return plans
}

export function buildInventoryCountHoldBucketUpdates(
  buckets: InventoryCountScopeBucket[]
): BucketUpdateParams[] {
  return buckets.flatMap((bucket) => {
    if (countScopeExcludedBucketTypes.includes(bucket.bucketType as never)) {
      return []
    }

    return [
      {
        tenantId: bucket.tenantId,
        warehouseId: bucket.warehouseId,
        locationId: bucket.locationId,
        skuId: bucket.skuId,
        skuCode: bucket.skuCode,
        clientId: bucket.clientId,
        batchNumber: bucket.batchNumber,
        lpn: bucket.lpn,
        asnNumber: bucket.asnNumber,
        expiryDate: bucket.expiryDate,
        productionDate: bucket.productionDate,
        fifoDate: bucket.fifoDate || undefined,
        bucketType: bucket.bucketType as BucketTypeValue,
        quantityDelta: -bucket.quantity,
      },
      {
        tenantId: bucket.tenantId,
        warehouseId: bucket.warehouseId,
        locationId: bucket.locationId,
        skuId: bucket.skuId,
        skuCode: bucket.skuCode,
        clientId: bucket.clientId,
        batchNumber: bucket.batchNumber,
        lpn: bucket.lpn,
        asnNumber: bucket.asnNumber,
        expiryDate: bucket.expiryDate,
        productionDate: bucket.productionDate,
        fifoDate: bucket.fifoDate || undefined,
        bucketType: BucketType.COUNT_HOLD,
        quantityDelta: bucket.quantity,
      },
    ]
  })
}

export async function moveInventoryCountScopeBucketsToHold(params: {
  tx: TxClient
  buckets: InventoryCountScopeBucket[]
  order: InventoryCountOrderContext
  operatorId: string
}) {
  const { tx, buckets, order, operatorId } = params
  const countHoldUpdates = buildInventoryCountHoldBucketUpdates(buckets)

  if (countHoldUpdates.length === 0) {
    return
  }

  for (const bucket of buckets) {
    if (countScopeExcludedBucketTypes.includes(bucket.bucketType as never)) {
      continue
    }

    await createCountHoldEvents({
      tenantId: bucket.tenantId,
      clientId: bucket.clientId,
      warehouseId: bucket.warehouseId,
      locationId: bucket.locationId,
      skuId: bucket.skuId,
      skuCode: bucket.skuCode,
      batchNumber: bucket.batchNumber,
      lpn: bucket.lpn,
      asnNumber: bucket.asnNumber,
      expiryDate: bucket.expiryDate,
      productionDate: bucket.productionDate,
      quantity: bucket.quantity,
      sourceBucketType: bucket.bucketType as BucketTypeValue,
      referenceType: 'INVENTORY_COUNT',
      referenceId: order.id,
      referenceNumber: order.orderNumber,
      operatorId,
    }, tx)
  }

  await updateBucketsInTransaction(countHoldUpdates, tx, {
    skipCountLocks: true,
  })
}
