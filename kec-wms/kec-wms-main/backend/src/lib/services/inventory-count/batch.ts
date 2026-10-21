import { Prisma } from '@prisma/client'
import { prisma, type TransactionClient } from '@/lib/db/prisma'
import type { AuthUser } from '@/lib/auth/middleware'
import { withOrderLock } from '@/lib/services/inventory-lock-service'
import type {
  BulkUpdateInventoryCountBatchAssigneesInput,
  SubmitInventoryCountLineInput,
  UpdateInventoryCountBatchAssigneeInput,
} from '@/lib/validations/inventory-count'
import { refreshInventoryCountRollup } from '@/lib/services/inventory-count/rollup'
import {
  InventoryCountBatchStatus,
  InventoryCountBatchType,
  InventoryCountDetailStatus,
  InventoryCountRoundLineStatus,
} from '@/lib/services/inventory-count/status'
import {
  assertOrderExecutable,
  loadInventoryCountBatch,
} from '@/lib/services/inventory-count/execution-guards'
import {
  appendInventoryCountOperationLog,
  getOperatorName,
} from '@/lib/services/inventory-count/operation-log'
import { toJsonValue } from '@/lib/services/inventory-count/utils'
import {
  autoCompleteFirstBatchAfterSubmit,
  autoCompleteRecountBatchAfterSubmit,
} from '@/lib/services/inventory-count/batch-auto-complete'
import { loadInventoryCountOrderContext } from '@/lib/services/inventory-count/context'

const ASSIGNEE_MUTABLE_BATCH_STATUSES = [
  InventoryCountBatchStatus.READY,
  InventoryCountBatchStatus.IN_PROGRESS,
  InventoryCountBatchStatus.PENDING_RECOUNT,
  InventoryCountBatchStatus.RECOUNTING,
] as const

