import {
  acquireOrderLock,
  acquireInventoryLocks,
  LockAcquisitionError,
} from '@/lib/services/inventory-lock-service'

export const ORDER_EXECUTION_LOCK_CONFLICT_CODE = 'ORDER_EXECUTION_LOCK_CONFLICT'

export class OrderExecutionLockConflictError extends Error {
  orderIds: string[]
  code: string

  constructor(orderIds: string[]) {
    super('订单正在被其他流程处理，请稍后重试')
    this.name = 'OrderExecutionLockConflictError'
    this.orderIds = orderIds
    this.code = ORDER_EXECUTION_LOCK_CONFLICT_CODE
  }
}

const ORDER_EXECUTION_LOCK_TTL_MS = Math.max(
  Number(process.env.ORDER_EXECUTION_LOCK_TTL_MS) || 60 * 1000,
  10 * 1000
)
const ORDER_EXECUTION_LOCK_RETRY_COUNT = Math.max(
  Number(process.env.ORDER_EXECUTION_LOCK_RETRY_COUNT) || 0,
  0
)
const ORDER_EXECUTION_LOCK_RETRY_DELAY_MS = Math.max(
  Number(process.env.ORDER_EXECUTION_LOCK_RETRY_DELAY_MS) || 0,
  0
)

function normalizeOrderIds(orderIds: string[]) {
  return Array.from(new Set(orderIds.filter(Boolean))).sort()
}

export async function acquireOrderExecutionLocks(params: {
  tenantId: string
  orderIds: string[]
}) {
  const orderIds = normalizeOrderIds(params.orderIds)
  if (orderIds.length === 0) {
    return {
      orderIds,
      releaseAll: async () => {},
    }
  }

  try {
    const result = await acquireInventoryLocks(
      orderIds.map((orderId) => ({
        type: 'ORDER' as const,
        tenantId: params.tenantId,
        orderId,
      })),
      {
        ttlMs: ORDER_EXECUTION_LOCK_TTL_MS,
        retryCount: ORDER_EXECUTION_LOCK_RETRY_COUNT,
        retryDelayMs: ORDER_EXECUTION_LOCK_RETRY_DELAY_MS,
      }
    )

    return {
      orderIds,
      releaseAll: result.releaseAll,
    }
  } catch (error) {
    if (error instanceof LockAcquisitionError) {
      throw new OrderExecutionLockConflictError(orderIds)
    }
    throw error
  }
}

export async function acquireOrderExecutionLocksIndividually(params: {
  tenantId: string
  orderIds: string[]
}) {
  const orderIds = normalizeOrderIds(params.orderIds)
  const lockedOrderIds: string[] = []
  const conflictedOrderIds: string[] = []
  const locks: Array<{ release: () => Promise<boolean> }> = []

  try {
    for (const orderId of orderIds) {
      try {
        const lock = await acquireOrderLock(params.tenantId, orderId)
        if (!lock.acquired) {
          conflictedOrderIds.push(orderId)
          continue
        }
        locks.push({ release: lock.release })
        lockedOrderIds.push(orderId)
      } catch (error) {
        if (error instanceof LockAcquisitionError) {
          conflictedOrderIds.push(orderId)
          continue
        }
        throw error
      }
    }

    return {
      lockedOrderIds,
      conflictedOrderIds,
      releaseAll: async () => {
        for (const lock of [...locks].reverse()) {
          await lock.release()
        }
      },
    }
  } catch (error) {
    for (const lock of [...locks].reverse()) {
      await lock.release()
    }
    throw error
  }
}

export async function withOrderExecutionLocks<T>(
  params: {
    tenantId: string
    orderIds: string[]
  },
  handler: () => Promise<T>
): Promise<T> {
  const locks = await acquireOrderExecutionLocks(params)
  try {
    return await handler()
  } finally {
    await locks.releaseAll()
  }
}
