import { Prisma } from '@prisma/client'
import type { TransactionClient } from '@/lib/db/prisma'

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export function getOperatorName(user?: { name?: string | null; username?: string | null } | null) {
  return user?.name || user?.username || '系统'
}

export async function appendInventoryCountOperationLog(
  tx: TransactionClient,
  params: {
    tenantId: string
    orderId: string
    entityType: string
    entityId?: string | null
    operationType: string
    description: string
    operatorId?: string | null
    operatorName?: string | null
    metadata?: Record<string, unknown>
  }
) {
  await tx.inventoryCountOperationLog.create({
    data: {
      tenantId: params.tenantId,
      orderId: params.orderId,
      entityType: params.entityType,
      entityId: params.entityId || null,
      operationType: params.operationType,
      description: params.description,
      operatorId: params.operatorId || null,
      operatorName: params.operatorName || '系统',
      metadataJson: params.metadata ? toJsonValue(params.metadata) : Prisma.JsonNull,
      createdAt: new Date(),
    },
  })
}
