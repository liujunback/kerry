import { Prisma } from '@prisma/client'
import {
  type InventoryCountExecutionConfig,
  InventoryCountMode,
  InventoryCountSplitRule,
} from '@/lib/validations/inventory-count'
import type { TransactionClient } from '@/lib/db/prisma'

export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function toCodePrefix(prefix: string, warehouseCode: string) {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  return `${prefix}-${warehouseCode}-${datePart}-`
}

export async function getSequenceStart(
  tx: TransactionClient,
  type: 'batch' | 'detail',
  tenantId: string,
  warehouseCode: string
) {
  const prefix = toCodePrefix(type === 'batch' ? 'BT' : 'DT', warehouseCode)
  const latest = type === 'batch'
    ? await tx.inventoryCountBatch.findFirst({
        where: {
          tenantId,
          batchNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          batchNumber: 'desc',
        },
        select: {
          batchNumber: true,
        },
      })
    : await tx.inventoryCountDetail.findFirst({
        where: {
          tenantId,
          detailNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          detailNumber: 'desc',
        },
        select: {
          detailNumber: true,
        },
      })

  const latestNumber = latest
    ? ('batchNumber' in latest ? latest.batchNumber : latest.detailNumber)
    : null
  const value = latestNumber
    ? Number.parseInt(latestNumber.slice(-6), 10) + 1
    : 1

  return {
    prefix,
    next: value,
  }
}

export function parseExecutionConfig(value: Prisma.JsonValue, countMode: string) {
  const fallback: InventoryCountExecutionConfig & {
    counterUserName?: string
    reviewerUserName?: string
  } = {
    splitRule: InventoryCountSplitRule.BY_LOCATION,
    allowPrint: false,
    pdaMode: countMode === InventoryCountMode.OPEN ? InventoryCountMode.OPEN : InventoryCountMode.BLIND,
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback
  }

  const data = value as Record<string, unknown>
  return {
    splitRule: InventoryCountSplitRule.BY_LOCATION,
    counterUserId: typeof data.counterUserId === 'string' ? data.counterUserId : undefined,
    reviewerUserId: typeof data.reviewerUserId === 'string' ? data.reviewerUserId : undefined,
    allowPrint: Boolean(data.allowPrint),
    pdaMode: data.pdaMode === InventoryCountMode.OPEN ? InventoryCountMode.OPEN : InventoryCountMode.BLIND,
    counterUserName: typeof data.counterUserName === 'string' ? data.counterUserName : undefined,
    reviewerUserName: typeof data.reviewerUserName === 'string' ? data.reviewerUserName : undefined,
  }
}
