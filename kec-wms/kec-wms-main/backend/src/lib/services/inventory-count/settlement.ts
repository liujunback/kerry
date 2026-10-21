import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import type { AuthUser } from '@/lib/auth/middleware'
import { withOrderLock } from '@/lib/services/inventory-lock-service'
import { executeInventoryCountAdjustmentForDetail } from '@/lib/services/inventory-count/adjustment'
import type {
  CompleteInventoryCountDisposalInput,
  ConfirmInventoryCountDifferencesInput,
} from '@/lib/validations/inventory-count'
import { refreshInventoryCountRollup } from '@/lib/services/inventory-count/rollup'
import {
  InventoryCountBatchStatus,
  InventoryCountBatchType,
  InventoryCountDetailStatus,
  InventoryCountDisposalStatus,
} from '@/lib/services/inventory-count/status'
import { assertOrderExecutable } from '@/lib/services/inventory-count/execution-guards'
import {
  appendInventoryCountOperationLog,
  getOperatorName,
} from '@/lib/services/inventory-count/operation-log'
import { loadInventoryCountOrderContext } from '@/lib/services/inventory-count/context'
import {
  ensureInventoryCountDisposals,
  finalizeInventoryCountReadyDetails,
  generateInventoryCountDisposals,
} from '@/lib/services/inventory-count/disposal'

export async function confirmInventoryCountDifferences(
  authUser: AuthUser,
  orderId: string,
  input: ConfirmInventoryCountDifferencesInput,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      const targetWhere: Prisma.InventoryCountDetailWhereInput = {
        orderId: order.id,
        tenantId: order.tenantId,
        ...(input.detailIds.length > 0 ? { id: { in: input.detailIds } } : { status: InventoryCountDetailStatus.RECOUNTED }),
      }

      let details = await tx.inventoryCountDetail.findMany({
        where: targetWhere,
      })

      if (details.length === 0) {
        details = await tx.inventoryCountDetail.findMany({
          where: {
            orderId: order.id,
            tenantId: order.tenantId,
            status: {
              in: [
                InventoryCountDetailStatus.RECOUNTED,
                InventoryCountDetailStatus.CONFIRMED,
              ],
            },
            diffQuantity: 0,
          },
        })
      }

      if (details.length === 0) {
        return refreshInventoryCountRollup(tx, order.id, authUser.id)
      }

      const invalid = details.find((detail) => ![
        InventoryCountDetailStatus.RECOUNTED,
        InventoryCountDetailStatus.CONFIRMED,
      ].includes(detail.status as never))

      if (invalid) {
        throw new Error('存在未完成复盘或状态不允许确认的明细')
      }

      const recountRoundLines = await tx.inventoryCountRoundLine.findMany({
        where: {
          detailId: {
            in: details
              .filter((detail) => detail.status === InventoryCountDetailStatus.RECOUNTED)
              .map((detail) => detail.id),
          },
          roundType: 'RECOUNT',
        },
        select: {
          batchId: true,
        },
      })
      const recountBatchIds = recountRoundLines.map((line) => line.batchId)
      if (recountBatchIds.length > 0) {
        const incompleteRecountBatch = await tx.inventoryCountBatch.findFirst({
          where: {
            id: {
              in: recountBatchIds,
            },
            batchType: InventoryCountBatchType.RECOUNT,
            status: {
              not: InventoryCountBatchStatus.COMPLETED,
            },
          },
          select: {
            id: true,
          },
        })

        if (incompleteRecountBatch) {
          throw new Error('请先完成复盘批次后再确认差异')
        }
      }

      const zeroDiffDetails = details.filter((detail) => (detail.diffQuantity || 0) === 0)
      const nonZeroDetails = details.filter((detail) => (detail.diffQuantity || 0) !== 0)
      const nonZeroRecountDetails = nonZeroDetails.filter((detail) => detail.status === InventoryCountDetailStatus.RECOUNTED)

      for (const detail of zeroDiffDetails) {
        await executeInventoryCountAdjustmentForDetail(tx, order, detail, null, authUser)
      }

      if (nonZeroRecountDetails.length > 0) {
        await tx.inventoryCountDetail.updateMany({
          where: {
            id: {
              in: nonZeroRecountDetails.map((detail) => detail.id),
            },
          },
          data: {
            status: InventoryCountDetailStatus.CONFIRMED,
          },
        })
      }

      if (nonZeroDetails.length > 0) {
        await generateInventoryCountDisposals(tx, order.id, authUser.id)
      }
      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}

