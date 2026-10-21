import type { TransactionClient } from '@/lib/db/prisma'
import type { InventoryCountOrderContext } from '@/lib/services/inventory-count/scope-generation'
import {
  InventoryCountBatchStatus,
  InventoryCountDetailStatus,
  InventoryCountRoundLineStatus,
} from '@/lib/services/inventory-count/status'
import { executeInventoryCountAdjustmentForDetail } from '@/lib/services/inventory-count/adjustment'
import {
  completeAffectedFirstBatches,
  createRecountBatchesForDetails,
} from '@/lib/services/inventory-count/recount-batch'
import { appendInventoryCountOperationLog } from '@/lib/services/inventory-count/operation-log'

export async function autoCompleteFirstBatchAfterSubmit(
  tx: TransactionClient,
  order: InventoryCountOrderContext,
  batchId: string
) {
  const roundLines = await tx.inventoryCountRoundLine.findMany({
    where: {
      batchId,
      orderId: order.id,
    },
    include: {
      detail: true,
    },
  })

  if (roundLines.length === 0 || roundLines.some((line) => line.status === InventoryCountRoundLineStatus.PENDING)) {
    return
  }

  const details = roundLines.map((line) => line.detail)
  for (const detail of details) {
    if (detail.status === InventoryCountDetailStatus.CONFIRMED && (detail.diffQuantity || 0) === 0) {
      await executeInventoryCountAdjustmentForDetail(tx, order, detail, null, {
        id: order.id,
        name: '系统',
      })
    }
  }

  const recountDetails = details.filter((detail) => detail.status === InventoryCountDetailStatus.RECOUNT_PENDING)
  if (recountDetails.length === 0) {
    await tx.inventoryCountBatch.update({
      where: { id: batchId },
      data: {
        status: InventoryCountBatchStatus.COMPLETED,
        completedAt: new Date(),
      },
    })
    await appendInventoryCountOperationLog(tx, {
      tenantId: order.tenantId,
      orderId: order.id,
      entityType: 'InventoryCountBatch',
      entityId: batchId,
      operationType: 'FIRST_BATCH_COMPLETED',
      description: '自动完成初盘批次：无差异明细已释放库存',
      operatorName: '系统',
    })
    return
  }

  await tx.inventoryCountBatch.update({
    where: { id: batchId },
    data: {
      status: InventoryCountBatchStatus.PENDING_RECOUNT,
      completedAt: new Date(),
    },
  })
  await createRecountBatchesForDetails(tx, order, recountDetails)
  await completeAffectedFirstBatches(tx, [batchId])
  await appendInventoryCountOperationLog(tx, {
    tenantId: order.tenantId,
    orderId: order.id,
    entityType: 'InventoryCountBatch',
    entityId: batchId,
    operationType: 'RECOUNT_BATCH_CREATED',
    description: `生成复盘批次：差异明细 ${recountDetails.length} 条`,
    operatorName: '系统',
    metadata: {
      detailCount: recountDetails.length,
    },
  })
}

export async function autoCompleteRecountBatchAfterSubmit(
  tx: TransactionClient,
  order: InventoryCountOrderContext,
  batchId: string
) {
  const roundLines = await tx.inventoryCountRoundLine.findMany({
    where: {
      batchId,
      orderId: order.id,
    },
    include: {
      detail: true,
    },
  })

  if (roundLines.length === 0 || roundLines.some((line) => line.status === InventoryCountRoundLineStatus.PENDING)) {
    return
  }

  const zeroDiffDetails = roundLines
    .map((line) => line.detail)
    .filter((detail) => (detail.diffQuantity || 0) === 0)

  for (const detail of zeroDiffDetails) {
    await executeInventoryCountAdjustmentForDetail(tx, order, detail, null, {
      id: order.id,
      name: '系统',
    })
  }

  await tx.inventoryCountBatch.update({
    where: { id: batchId },
    data: {
      status: InventoryCountBatchStatus.COMPLETED,
      completedAt: new Date(),
    },
  })

  await appendInventoryCountOperationLog(tx, {
    tenantId: order.tenantId,
    orderId: order.id,
    entityType: 'InventoryCountBatch',
    entityId: batchId,
    operationType: 'RECOUNT_BATCH_COMPLETED',
    description: '自动完成复盘批次',
    operatorName: '系统',
  })
}
