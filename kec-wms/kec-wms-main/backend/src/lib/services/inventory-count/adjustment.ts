import type { TransactionClient } from '@/lib/db/prisma'
import { updateBucketsInTransaction, type BucketUpdateParams } from '@/lib/services/inventory-bucket-service'
import {
  BucketType,
  type BucketTypeValue,
  createAdjustEvent,
} from '@/lib/services/inventory-event-service'
import { AdjustmentStatus, AdjustmentType } from '@/lib/validations/inventory'
import { InventoryCountDetailStatus } from '@/lib/services/inventory-count/status'
import {
  appendInventoryCountOperationLog,
  getOperatorName,
} from '@/lib/services/inventory-count/operation-log'
import {
  deleteReleasedZeroCountHoldBucket,
  releaseInventoryCountDetailLock,
  type InventoryCountDetailEntity,
} from '@/lib/services/inventory-count/lock-release'

type CountLockWithSource = {
  id: string
  tenantId: string
  orderId: string
  detailId: string | null
  warehouseId: string
  clientId: string | null
  locationId: string
  skuId: string
  sourceBucketId: string
  bucketType: string
  lockedQuantity: number
  status: string
  sourceBucket: {
    id: string
    tenantId: string
    clientId: string | null
    warehouseId: string
    zoneId: string
    locationId: string
    skuId: string
    skuCode: string
    batchNumber: string
    lpn: string
    asnNumber: string
    bucketType: string
    expiryDate: Date | null
    productionDate: Date | null
    fifoDate: Date | null
  }
}

type CountDifferenceTargetLocation = {
  locationId: string
  locationCode: string
  zoneId: string
}

function getCountDifferenceBucketType(diffQuantity: number): BucketTypeValue {
  return diffQuantity > 0 ? BucketType.COUNT_SURPLUS : BucketType.COUNT_SHORTAGE
}

function getFifoTime(value: Date | string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime()
}

function sortLocksByFifo(locks: CountLockWithSource[]) {
  return [...locks].sort((left, right) => {
    const fifoDiff = getFifoTime(left.sourceBucket.fifoDate) - getFifoTime(right.sourceBucket.fifoDate)
    if (fifoDiff !== 0) return fifoDiff
    const asnDiff = (left.sourceBucket.asnNumber || '').localeCompare(right.sourceBucket.asnNumber || '')
    if (asnDiff !== 0) return asnDiff
    return left.sourceBucket.id.localeCompare(right.sourceBucket.id)
  })
}

function toBucketParamsFromSource(
  sourceBucket: CountLockWithSource['sourceBucket'],
  quantityDelta: number,
  bucketType: BucketTypeValue,
  targetLocation?: CountDifferenceTargetLocation
): BucketUpdateParams {
  return {
    tenantId: sourceBucket.tenantId,
    warehouseId: sourceBucket.warehouseId,
    zoneId: targetLocation?.zoneId || sourceBucket.zoneId,
    locationId: targetLocation?.locationId || sourceBucket.locationId,
    skuId: sourceBucket.skuId,
    skuCode: sourceBucket.skuCode,
    clientId: sourceBucket.clientId || '',
    batchNumber: sourceBucket.batchNumber,
    lpn: sourceBucket.lpn,
    asnNumber: sourceBucket.asnNumber,
    expiryDate: sourceBucket.expiryDate,
    productionDate: sourceBucket.productionDate,
    fifoDate: sourceBucket.fifoDate,
    bucketType,
    quantityDelta,
  }
}