export async function settleInventoryCountOrder(authUser: AuthUser, orderId: string, warehouseId?: string) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      let details = await tx.inventoryCountDetail.findMany({
        where: {
          orderId: order.id,
          tenantId: order.tenantId,
        },
      })

      if (details.length === 0) {
        throw new Error('盘点单没有可结算明细')
      }

      if (details.some((detail) => detail.status === InventoryCountDetailStatus.CONFIRMED && (detail.diffQuantity || 0) !== 0 && !detail.adjustmentId)) {
        await generateInventoryCountDisposals(tx, order.id, authUser.id)
        await finalizeInventoryCountReadyDetails(tx, order.id, authUser.id)
        details = await tx.inventoryCountDetail.findMany({
          where: {
            orderId: order.id,
            tenantId: order.tenantId,
          },
        })
      }

      if (details.some((detail) => (detail.diffQuantity || 0) !== 0 && detail.adjustmentId && !detail.disposalId)) {
        await ensureInventoryCountDisposals(tx, order.id, authUser.id)
        await finalizeInventoryCountReadyDetails(tx, order.id, authUser.id)
        details = await tx.inventoryCountDetail.findMany({
          where: {
            orderId: order.id,
            tenantId: order.tenantId,
          },
        })
      }

      const pendingDisposals = await tx.inventoryCountDisposal.findMany({
        where: {
          orderId: order.id,
          status: {
            in: [
              InventoryCountDisposalStatus.PENDING,
              InventoryCountDisposalStatus.PROCESSING,
            ],
          },
        },
        select: {
          disposalNumber: true,
          status: true,
        },
      })

      if (pendingDisposals.length > 0) {
        const first = pendingDisposals[0]
        throw new Error(`盘点差异处理单未完成，不能结算：${first.disposalNumber} ${first.status}`)
      }

      const unsettled = details.find((detail) => ![
        InventoryCountDetailStatus.CONFIRMED,
        InventoryCountDetailStatus.ADJUST_CREATED,
        InventoryCountDetailStatus.ADJUSTED,
      ].includes(detail.status as never))
      if (unsettled) {
        throw new Error(`盘点单仍有未生成调整单或未确认差异，不能结算：${unsettled.detailNumber} ${unsettled.status}`)
      }

      const adjustmentIds = details
        .map((detail) => detail.adjustmentId)
        .filter((value): value is string => !!value)
      const adjustments = adjustmentIds.length > 0
        ? await tx.inventoryAdjustment.findMany({
            where: {
              id: {
                in: adjustmentIds,
              },
              tenantId: order.tenantId,
            },
            select: {
              id: true,
              adjustmentNumber: true,
              status: true,
              reason: true,
            },
          })
        : []
      const adjustmentMap = new Map(adjustments.map((adjustment) => [adjustment.id, adjustment]))

      for (const detail of details) {
        if (detail.status === InventoryCountDetailStatus.ADJUSTED) {
          continue
        }

        const adjustment = detail.adjustmentId ? adjustmentMap.get(detail.adjustmentId) : null
        await executeInventoryCountAdjustmentForDetail(tx, order, detail, adjustment || null, authUser)
      }

      await tx.inventoryCountDetail.updateMany({
        where: {
          orderId: order.id,
          status: {
            in: [
              InventoryCountDetailStatus.CONFIRMED,
              InventoryCountDetailStatus.ADJUST_CREATED,
            ],
          },
        },
        data: {
          status: InventoryCountDetailStatus.ADJUSTED,
        },
      })

      await tx.inventoryCountBatch.updateMany({
        where: {
          orderId: order.id,
          status: {
            not: InventoryCountBatchStatus.CANCELLED,
          },
        },
        data: {
          status: InventoryCountBatchStatus.COMPLETED,
          completedAt: new Date(),
        },
      })

      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}