async function resolveInventoryCountAssignee(
  tx: TransactionClient,
  tenantId: string,
  userId?: string | null
) {
  if (!userId) {
    return null
  }

  const user = await tx.user.findFirst({
    where: {
      id: userId,
      tenantId,
      status: 'ACTIVE',
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  })

  if (!user) {
    throw new Error('盘点人不存在或已停用')
  }

  return {
    id: user.id,
    name: user.fullName || user.username,
  }
}

function buildBatchAssigneeUpdateData(
  batchType: string,
  assignee: { id: string; name: string } | null
): Prisma.InventoryCountBatchUncheckedUpdateInput {
  const userId = assignee?.id ?? null
  const userName = assignee?.name ?? null

  if (batchType === InventoryCountBatchType.RECOUNT) {
    return {
      counterUserId: userId,
      counterUserName: userName,
      reviewerUserId: userId,
      reviewerUserName: userName,
    }
  }

  return {
    counterUserId: userId,
    counterUserName: userName,
  }
}

function getBatchAssigneeChangeLabel(batchType: string) {
  return batchType === InventoryCountBatchType.RECOUNT ? '复盘人' : '初盘人'
}

function getCurrentBatchAssigneeName(batch: {
  batchType: string
  counterUserName: string | null
  reviewerUserName: string | null
}) {
  return batch.batchType === InventoryCountBatchType.RECOUNT
    ? batch.reviewerUserName
    : batch.counterUserName
}

function getInventoryCountExpiryDateKey(value: Date | string | null | undefined) {
  if (!value) {
    return '1000-01-01'
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '1000-01-01' : date.toISOString().slice(0, 10)
}

function normalizeSubmitScopeValue(value: string | null | undefined) {
  return value?.trim() || ''
}

function assertDetailMatchesSubmitScope(
  detail: {
    skuId: string
    locationId: string
    expiryDate: Date | string | null
    lpn: string
    batchNumber: string
    bucketType: string
  },
  scope: SubmitInventoryCountLineInput['scope'] | undefined
) {
  if (!scope) {
    return
  }

  const mismatches = [
    scope.locationId !== detail.locationId ? 'locationId' : '',
    scope.skuId !== detail.skuId ? 'skuId' : '',
    scope.batchNumber !== normalizeSubmitScopeValue(detail.batchNumber) ? 'batchNumber' : '',
    scope.lpn !== normalizeSubmitScopeValue(detail.lpn) ? 'lpn' : '',
    scope.bucketType !== detail.bucketType ? 'bucketType' : '',
    scope.expiryDateKey !== getInventoryCountExpiryDateKey(detail.expiryDate) ? 'expiryDateKey' : '',
  ].filter(Boolean)

  if (mismatches.length > 0) {
    throw new Error(`提交范围与盘点明细不一致：${mismatches.join('、')}`)
  }
}

function getExpectedRoundLineStatus() {
  return InventoryCountRoundLineStatus.PENDING
}

function getExpectedDetailStatus(roundType: 'FIRST' | 'RECOUNT') {
  return roundType === 'RECOUNT'
    ? InventoryCountDetailStatus.RECOUNT_PENDING
    : InventoryCountDetailStatus.PENDING
}

function getExecutableBatchTypes(roundType: 'FIRST' | 'RECOUNT') {
  return roundType === 'RECOUNT'
    ? [InventoryCountBatchType.RECOUNT]
    : [InventoryCountBatchType.FIRST]
}

function getExecutableBatchStatuses(roundType: 'FIRST' | 'RECOUNT') {
  return roundType === 'RECOUNT'
    ? [InventoryCountBatchStatus.READY, InventoryCountBatchStatus.RECOUNTING]
    : [InventoryCountBatchStatus.READY, InventoryCountBatchStatus.IN_PROGRESS]
}

function getNextBatchStatus(roundType: 'FIRST' | 'RECOUNT') {
  return roundType === 'RECOUNT'
    ? InventoryCountBatchStatus.RECOUNTING
    : InventoryCountBatchStatus.IN_PROGRESS
}

function distributeCountedQuantity<T extends { bookQuantity: number }>(
  details: T[],
  countedQuantity: number
) {
  const totalBookQuantity = details.reduce((sum, detail) => sum + detail.bookQuantity, 0)
  const quantityDelta = countedQuantity - totalBookQuantity

  if (quantityDelta === 0) {
    return details.map((detail) => ({
      detail,
      countedQuantity: detail.bookQuantity,
      diffQuantity: 0,
    }))
  }

  if (quantityDelta < 0) {
    let remainingShortage = Math.abs(quantityDelta)
    return details.map((detail) => {
      const shortageQty = Math.min(detail.bookQuantity, remainingShortage)
      remainingShortage -= shortageQty
      const detailCountedQuantity = detail.bookQuantity - shortageQty
      return {
        detail,
        countedQuantity: detailCountedQuantity,
        diffQuantity: detailCountedQuantity - detail.bookQuantity,
      }
    })
  }

  let remainingSurplus = quantityDelta
  return details.map((detail, index) => {
    const surplusQty = index === 0 ? remainingSurplus : 0
    remainingSurplus -= surplusQty
    const detailCountedQuantity = detail.bookQuantity + surplusQty
    return {
      detail,
      countedQuantity: detailCountedQuantity,
      diffQuantity: detailCountedQuantity - detail.bookQuantity,
    }
  })
}

export async function updateInventoryCountBatchAssignee(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  input: UpdateInventoryCountBatchAssigneeInput,
  warehouseId?: string
) {
  return updateInventoryCountBatchAssignees(authUser, orderId, {
    batchIds: [batchId],
    assigneeUserId: input.assigneeUserId,
  }, warehouseId)
}

export async function updateInventoryCountBatchAssignees(
  authUser: AuthUser,
  orderId: string,
  input: BulkUpdateInventoryCountBatchAssigneesInput,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)
  const batchIds = [...new Set(input.batchIds)]

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      const batches = await tx.inventoryCountBatch.findMany({
        where: {
          id: {
            in: batchIds,
          },
          orderId: order.id,
          tenantId: order.tenantId,
        },
        select: {
          id: true,
          batchNumber: true,
          batchType: true,
          status: true,
          counterUserId: true,
          counterUserName: true,
          reviewerUserId: true,
          reviewerUserName: true,
        },
      })

      if (batches.length !== batchIds.length) {
        throw new Error('部分盘点批次不存在')
      }

      const immutableBatches = batches.filter((batch) => (
        !ASSIGNEE_MUTABLE_BATCH_STATUSES.includes(batch.status as never)
      ))
      if (immutableBatches.length > 0) {
        throw new Error(`以下批次已完成或已取消，不能修改盘点人：${immutableBatches.map((batch) => batch.batchNumber).join('、')}`)
      }

      const assignee = await resolveInventoryCountAssignee(tx, order.tenantId, input.assigneeUserId)
      const nextName = assignee?.name || '未指定'

      for (const batch of batches) {
        const label = getBatchAssigneeChangeLabel(batch.batchType)
        const previousName = getCurrentBatchAssigneeName(batch) || '未指定'

        await tx.inventoryCountBatch.update({
          where: { id: batch.id },
          data: buildBatchAssigneeUpdateData(batch.batchType, assignee),
        })

        await appendInventoryCountOperationLog(tx, {
          tenantId: order.tenantId,
          orderId: order.id,
          entityType: 'InventoryCountBatch',
          entityId: batch.id,
          operationType: 'BATCH_ASSIGNEE_UPDATED',
          description: `${label}切换：${batch.batchNumber}，${previousName} -> ${nextName}`,
          operatorId: authUser.id,
          operatorName: getOperatorName(authUser),
          metadata: {
            batchNumber: batch.batchNumber,
            batchType: batch.batchType,
            assigneeType: batch.batchType === InventoryCountBatchType.RECOUNT ? 'REVIEWER' : 'COUNTER',
            previousAssigneeName: previousName,
            nextAssigneeName: nextName,
          },
        })
      }

      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}

export async function startInventoryCountBatch(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      const batch = await loadInventoryCountBatch(tx, order, batchId)

      if (batch.status !== InventoryCountBatchStatus.READY) {
        throw new Error('当前批次状态不允许开始执行')
      }

      const nextBatchStatus = batch.batchType === InventoryCountBatchType.RECOUNT
        ? InventoryCountBatchStatus.RECOUNTING
        : InventoryCountBatchStatus.IN_PROGRESS

      await tx.inventoryCountBatch.update({
        where: { id: batch.id },
        data: {
          status: nextBatchStatus,
          startedAt: batch.startedAt || new Date(),
        },
      })

      await appendInventoryCountOperationLog(tx, {
        tenantId: order.tenantId,
        orderId: order.id,
        entityType: 'InventoryCountBatch',
        entityId: batch.id,
        operationType: batch.batchType === InventoryCountBatchType.RECOUNT ? 'RECOUNT_BATCH_STARTED' : 'FIRST_BATCH_STARTED',
        description: `${batch.batchType === InventoryCountBatchType.RECOUNT ? '开始复盘批次' : '开始初盘批次'}：${batch.batchNumber}`,
        operatorId: authUser.id,
        operatorName: getOperatorName(authUser),
      })

      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}

export async function submitInventoryCountTaskLines(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  input: SubmitInventoryCountLineInput,
  warehouseId?: string,
  options: { sourceType?: 'WEB' | 'PDA' | 'IMPORT' } = {}
) {
  return submitInventoryCountScopeLine(
    authUser,
    orderId,
    {
      ...input,
      detailIds: input.detailIds.length > 0 ? input.detailIds : [],
    },
    warehouseId,
    {
      ...options,
      batchId,
    }
  )
}

export async function submitInventoryCountScopeLine(
  authUser: AuthUser,
  orderId: string,
  input: SubmitInventoryCountLineInput,
  warehouseId?: string,
  options: { sourceType?: 'WEB' | 'PDA' | 'IMPORT'; batchId?: string } = {}
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)

      const uniqueDetailIds = [...new Set(input.detailIds)]
      let details = uniqueDetailIds.length > 0
        ? await tx.inventoryCountDetail.findMany({
            where: {
              id: { in: uniqueDetailIds },
              orderId: order.id,
              tenantId: order.tenantId,
            },
            orderBy: [
              { detailNumber: 'asc' },
            ],
          })
        : []

      if (uniqueDetailIds.length > 0 && details.length !== uniqueDetailIds.length) {
        throw new Error('部分盘点明细不存在')
      }

      if (uniqueDetailIds.length === 0 && input.scope) {
        const scope = input.scope
        if (!input.roundType) {
          throw new Error('按汇总范围提交盘点结果必须指定盘点轮次')
        }
        const scopeCandidates = await tx.inventoryCountDetail.findMany({
          where: {
            orderId: order.id,
            tenantId: order.tenantId,
            locationId: scope.locationId,
            skuId: scope.skuId,
            batchNumber: scope.batchNumber,
            lpn: scope.lpn,
            bucketType: scope.bucketType,
            status: getExpectedDetailStatus(input.roundType),
          },
          orderBy: [
            { detailNumber: 'asc' },
          ],
        })
        details = scopeCandidates.filter((detail) => (
          getInventoryCountExpiryDateKey(detail.expiryDate) === scope.expiryDateKey
        ))
      }

      if (details.length === 0) {
        throw new Error('盘点明细不存在')
      }

      for (const detail of details) {
        assertDetailMatchesSubmitScope(detail, input.scope)
      }

      const roundType = input.roundType || 'FIRST'
      const roundLines = await tx.inventoryCountRoundLine.findMany({
        where: {
          orderId: order.id,
          tenantId: order.tenantId,
          detailId: {
            in: details.map((detail) => detail.id),
          },
          roundType,
          status: getExpectedRoundLineStatus(),
          ...(options.batchId ? { batchId: options.batchId } : {}),
        },
      })
      if (roundLines.length !== details.length) {
        throw new Error('部分盘点明细缺少可提交的轮次明细')
      }
      const roundLineMap = new Map(roundLines.map((roundLine) => [roundLine.detailId, roundLine]))
      const batchIds = [...new Set(roundLines.map((roundLine) => roundLine.batchId))]
      const batches = await tx.inventoryCountBatch.findMany({
        where: {
          id: { in: batchIds },
          orderId: order.id,
          tenantId: order.tenantId,
        },
      })
      if (batches.length !== batchIds.length) {
        throw new Error('部分盘点批次不存在')
      }
      const batchMap = new Map(batches.map((batch) => [batch.id, batch]))
      const executableBatchTypes = getExecutableBatchTypes(roundType)
      const executableBatchStatuses = getExecutableBatchStatuses(roundType)
      const invalidBatch = batches.find((batch) => (
        !executableBatchTypes.includes(batch.batchType as never) ||
        !executableBatchStatuses.includes(batch.status as never)
      ))
      if (invalidBatch) {
        throw new Error(`当前批次状态不允许提交盘点结果：${invalidBatch.batchNumber} ${invalidBatch.status}`)
      }

      const invalidDetail = details.find((detail) => (
        detail.status !== getExpectedDetailStatus(roundType)
      ))
      if (invalidDetail) {
        throw new Error(
          roundType === 'FIRST'
            ? `明细 ${invalidDetail.detailNumber} 状态不允许提交初盘结果`
            : `明细 ${invalidDetail.detailNumber} 状态不允许提交复盘结果`
        )
      }

      const nextBatchStatus = getNextBatchStatus(roundType)
      for (const batch of batches) {
        if (batch.status !== InventoryCountBatchStatus.READY) {
          continue
        }
        await tx.inventoryCountBatch.update({
          where: { id: batch.id },
          data: {
            status: nextBatchStatus,
            startedAt: batch.startedAt || new Date(),
          },
        })
      }

      const submittedAt = new Date()
      const fifoSortedDetails = [...details].sort((left, right) => left.detailNumber.localeCompare(right.detailNumber))
      const countedQuantityPlan = distributeCountedQuantity(fifoSortedDetails, input.countedQuantity)
      const updatedDetails = []

      for (const item of countedQuantityPlan) {
        const { detail, countedQuantity, diffQuantity } = item
        const roundLine = roundLineMap.get(detail.id)
        if (!roundLine) {
          throw new Error(`盘点明细缺少可提交轮次：${detail.detailNumber}`)
        }
        const batch = batchMap.get(roundLine.batchId)
        if (!batch) {
          throw new Error(`盘点轮次缺少批次信息：${detail.detailNumber}`)
        }
        const nextDetailStatus = roundType === 'RECOUNT'
          ? InventoryCountDetailStatus.RECOUNTED
          : diffQuantity === 0
            ? InventoryCountDetailStatus.CONFIRMED
            : InventoryCountDetailStatus.RECOUNT_PENDING
        const scanPayload = input.scanPayload || details.length > 1
          ? {
              ...(input.scanPayload || {}),
              groupCountedQuantity: input.countedQuantity,
              groupDetailIds: details.map((targetDetail) => targetDetail.id),
              groupScope: input.scope,
            }
          : undefined

        const record = await tx.inventoryCountRecord.create({
          data: {
            tenantId: order.tenantId,
            orderId: order.id,
            batchId: batch.id,
            detailId: detail.id,
            roundLineId: roundLine.id,
            roundType,
            sourceType: options.sourceType || 'WEB',
            countedQuantity,
            diffQuantity,
            isEmptyLocation: input.isEmptyLocation,
            exceptionReasonCode: input.exceptionReasonCode,
            remark: input.remark,
            scanPayloadJson: scanPayload ? toJsonValue(scanPayload) : undefined,
            actorUserId: authUser.id,
            actorUserName: authUser.name || authUser.username,
            submittedAt,
          } as Prisma.InventoryCountRecordUncheckedCreateInput,
          select: {
            id: true,
          },
        })
        await tx.inventoryCountRoundLine.update({
          where: { id: roundLine.id },
          data: {
            status: roundType === 'FIRST' && diffQuantity !== 0
              ? InventoryCountRoundLineStatus.RECOUNT_REQUIRED
              : InventoryCountRoundLineStatus.CONFIRMED,
            countedQuantity,
            diffQuantity,
            isEmptyLocation: input.isEmptyLocation,
            exceptionReasonCode: input.exceptionReasonCode,
            exceptionRemark: input.remark,
            counterUserId: authUser.id,
            counterUserName: authUser.name || authUser.username,
            countedAt: submittedAt,
            lastRecordId: record.id,
          },
        })
        const updatedDetail = await tx.inventoryCountDetail.update({
          where: { id: detail.id },
          data: {
            finalQuantity: countedQuantity,
            diffQuantity,
            status: nextDetailStatus,
          },
        })
        updatedDetails.push(updatedDetail)

        await appendInventoryCountOperationLog(tx, {
          tenantId: order.tenantId,
          orderId: order.id,
          entityType: 'InventoryCountDetail',
          entityId: detail.id,
          operationType: roundType === 'RECOUNT' ? 'RECOUNT_SUBMITTED' : 'FIRST_COUNT_SUBMITTED',
          description: `${roundType === 'RECOUNT' ? '提交复盘' : '提交初盘'}：明细 ${detail.detailNumber}，账面 ${detail.bookQuantity}，实盘 ${countedQuantity}，差异 ${diffQuantity}`,
          operatorId: authUser.id,
          operatorName: getOperatorName(authUser),
          metadata: {
            detailNumber: detail.detailNumber,
            bookQuantity: detail.bookQuantity,
            countedQuantity,
            groupCountedQuantity: details.length > 1 ? input.countedQuantity : undefined,
            diffQuantity,
            batchNumber: batch.batchNumber,
          },
        })
      }

      for (const batch of batches) {
        if (batch.batchType === InventoryCountBatchType.FIRST) {
          await autoCompleteFirstBatchAfterSubmit(tx, order, batch.id)
        } else {
          await autoCompleteRecountBatchAfterSubmit(tx, order, batch.id)
        }
      }

      await refreshInventoryCountRollup(tx, order.id, authUser.id)
      return updatedDetails
    })
  ))
}

