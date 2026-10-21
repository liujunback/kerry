import { prismaRead } from '@/lib/db/prisma'
import { BucketType, type BucketTypeValue } from '@/lib/services/inventory-event-service'

const INVENTORY_COUNT_LOCK_ERROR_PREFIX = 'INVENTORY_COUNT_LOCKED:'

interface CountLockGuardParams {
  tenantId: string
  warehouseId: string
  locationId: string
  skuId: string
  bucketType: BucketTypeValue
  sourceBucketId?: string | null
  clientId?: string | null
}

function buildLockedMessage(bucketType: string) {
  if (bucketType === BucketType.COUNT_HOLD) {
    return '当前库存已处于盘点锁定状态，禁止直接变更'
  }

  return '当前库存已被盘点锁定，禁止变更'
}

export function toInventoryCountLockError(message: string) {
  return `${INVENTORY_COUNT_LOCK_ERROR_PREFIX}${message}`
}

export function extractInventoryCountLockMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null
  }

  if (!error.message.startsWith(INVENTORY_COUNT_LOCK_ERROR_PREFIX)) {
    return null
  }

  return error.message.slice(INVENTORY_COUNT_LOCK_ERROR_PREFIX.length)
}

export async function assertInventoryCountUnlocked(params: CountLockGuardParams) {
  if (params.bucketType === BucketType.COUNT_HOLD) {
    const countHoldLock = await prismaRead.inventoryCountLock.findFirst({
      where: {
        tenantId: params.tenantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        skuId: params.skuId,
        status: 'ACTIVE',
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
      select: {
        id: true,
      },
    })

    if (countHoldLock) {
      throw new Error(toInventoryCountLockError(buildLockedMessage(params.bucketType)))
    }

    return
  }

  const lock = params.sourceBucketId
    ? await prismaRead.inventoryCountLock.findFirst({
        where: {
          tenantId: params.tenantId,
          sourceBucketId: params.sourceBucketId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      })
    : await prismaRead.inventoryCountLock.findFirst({
        where: {
          tenantId: params.tenantId,
          warehouseId: params.warehouseId,
          locationId: params.locationId,
          skuId: params.skuId,
          bucketType: params.bucketType,
          status: 'ACTIVE',
          ...(params.clientId ? { clientId: params.clientId } : {}),
        },
        select: {
          id: true,
        },
      })

  if (lock) {
    throw new Error(toInventoryCountLockError(buildLockedMessage(params.bucketType)))
  }
}
