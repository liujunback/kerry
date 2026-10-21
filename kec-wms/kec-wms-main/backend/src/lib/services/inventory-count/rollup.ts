import type { TransactionClient } from '@/lib/db/prisma'
import { InventoryCountOrderStatus } from '@/lib/validations/inventory-count'
import {
  InventoryCountBatchStatus,
  InventoryCountDetailStatus,
} from '@/lib/services/inventory-count/status'

export async function refreshInventoryCountRollup(
  tx: TransactionClient,
  orderId: string,
  updatedBy?: string
) {
  const [order, batches, initialDetails] = await Promise.all([
    tx.inventoryCountOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
      },
    }),
    tx.inventoryCountBatch.findMany({
      where: { orderId },
      select: {
        id: true,
        status: true,
      },
    }),
    tx.inventoryCountDetail.findMany({
      where: { orderId },
      select: {
        id: true,
        status: true,
        diffQuantity: true,
      },
    }),
  ])

  if (!order || order.status === InventoryCountOrderStatus.CANCELLED) {
    return null
  }

  const details = initialDetails
  const completedStatuses = new Set([
    InventoryCountDetailStatus.CONFIRMED,
    InventoryCountDetailStatus.ADJUST_CREATED,
    InventoryCountDetailStatus.ADJUSTED,
  ])
  const hasWorkingBatch = batches.some((batch) => [
    InventoryCountBatchStatus.IN_PROGRESS,
    InventoryCountBatchStatus.PENDING_RECOUNT,
    InventoryCountBatchStatus.RECOUNTING,
  ].includes(batch.status as never))
  const allBatchesCompleted = batches.length > 0 && batches.every((batch) => batch.status === InventoryCountBatchStatus.COMPLETED)
  const allBatchReady = batches.length > 0 && batches.every((batch) => batch.status === InventoryCountBatchStatus.READY)

  const hasDetails = details.length > 0
  const hasStartedDetail = details.some((detail) => detail.status !== InventoryCountDetailStatus.PENDING)
  const allAdjusted = hasDetails && details.every((detail) => detail.status === InventoryCountDetailStatus.ADJUSTED)
  const allConfirmed = hasDetails && details.every((detail) => completedStatuses.has(detail.status as never))

  let nextStatus = order.status
  if (allAdjusted) {
    nextStatus = InventoryCountOrderStatus.COMPLETED
  } else if (allConfirmed && allBatchesCompleted) {
    nextStatus = InventoryCountOrderStatus.PENDING_ADJUST
  } else if (hasWorkingBatch || hasStartedDetail) {
    nextStatus = InventoryCountOrderStatus.IN_PROGRESS
  } else if (allBatchReady) {
    nextStatus = InventoryCountOrderStatus.READY
  }

  return tx.inventoryCountOrder.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      totalBatchCount: batches.length,
      completedBatchCount: batches.filter((batch) => batch.status === InventoryCountBatchStatus.COMPLETED).length,
      totalDetailCount: details.length,
      diffDetailCount: details.filter((detail) => (detail.diffQuantity || 0) !== 0).length,
      pendingRecountCount: details.filter((detail) => detail.status === InventoryCountDetailStatus.RECOUNT_PENDING).length,
      pendingAdjustCount: details.filter((detail) => [
        InventoryCountDetailStatus.CONFIRMED,
        InventoryCountDetailStatus.ADJUST_CREATED,
      ].includes(detail.status as never)).length,
      updatedBy: updatedBy || undefined,
    },
  })
}