export async function completeInventoryCountBatch(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  warehouseId?: string
) {
  const order = await loadInventoryCountOrderContext(authUser, orderId, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      assertOrderExecutable(order)
      const batch = await loadInventoryCountBatch(tx, order, batchId)

      if ([InventoryCountBatchStatus.COMPLETED, InventoryCountBatchStatus.CANCELLED].includes(batch.status as never)) {
        throw new Error('当前批次状态不允许完成')
      }

      const roundLines = await tx.inventoryCountRoundLine.findMany({
        where: {
          batchId: batch.id,
          orderId: order.id,
        },
        select: {
          status: true,
        },
      })

      if (roundLines.length === 0) {
        throw new Error('当前批次没有可完成明细')
      }

      if (batch.batchType === InventoryCountBatchType.FIRST) {
        if (roundLines.some((line) => line.status === InventoryCountRoundLineStatus.PENDING)) {
          throw new Error('当前批次仍有未提交盘点明细')
        }
        const hasPendingRecount = roundLines.some((line) => line.status === InventoryCountRoundLineStatus.RECOUNT_REQUIRED)
        await tx.inventoryCountBatch.update({
          where: { id: batch.id },
          data: {
            status: hasPendingRecount
              ? InventoryCountBatchStatus.PENDING_RECOUNT
              : InventoryCountBatchStatus.COMPLETED,
            completedAt: new Date(),
          },
        })
      } else {
        if (roundLines.some((line) => line.status === InventoryCountRoundLineStatus.PENDING)) {
          throw new Error('当前复盘批次仍有未提交明细')
        }

        await tx.inventoryCountBatch.update({
          where: { id: batch.id },
          data: {
            status: InventoryCountBatchStatus.COMPLETED,
            completedAt: new Date(),
          },
        })
      }

      return refreshInventoryCountRollup(tx, order.id, authUser.id)
    })
  ))
}
