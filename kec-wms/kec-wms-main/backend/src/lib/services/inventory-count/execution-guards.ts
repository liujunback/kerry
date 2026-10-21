import type { TransactionClient } from '@/lib/db/prisma'
import { InventoryCountOrderStatus } from '@/lib/validations/inventory-count'
import type { InventoryCountOrderContext } from '@/lib/services/inventory-count/scope-generation'

export async function loadInventoryCountBatch(
  tx: TransactionClient,
  order: InventoryCountOrderContext,
  batchId: string
) {
  const batch = await tx.inventoryCountBatch.findFirst({
    where: {
      id: batchId,
      orderId: order.id,
      tenantId: order.tenantId,
    },
  })

  if (!batch) {
    throw new Error('盘点批次不存在')
  }

  return batch
}

export function assertOrderExecutable(order: InventoryCountOrderContext) {
  if ([InventoryCountOrderStatus.CANCELLED, InventoryCountOrderStatus.COMPLETED].includes(order.status as never)) {
    throw new Error('当前盘点单状态不允许执行')
  }
  if (![InventoryCountOrderStatus.READY, InventoryCountOrderStatus.IN_PROGRESS, InventoryCountOrderStatus.PENDING_ADJUST].includes(order.status as never)) {
    throw new Error('盘点单尚未生成可执行范围')
  }
}
