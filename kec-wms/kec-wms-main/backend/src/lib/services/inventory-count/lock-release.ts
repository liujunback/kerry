import type { TransactionClient } from '@/lib/db/prisma'
import { triggerSnapshotUpdate } from '@/lib/services/inventory-snapshot-service'
import {
  BucketType,
  type BucketTypeValue,
  createCountReleaseEvents,
} from '@/lib/services/inventory-event-service'
import {
  appendInventoryCountOperationLog,
  getOperatorName,
} from '@/lib/services/inventory-count/operation-log'

function toExpiryDateKey(date: Date | string | null | undefined) {
  if (!date) {
    return '1000-01-01'
  }
  const normalized = date instanceof Date ? new Date(date) : new Date(date)
  return Number.isNaN(normalized.getTime()) ? '1000-01-01' : normalized.toISOString().slice(0, 10)
}

export interface InventoryCountDetailEntity {
  id: string
  tenantId: string
  clientId: string | null
  warehouseId: string
  locationId: string
  locationCode: string
  skuId: string
  skuCode: string
  batchNumber: string
  lpn: string
  bucketType: string
  expiryDate: Date | null
  productionDate: Date | null
  bookQuantity: number
  finalQuantity: number | null
  diffQuantity: number | null
  status: string
  adjustmentId: string | null
  disposalId: string | null
  detailNumber: string
}

