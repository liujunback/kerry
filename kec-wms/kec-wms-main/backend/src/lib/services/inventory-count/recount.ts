import { prisma } from '@/lib/db/prisma'
import type { AuthUser } from '@/lib/auth/middleware'
import { withOrderLock } from '@/lib/services/inventory-lock-service'
import type { GenerateInventoryCountRecountsInput } from '@/lib/validations/inventory-count'
import { refreshInventoryCountRollup } from '@/lib/services/inventory-count/rollup'
import {
  InventoryCountBatchStatus,
  InventoryCountDetailStatus,
  InventoryCountRoundLineStatus,
} from '@/lib/services/inventory-count/status'
import { assertOrderExecutable } from '@/lib/services/inventory-count/execution-guards'
import {
  completeAffectedFirstBatches,
  createRecountBatchesForDetails,
} from '@/lib/services/inventory-count/recount-batch'
import { loadInventoryCountOrderContext } from '@/lib/services/inventory-count/context'

export async function generateInventoryCountRecounts(
  authUser: AuthUser,
  orderId: string,
  input: GenerateInventoryCountRecountsInput,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      const details = await tx.inventoryCountDetail.findMany({
        where: {
          orderId: order.id,
          tenantId: order.tenantId,
          status: InventoryCountDetailStatus.RECOUNT_PENDING,
          ...(input.detailIds.length > 0 ? { id: { in: input.detailIds } } : {}),
        },
        orderBy: [
          { locationCode: 'asc' },
          { skuCode: 'asc' },
          { detailNumber: 'asc' },
        ],
      })

      if (details.length === 0) {
        throw new Error('没有可生成复盘批次的差异明细')
      }

      const detailIds = details.map((detail) => detail.id)
      const existingRecountLine = await tx.inventoryCountRoundLine.findFirst({
        where: {
          detailId: { in: detailIds },
          roundType: 'RECOUNT',
        },
      })
      if (existingRecountLine) {
        throw new Error('部分差异明细已生成复盘批次')
      }

      const firstRoundLines = await tx.inventoryCountRoundLine.findMany({
        where: {
          detailId: { in: detailIds },
          roundType: 'FIRST',
        },
        include: {
          batch: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      })
      const incompleteFirstBatch = firstRoundLines.some((line) => {
        if (line.status !== InventoryCountRoundLineStatus.RECOUNT_REQUIRED) {
          return false
        }
        return ![InventoryCountBatchStatus.PENDING_RECOUNT, InventoryCountBatchStatus.COMPLETED].includes(line.batch.status as never)
      })

      if (incompleteFirstBatch) {
        throw new Error('请先完成初盘批次后再生成复盘批次')
      }

      await createRecountBatchesForDetails(tx, order, details)
      await completeAffectedFirstBatches(tx, firstRoundLines.map((line) => line.batchId))
      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}
