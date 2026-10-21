import type { TransactionClient } from '@/lib/db/prisma'
import type { InventoryCountOrderContext } from '@/lib/services/inventory-count/scope-generation'
import {
  InventoryCountBatchStatus,
  InventoryCountBatchType,
} from '@/lib/services/inventory-count/status'
import {
  getSequenceStart,
  parseExecutionConfig,
  toJsonValue,
} from '@/lib/services/inventory-count/utils'

export async function completeAffectedFirstBatches(
  tx: TransactionClient,
  batchIds: string[]
) {
  const uniqueBatchIds = [...new Set(batchIds.filter(Boolean))]
  if (uniqueBatchIds.length === 0) {
    return
  }

  await tx.inventoryCountBatch.updateMany({
    where: {
      id: {
        in: uniqueBatchIds,
      },
      batchType: InventoryCountBatchType.FIRST,
      status: InventoryCountBatchStatus.PENDING_RECOUNT,
    },
    data: {
      status: InventoryCountBatchStatus.COMPLETED,
      completedAt: new Date(),
    },
  })
}

export async function createRecountBatchesForDetails(
  tx: TransactionClient,
  order: InventoryCountOrderContext,
  details: Array<{
    id: string
    clientId: string | null
    clientName: string | null
    warehouseId: string
    locationId: string
    locationCode: string
    bookQuantity: number
  }>
) {
  if (details.length === 0) {
    return
  }

  const executionConfig = parseExecutionConfig(order.executionConfigJson, order.countMode)
  const batchSequence = await getSequenceStart(tx, 'batch', order.tenantId, order.warehouseCode)
  const batchPlans = new Map<string, typeof details>()
  for (const detail of details) {
    const key = `${detail.clientId}:${detail.warehouseId}:${detail.locationId}:RECOUNT`
    const current = batchPlans.get(key)
    if (current) {
      current.push(detail)
    } else {
      batchPlans.set(key, [detail])
    }
  }

  for (const batchDetails of batchPlans.values()) {
    const firstDetail = batchDetails[0]
    if (!firstDetail) {
      continue
    }

    const batchNumber = `${batchSequence.prefix}${String(batchSequence.next).padStart(6, '0')}`
    batchSequence.next += 1

    const createdBatch = await tx.inventoryCountBatch.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        batchNumber,
        batchType: InventoryCountBatchType.RECOUNT,
        status: InventoryCountBatchStatus.READY,
        warehouseId: firstDetail.warehouseId,
        clientId: firstDetail.clientId,
        clientName: firstDetail.clientName,
        scopeSummary: `${firstDetail.locationCode} 差异复盘`,
        scopeSnapshotJson: toJsonValue({
          locationId: firstDetail.locationId,
          locationCode: firstDetail.locationCode,
          clientId: firstDetail.clientId,
          clientName: firstDetail.clientName,
        }),
        counterUserId: executionConfig.reviewerUserId,
        counterUserName: executionConfig.reviewerUserName,
        reviewerUserId: executionConfig.reviewerUserId,
        reviewerUserName: executionConfig.reviewerUserName,
      },
      select: {
        id: true,
      },
    })

    for (const detail of batchDetails) {
      await tx.inventoryCountRoundLine.create({
        data: {
          tenantId: order.tenantId,
          orderId: order.id,
          detailId: detail.id,
          batchId: createdBatch.id,
          roundType: InventoryCountBatchType.RECOUNT,
          roundNo: 1,
          status: 'PENDING',
          bookQuantitySnapshot: detail.bookQuantity,
        },
      })
    }
  }
}
