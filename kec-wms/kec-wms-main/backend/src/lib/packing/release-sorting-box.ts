import type { TransactionClient } from '@/lib/db/prisma'

type ReleaseSortingBoxParams = {
  tx: TransactionClient
  tenantId: string
  warehouseId: string
  targetContainer?: string | null
  operatorId?: string | null
}

export async function releaseSortingBoxForPickOrderCompletion(params: ReleaseSortingBoxParams) {
  const { tx, tenantId, warehouseId, targetContainer, operatorId } = params

  if (!targetContainer) {
    return
  }

  await tx.container.updateMany({
    where: {
      tenantId,
      warehouseId,
      containerCode: targetContainer,
      containerType: 'SORTING_BOX',
      workStatus: 'OCCUPIED',
    },
    data: {
      workStatus: 'IDLE',
      closedAt: null,
      currentAsnId: null,
      currentBatchNumber: null,
      currentQualityStatus: null,
      currentSkuId: null,
      updatedBy: operatorId || undefined,
    },
  })
}