export async function releaseInventoryCountDetailLock(
  tx: TransactionClient,
  detail: InventoryCountDetailEntity,
  lock: {
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
  },
  actor: {
    id: string
    name?: string
    username?: string
  },
  referenceNumber: string,
  options: { releaseLock?: boolean } = {}
) {
  if (lock.status !== 'ACTIVE') {
    return
  }

  if (detail.id !== lock.detailId) {
    throw new Error(`盘点锁与明细不匹配，无法释放库存：${lock.id}`)
  }

  const sourceBucket = await tx.inventoryBucket.findFirst({
    where: {
      id: lock.sourceBucketId,
      tenantId: lock.tenantId,
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

  if (!sourceBucket) {
    throw new Error(`盘点锁来源库存桶不存在，无法释放库存：明细 ${detail.detailNumber}，来源桶 ${lock.sourceBucketId}`)
  }

  const sameDate = (left: Date | null, right: Date | null) => {
    if (!left && !right) return true
    if (!left || !right) return false
    return left.getTime() === right.getTime()
  }

  const mismatches = [
    sourceBucket.locationId !== detail.locationId ? 'locationId' : '',
    sourceBucket.skuId !== detail.skuId ? 'skuId' : '',
    sourceBucket.batchNumber !== detail.batchNumber ? 'batchNumber' : '',
    sourceBucket.lpn !== detail.lpn ? 'lpn' : '',
    !sameDate(sourceBucket.expiryDate, detail.expiryDate) ? 'expiryDate' : '',
    sourceBucket.bucketType !== detail.bucketType ? 'bucketType' : '',
    lock.bucketType !== detail.bucketType ? 'lock.bucketType' : '',
  ].filter(Boolean)

  if (mismatches.length > 0) {
    throw new Error(`盘点锁来源库存桶维度不一致，无法释放库存：明细 ${detail.detailNumber}，字段 ${mismatches.join('、')}`)
  }

  const commonBucket = {
    tenantId: sourceBucket.tenantId,
    warehouseId: sourceBucket.warehouseId,
    zoneId: sourceBucket.zoneId,
    locationId: sourceBucket.locationId,
    skuId: sourceBucket.skuId,
    skuCode: sourceBucket.skuCode,
    clientId: sourceBucket.clientId,
    batchNumber: sourceBucket.batchNumber,
    lpn: sourceBucket.lpn,
    asnNumber: sourceBucket.asnNumber,
    expiryDate: sourceBucket.expiryDate,
    productionDate: sourceBucket.productionDate,
    fifoDate: sourceBucket.fifoDate,
  }

  const countHoldBucket = await tx.inventoryBucket.findFirst({
    where: {
      tenantId: sourceBucket.tenantId,
      warehouseId: sourceBucket.warehouseId,
      locationId: sourceBucket.locationId,
      skuId: sourceBucket.skuId,
      batchNumber: sourceBucket.batchNumber,
      lpn: sourceBucket.lpn,
      asnNumber: sourceBucket.asnNumber,
      expiryDate: sourceBucket.expiryDate,
      bucketType: BucketType.COUNT_HOLD,
      quantity: {
        gte: lock.lockedQuantity,
      },
    },
    select: {
      id: true,
      quantity: true,
    },
    orderBy: {
      quantity: 'desc',
    },
  })

  if (!countHoldBucket) {
    const existingCountHoldBucket = await tx.inventoryBucket.findFirst({
      where: {
        tenantId: sourceBucket.tenantId,
        warehouseId: sourceBucket.warehouseId,
        locationId: sourceBucket.locationId,
        skuId: sourceBucket.skuId,
        batchNumber: sourceBucket.batchNumber,
        lpn: sourceBucket.lpn,
        asnNumber: sourceBucket.asnNumber,
        expiryDate: sourceBucket.expiryDate,
        bucketType: BucketType.COUNT_HOLD,
      },
      select: {
        id: true,
        quantity: true,
      },
      orderBy: {
        quantity: 'desc',
      },
    })

    throw new Error(
      `盘点冻结桶与锁记录不一致，无法释放库存：明细 ${detail.detailNumber}，锁 ${lock.id}，冻结桶 ${existingCountHoldBucket?.id || '-'}，当前冻结数量 ${existingCountHoldBucket?.quantity || 0}，需释放 ${lock.lockedQuantity}`
    )
  }

  await createCountReleaseEvents({
    ...commonBucket,
    quantity: lock.lockedQuantity,
    targetBucketType: detail.bucketType as BucketTypeValue,
    referenceType: 'INVENTORY_COUNT',
    referenceId: lock.orderId,
    referenceNumber,
    referenceLineId: detail.id,
    reasonDescription: `盘点单 ${referenceNumber} 释放盘点冻结`,
    operatorId: actor.id,
  }, tx)

  const releasedHoldRows = await tx.$executeRaw`
    UPDATE inventory_bucket
    SET quantity = quantity - ${lock.lockedQuantity},
        version = version + 1,
        updated_at = NOW()
    WHERE id = ${countHoldBucket.id}
      AND bucket_type = ${BucketType.COUNT_HOLD}
      AND quantity >= ${lock.lockedQuantity}
  `

  if (releasedHoldRows === 0) {
    throw new Error(`盘点冻结桶扣减失败：明细 ${detail.detailNumber}，冻结桶 ${countHoldBucket.id}，需释放 ${lock.lockedQuantity}`)
  }

  const restoredRows = await tx.$executeRaw`
    UPDATE inventory_bucket
    SET quantity = quantity + ${lock.lockedQuantity},
        version = version + 1,
        updated_at = NOW()
    WHERE id = ${sourceBucket.id}
      AND bucket_type = ${sourceBucket.bucketType}
  `

  if (restoredRows === 0) {
    throw new Error(`盘点锁来源库存桶回写失败：明细 ${detail.detailNumber}，来源桶 ${sourceBucket.id}`)
  }

  if (options.releaseLock ?? true) {
    await tx.inventoryCountLock.updateMany({
      where: {
        id: lock.id,
        status: 'ACTIVE',
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedBy: actor.id,
      },
    })
    await deleteReleasedZeroCountHoldBucket(tx, sourceBucket)
  }

  setImmediate(() => {
    void triggerSnapshotUpdate(commonBucket)
  })

  await appendInventoryCountOperationLog(tx, {
    tenantId: detail.tenantId,
    orderId: lock.orderId,
    entityType: 'InventoryCountDetail',
    entityId: detail.id,
    operationType: 'COUNT_HOLD_RELEASE',
    description: `释放盘点冻结：明细 ${detail.detailNumber}，数量 ${lock.lockedQuantity}`,
    operatorId: actor.id,
    operatorName: getOperatorName(actor),
    metadata: {
      detailNumber: detail.detailNumber,
      quantity: lock.lockedQuantity,
      sourceBucketId: sourceBucket.id,
      bucketType: sourceBucket.bucketType,
    },
  })
}

export async function deleteReleasedZeroCountHoldBucket(
  tx: TransactionClient,
  sourceBucket: {
    tenantId: string
    warehouseId: string
    locationId: string
    skuId: string
    batchNumber: string
    lpn: string
    asnNumber: string
    expiryDate: Date | null
  }
) {
  const expiryDateKey = toExpiryDateKey(sourceBucket.expiryDate)
  await tx.$executeRaw`
    DELETE b
    FROM inventory_bucket b
    WHERE b.tenant_id = ${sourceBucket.tenantId}
      AND b.warehouse_id = ${sourceBucket.warehouseId}
      AND b.location_id = ${sourceBucket.locationId}
      AND b.sku_id = ${sourceBucket.skuId}
      AND b.batch_number = ${sourceBucket.batchNumber}
      AND b.lpn = ${sourceBucket.lpn}
      AND b.asn_number = ${sourceBucket.asnNumber}
      AND b.expiry_date_key = ${expiryDateKey}
      AND b.bucket_type = ${BucketType.COUNT_HOLD}
      AND b.quantity = 0
  `
}