async function generateInventoryAdjustmentNumber(tx: TransactionClient, tenantId: string) {
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const count = await tx.inventoryAdjustment.count({
    where: {
      tenantId,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  })

  return `ADJ${dateStr}${String(count + 1).padStart(4, '0')}`
}

export async function createInventoryCountAdjustmentForDetail(
  tx: TransactionClient,
  order: {
    id: string
    tenantId: string
    orderNumber: string
    warehouseId: string
    warehouseName: string
  },
  detail: InventoryCountDetailEntity,
  actorUserId?: string,
  targetLocation?: CountDifferenceTargetLocation
) {
  if (detail.finalQuantity === null || detail.diffQuantity === null) {
    throw new Error(`盘点明细缺少最终实盘结果：${detail.detailNumber}`)
  }

  if (detail.adjustmentId) {
    const adjustment = await tx.inventoryAdjustment.findFirst({
      where: {
        id: detail.adjustmentId,
        tenantId: order.tenantId,
      },
      select: {
        id: true,
        adjustmentNumber: true,
        status: true,
        reason: true,
      },
    })
    if (adjustment) {
      if (detail.diffQuantity > 0 && targetLocation && adjustment.status === AdjustmentStatus.DRAFT) {
        await tx.inventoryAdjustmentLine.updateMany({
          where: {
            adjustmentId: adjustment.id,
          },
          data: {
            locationId: targetLocation.locationId,
            locationCode: targetLocation.locationCode,
            fromLocationId: detail.locationId,
            fromLocationCode: detail.locationCode,
            toLocationId: targetLocation.locationId,
            toLocationCode: targetLocation.locationCode,
          },
        })
      }
      return adjustment
    }
  }

  const adjustmentLocation = detail.diffQuantity > 0 && targetLocation
    ? targetLocation
    : {
        locationId: detail.locationId,
        locationCode: detail.locationCode,
      }
  const firstLock = await tx.inventoryCountLock.findFirst({
    where: {
      orderId: order.id,
      detailId: detail.id,
    },
    orderBy: {
      lockedAt: 'asc',
    },
    select: {
      sourceBucketId: true,
    },
  })
  if (!firstLock) {
    throw new Error(`盘点明细缺少锁定来源，无法生成调整单：${detail.detailNumber}`)
  }

  const adjustmentNumber = await generateInventoryAdjustmentNumber(tx, order.tenantId)
  const adjustment = await tx.inventoryAdjustment.create({
    data: {
      tenantId: order.tenantId,
      adjustmentNumber,
      warehouseId: order.warehouseId,
      warehouseName: order.warehouseName,
      status: AdjustmentStatus.DRAFT,
      adjustmentType: AdjustmentType.QUANTITY_ADJUST,
      reason: `盘点单 ${order.orderNumber} 差异调整`,
      totalItems: 1,
      totalQuantityChange: detail.diffQuantity,
      requestUserId: actorUserId || detail.tenantId,
      requestUserName: actorUserId ? '盘点确认人' : '系统',
      clientId: detail.clientId,
      createdBy: actorUserId || null,
      updatedBy: actorUserId || null,
      lines: {
        create: {
          inventoryId: firstLock.sourceBucketId,
          skuId: detail.skuId,
          skuCode: detail.skuCode,
          locationId: adjustmentLocation.locationId,
          locationCode: adjustmentLocation.locationCode,
          batchNumber: detail.batchNumber,
          quantityBefore: detail.bookQuantity,
          quantityChange: detail.diffQuantity,
          quantityAfter: detail.finalQuantity,
          reasonNotes: detail.diffQuantity > 0 ? '盘点盘盈' : '盘点盘亏',
          fromLocationId: detail.diffQuantity > 0 && targetLocation ? detail.locationId : null,
          fromLocationCode: detail.diffQuantity > 0 && targetLocation ? detail.locationCode : null,
          toLocationId: detail.diffQuantity > 0 && targetLocation ? targetLocation.locationId : null,
          toLocationCode: detail.diffQuantity > 0 && targetLocation ? targetLocation.locationCode : null,
          asnNumber: '',
          lpn: detail.lpn,
          expiryDate: detail.expiryDate,
          productionDate: detail.productionDate,
          bucketType: getCountDifferenceBucketType(detail.diffQuantity),
        },
      },
    },
    select: {
      id: true,
      adjustmentNumber: true,
      status: true,
      reason: true,
    },
  })

  await tx.inventoryCountDetail.update({
    where: { id: detail.id },
    data: {
      adjustmentId: adjustment.id,
      status: InventoryCountDetailStatus.ADJUST_CREATED,
    },
  })

  await appendInventoryCountOperationLog(tx, {
    tenantId: order.tenantId,
    orderId: order.id,
    entityType: 'InventoryAdjustment',
    entityId: adjustment.id,
    operationType: 'ADJUSTMENT_CREATED',
    description: `生成调整单：${adjustment.adjustmentNumber}，调整数量 ${detail.diffQuantity}`,
    operatorId: actorUserId || null,
    operatorName: actorUserId ? '盘点确认人' : '系统',
    metadata: {
      adjustmentNumber: adjustment.adjustmentNumber,
      detailNumber: detail.detailNumber,
      quantity: detail.diffQuantity,
    },
  })

  return adjustment
}

export async function executeInventoryCountAdjustmentForDetail(
  tx: TransactionClient,
  order: {
    id: string
    orderNumber: string
    tenantId: string
  },
  detail: InventoryCountDetailEntity,
  adjustment: {
    id: string
    adjustmentNumber: string
    status: string
    reason: string | null
  } | null,
  actor: {
    id: string
    name?: string
    username?: string
  },
  targetLocation?: CountDifferenceTargetLocation
) {
  if (detail.finalQuantity === null || detail.diffQuantity === null) {
    throw new Error(`盘点明细缺少最终实盘结果：${detail.detailNumber}`)
  }

  const activeLocks = await tx.inventoryCountLock.findMany({
    where: {
      orderId: order.id,
      detailId: detail.id,
      status: 'ACTIVE',
    },
  })

  if (activeLocks.length === 0) {
    if (detail.status === InventoryCountDetailStatus.ADJUSTED) {
      return
    }
    throw new Error(`盘点明细缺少有效锁定记录：${detail.detailNumber}`)
  }

  const sourceBuckets = await tx.inventoryBucket.findMany({
    where: {
      id: {
        in: activeLocks.map((lock) => lock.sourceBucketId),
      },
    },
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
      expiryDate: true,
      productionDate: true,
      fifoDate: true,
    },
  })
  const sourceBucketMap = new Map(sourceBuckets.map((bucket) => [bucket.id, bucket]))
  const locks = activeLocks.map((lock) => {
    const sourceBucket = sourceBucketMap.get(lock.sourceBucketId)
    if (!sourceBucket) {
      throw new Error(`盘点锁来源库存桶不存在：${lock.sourceBucketId}`)
    }
    return { ...lock, sourceBucket }
  }) as CountLockWithSource[]

  const releaseQuantity = Math.min(detail.finalQuantity, detail.bookQuantity)
  const shortageQuantity = Math.max(detail.bookQuantity - detail.finalQuantity, 0)
  const surplusQuantity = Math.max(detail.finalQuantity - detail.bookQuantity, 0)
  const bucketUpdates: BucketUpdateParams[] = []

  if ((shortageQuantity > 0 || surplusQuantity > 0) && !adjustment) {
    throw new Error(`盘点明细缺少关联调整单：${detail.detailNumber}`)
  }

  if (adjustment && adjustment.status !== AdjustmentStatus.DRAFT) {
    throw new Error(`盘点调整单状态不允许执行：${adjustment.adjustmentNumber}`)
  }

  const sortedLocks = sortLocksByFifo(locks)
  let remainingReleaseQuantity = releaseQuantity
  let remainingShortageQuantity = shortageQuantity

  for (const lock of sortedLocks) {
    const shortagePart = Math.min(lock.lockedQuantity, remainingShortageQuantity)
    remainingShortageQuantity -= shortagePart
    const releasableQuantity = Math.max(lock.lockedQuantity - shortagePart, 0)
    const releasePart = Math.min(releasableQuantity, remainingReleaseQuantity)
    remainingReleaseQuantity -= releasePart

    if (releasePart > 0) {
      await releaseInventoryCountDetailLock(tx, detail, {
        ...lock,
        lockedQuantity: releasePart,
      }, actor, order.orderNumber, {
        releaseLock: false,
      })
    }

    if (shortagePart > 0 && adjustment) {
      await createAdjustEvent({
        ...toBucketParamsFromSource(lock.sourceBucket, shortagePart, BucketType.COUNT_SHORTAGE),
        quantityDelta: shortagePart,
        referenceType: 'ADJUSTMENT',
        referenceId: adjustment.id,
        referenceNumber: adjustment.adjustmentNumber,
        referenceLineId: detail.id,
        reasonCode: 'COUNT_SHORTAGE',
        reasonDescription: adjustment.reason || `盘点单 ${order.orderNumber} 盘亏记录`,
        operatorId: actor.id,
      }, tx)

      bucketUpdates.push(
        toBucketParamsFromSource(lock.sourceBucket, -shortagePart, BucketType.COUNT_HOLD),
        toBucketParamsFromSource(lock.sourceBucket, shortagePart, BucketType.COUNT_SHORTAGE)
      )
    }
  }

  if (surplusQuantity > 0 && adjustment) {
    const sourceBucket = sortedLocks[0].sourceBucket
    await createAdjustEvent({
      ...toBucketParamsFromSource(sourceBucket, surplusQuantity, BucketType.COUNT_SURPLUS, targetLocation),
      quantityDelta: surplusQuantity,
      referenceType: 'ADJUSTMENT',
      referenceId: adjustment.id,
      referenceNumber: adjustment.adjustmentNumber,
      referenceLineId: detail.id,
      reasonCode: 'COUNT_SURPLUS',
      reasonDescription: adjustment.reason || `盘点单 ${order.orderNumber} 盘盈记录`,
      operatorId: actor.id,
    }, tx)

    bucketUpdates.push(toBucketParamsFromSource(sourceBucket, surplusQuantity, BucketType.COUNT_SURPLUS, targetLocation))
  }

  await updateBucketsInTransaction(bucketUpdates, tx, {
    skipCountLocks: true,
  })

  if (adjustment) {
    await tx.inventoryAdjustment.updateMany({
      where: {
        id: adjustment.id,
        status: AdjustmentStatus.DRAFT,
      },
      data: {
        status: AdjustmentStatus.EXECUTED,
        executeUserId: actor.id,
        executeUserName: actor.name || actor.username || '系统',
        executeTime: new Date(),
        updatedBy: actor.id,
      },
    })

    await appendInventoryCountOperationLog(tx, {
      tenantId: detail.tenantId,
      orderId: order.id,
      entityType: 'InventoryAdjustment',
      entityId: adjustment.id,
      operationType: 'ADJUSTMENT_EXECUTED',
      description: `执行调整单：${adjustment.adjustmentNumber}`,
      operatorId: actor.id,
      operatorName: getOperatorName(actor),
      metadata: {
        adjustmentNumber: adjustment.adjustmentNumber,
        detailNumber: detail.detailNumber,
      },
    })
  }

  await tx.inventoryCountLock.updateMany({
    where: {
      id: {
        in: sortedLocks.map((lock) => lock.id),
      },
      status: 'ACTIVE',
    },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
      releasedBy: actor.id,
    },
  })

  for (const lock of sortedLocks) {
    await deleteReleasedZeroCountHoldBucket(tx, lock.sourceBucket)
  }

  await tx.inventoryCountDetail.update({
    where: { id: detail.id },
    data: {
      status: InventoryCountDetailStatus.ADJUSTED,
      adjustmentId: adjustment?.id || detail.adjustmentId,
    },
  })
}