export async function startInventoryCountDisposal(
  authUser: AuthUser,
  orderId: string,
  disposalId: string,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      const disposal = await tx.inventoryCountDisposal.findFirst({
        where: {
          id: disposalId,
          orderId: order.id,
          tenantId: order.tenantId,
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (!disposal) {
        throw new Error('盘点差异处理单不存在')
      }
      if (disposal.status !== InventoryCountDisposalStatus.PENDING) {
        throw new Error('当前差异处理单状态不允许开始处理')
      }

      await tx.inventoryCountDisposal.updateMany({
        where: {
          id: disposal.id,
          status: InventoryCountDisposalStatus.PENDING,
        },
        data: {
          status: InventoryCountDisposalStatus.PROCESSING,
          assignedUserId: authUser.id,
          assignedUserName: authUser.name || authUser.username,
        },
      })

      await appendInventoryCountOperationLog(tx, {
        tenantId: order.tenantId,
        orderId: order.id,
        entityType: 'InventoryCountDisposal',
        entityId: disposal.id,
        operationType: 'DISPOSAL_STARTED',
        description: '开始处理差异单',
        operatorId: authUser.id,
        operatorName: getOperatorName(authUser),
      })

      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}

export async function completeInventoryCountDisposal(
  authUser: AuthUser,
  orderId: string,
  disposalId: string,
  input: CompleteInventoryCountDisposalInput,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      const disposal = await tx.inventoryCountDisposal.findFirst({
        where: {
          id: disposalId,
          orderId: order.id,
          tenantId: order.tenantId,
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (!disposal) {
        throw new Error('盘点差异处理单不存在')
      }
      if (![InventoryCountDisposalStatus.PENDING, InventoryCountDisposalStatus.PROCESSING].includes(disposal.status as never)) {
        throw new Error('当前差异处理单状态不允许完成')
      }

      const targetLocation = await tx.binLocation.findFirst({
        where: {
          tenantId: order.tenantId,
          warehouseId: order.warehouseId,
          locationCode: input.targetLocationCode,
          locationType: 'STAGING',
          status: 'ACTIVE',
          lockStatus: 'UNLOCKED',
        },
        select: {
          id: true,
          locationCode: true,
        },
      })

      if (!targetLocation) {
        throw new Error(`暂存货位不存在或不可用：${input.targetLocationCode}`)
      }

      await tx.inventoryCountDisposal.updateMany({
        where: {
          id: disposal.id,
          status: {
            in: [
              InventoryCountDisposalStatus.PENDING,
              InventoryCountDisposalStatus.PROCESSING,
            ],
          },
        },
        data: {
          status: InventoryCountDisposalStatus.DONE,
          assignedUserId: authUser.id,
          assignedUserName: authUser.name || authUser.username,
          targetLocationId: targetLocation.id,
          targetLocationCode: targetLocation.locationCode,
          processedAt: new Date(),
        },
      })

      await appendInventoryCountOperationLog(tx, {
        tenantId: order.tenantId,
        orderId: order.id,
        entityType: 'InventoryCountDisposal',
        entityId: disposal.id,
        operationType: 'DISPOSAL_COMPLETED',
        description: `完成差异处理，暂存货位：${targetLocation.locationCode}`,
        operatorId: authUser.id,
        operatorName: getOperatorName(authUser),
        metadata: {
          targetLocationCode: targetLocation.locationCode,
        },
      })

      await finalizeInventoryCountReadyDetails(tx, order.id, authUser.id)
      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}
