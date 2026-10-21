import { prismaRead } from '@/lib/db/prisma'
import type { AuthUser } from '@/lib/auth/middleware'
import {
  completeInventoryCountBatch,
  startInventoryCountBatch,
  submitInventoryCountTaskLines,
} from '@/lib/services/inventory-count-service'
import {
  InventoryCountMode,
  submitInventoryCountLineSchema,
} from '@/lib/validations/inventory-count'
import { InventoryCountBatchType } from '@/lib/services/inventory-count/status'
import type { z } from 'zod'

const PDA_EXECUTABLE_ORDER_STATUSES = ['READY', 'IN_PROGRESS', 'PENDING_ADJUST']
const PDA_EXECUTABLE_BATCH_STATUSES = ['READY', 'IN_PROGRESS', 'RECOUNTING']

type SubmitInventoryCountLineInput = z.infer<typeof submitInventoryCountLineSchema>

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return String(value)
}

function expiryDateKey(value: Date | string | null | undefined) {
  const formatted = formatDate(value)
  return formatted ? formatted.slice(0, 10) : '1000-01-01'
}

function resolvePdaMode(executionConfigJson: unknown, countMode: string) {
  if (executionConfigJson && typeof executionConfigJson === 'object' && !Array.isArray(executionConfigJson)) {
    const data = executionConfigJson as Record<string, unknown>
    if (data.pdaMode === InventoryCountMode.OPEN) {
      return InventoryCountMode.OPEN
    }
    if (data.pdaMode === InventoryCountMode.BLIND) {
      return InventoryCountMode.BLIND
    }
  }

  return countMode === InventoryCountMode.OPEN ? InventoryCountMode.OPEN : InventoryCountMode.BLIND
}

function isPendingForOrder(status: string) {
  return status === 'PENDING' || status === 'RECOUNT_PENDING'
}

function compareLocationCode(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true })
}

function buildScopedOrderWhere(authUser: AuthUser, warehouseId?: string) {
  return {
    tenantId: authUser.tenantId,
    ...(warehouseId ? { warehouseId } : {}),
  }
}

function assertPdaBatchAssignee(authUser: AuthUser, batch: {
  batchType: string
  counterUserId?: string | null
  reviewerUserId?: string | null
}) {
  const assignedUserId = batch.batchType === InventoryCountBatchType.RECOUNT
    ? batch.reviewerUserId
    : batch.counterUserId

  if (assignedUserId !== authUser.id) {
    throw new Error('当前盘点批次未指派给当前账号')
  }
}

function buildSummary(order: {
  id: string
  orderNumber: string
  orderName: string
  orderType: string
  status: string
  countMode: string
  executionConfigJson: unknown
}, batch: {
  id: string
  batchNumber: string
  batchType: string
  status: string
  clientName: string | null
  scopeSummary: string
  startedAt: Date | null
  completedAt: Date | null
}, details: Array<{
  locationId: string
  skuId: string
  status: string
  diffQuantity: number | null
}>) {
  const totalDetailCount = details.length
  const pendingDetailCount = details.filter((detail) => isPendingForOrder(detail.status)).length
  const countedDetailCount = totalDetailCount - pendingDetailCount
  const diffDetailCount = details.filter((detail) => (detail.diffQuantity || 0) !== 0).length
  const locationCount = new Set(details.map((detail) => detail.locationId)).size
  const skuCount = new Set(details.map((detail) => detail.skuId)).size

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderName: order.orderName,
    orderType: order.orderType,
    orderStatus: order.status,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    batchType: batch.batchType,
    status: batch.status,
    countMode: order.countMode,
    pdaMode: resolvePdaMode(order.executionConfigJson, order.countMode),
    clientName: batch.clientName || '',
    scopeSummary: batch.scopeSummary,
    totalDetailCount,
    countedDetailCount,
    pendingDetailCount,
    diffDetailCount,
    locationCount,
    skuCount,
    progressPercent: totalDetailCount > 0 ? Math.round((countedDetailCount / totalDetailCount) * 100) : 0,
    startedAt: formatDate(batch.startedAt),
    completedAt: formatDate(batch.completedAt),
  }
}

async function loadOrderForPda(
  authUser: AuthUser,
  orderId: string,
  warehouseId?: string,
  options: { allowFinished?: boolean } = {}
) {
  const order = await prismaRead.inventoryCountOrder.findFirst({
    where: {
      ...buildScopedOrderWhere(authUser, warehouseId),
      id: orderId,
    },
    select: {
      id: true,
      orderNumber: true,
      orderName: true,
      orderType: true,
      countMode: true,
      executionConfigJson: true,
      status: true,
    },
  })

  if (!order) {
    throw new Error('盘点单不存在')
  }

  if (!options.allowFinished && !PDA_EXECUTABLE_ORDER_STATUSES.includes(order.status)) {
    throw new Error('当前盘点单状态不允许 PDA 执行')
  }

  return order
}

async function assertPdaInventoryCountBatchAssignee(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  warehouseId?: string
) {
  const order = await loadOrderForPda(authUser, orderId, warehouseId)
  const batch = await prismaRead.inventoryCountBatch.findFirst({
    where: {
      id: batchId,
      orderId: order.id,
      tenantId: authUser.tenantId,
    },
    select: {
      batchType: true,
      counterUserId: true,
      reviewerUserId: true,
    },
  })

  if (!batch) {
    throw new Error('盘点批次不存在')
  }

  assertPdaBatchAssignee(authUser, batch)
}

export async function listPdaInventoryCountBatches(authUser: AuthUser, warehouseId?: string) {
  const orders = await prismaRead.inventoryCountOrder.findMany({
    where: {
      ...buildScopedOrderWhere(authUser, warehouseId),
      status: {
        in: PDA_EXECUTABLE_ORDER_STATUSES,
      },
    },
    select: {
      id: true,
      orderNumber: true,
      orderName: true,
      orderType: true,
      status: true,
      countMode: true,
      executionConfigJson: true,
      plannedAt: true,
    },
    orderBy: [
      { plannedAt: 'asc' },
      { orderNumber: 'asc' },
    ],
  })

  if (orders.length === 0) {
    return []
  }

  const orderIds = orders.map((order) => order.id)
  const [batches, details] = await Promise.all([
    prismaRead.inventoryCountBatch.findMany({
      where: {
        orderId: {
          in: orderIds,
        },
        status: {
          in: PDA_EXECUTABLE_BATCH_STATUSES,
        },
        OR: [
          {
            batchType: InventoryCountBatchType.FIRST,
            counterUserId: authUser.id,
          },
          {
            batchType: InventoryCountBatchType.RECOUNT,
            reviewerUserId: authUser.id,
          },
        ],
      },
      select: {
        id: true,
        orderId: true,
        batchNumber: true,
        batchType: true,
        status: true,
        clientName: true,
        scopeSummary: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: [
        { createdAt: 'asc' },
        { batchNumber: 'asc' },
      ],
    }),
    prismaRead.inventoryCountRoundLine.findMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
      select: {
        orderId: true,
        batchId: true,
        status: true,
        diffQuantity: true,
        detail: {
          select: {
            locationId: true,
            locationCode: true,
            skuId: true,
          },
        },
      },
    }),
  ])

  const batchLocationMap = new Map<string, { locationId: string; locationCode: string }>()
  for (const detail of details) {
    if (detail.batchId && !batchLocationMap.has(detail.batchId)) {
      batchLocationMap.set(detail.batchId, {
        locationId: detail.detail.locationId,
        locationCode: detail.detail.locationCode,
      })
    }
  }
  const locationIds = [...new Set([...batchLocationMap.values()].map((location) => location.locationId))]
  const locations = locationIds.length > 0
    ? await prismaRead.binLocation.findMany({
        where: {
          tenantId: authUser.tenantId,
          id: {
            in: locationIds,
          },
        },
        select: {
          id: true,
          locationCode: true,
          pickPriority: true,
          pickSequence: true,
        },
      })
    : []
  const locationMap = new Map(locations.map((location) => [location.id, location]))
  const sortedBatches = [...batches].sort((left, right) => {
    const leftBatchLocation = batchLocationMap.get(left.id)
    const rightBatchLocation = batchLocationMap.get(right.id)
    const leftLocation = leftBatchLocation ? locationMap.get(leftBatchLocation.locationId) : null
    const rightLocation = rightBatchLocation ? locationMap.get(rightBatchLocation.locationId) : null
    const leftPriority = leftLocation?.pickPriority ?? 100
    const rightPriority = rightLocation?.pickPriority ?? 100
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    const leftSequence = leftLocation?.pickSequence ?? 0
    const rightSequence = rightLocation?.pickSequence ?? 0
    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence
    }

    const locationCompare = compareLocationCode(
      leftBatchLocation?.locationCode || left.scopeSummary || left.batchNumber,
      rightBatchLocation?.locationCode || right.scopeSummary || right.batchNumber
    )
    if (locationCompare !== 0) {
      return locationCompare
    }

    return left.batchNumber.localeCompare(right.batchNumber, undefined, { numeric: true })
  })

  const orderMap = new Map(orders.map((order) => [order.id, order]))
  const detailMap = new Map<string, Array<{ locationId: string; skuId: string; status: string; diffQuantity: number | null }>>()
  for (const line of details) {
    const current = detailMap.get(line.batchId) || []
    current.push({
      locationId: line.detail.locationId,
      skuId: line.detail.skuId,
      status: line.status,
      diffQuantity: line.diffQuantity,
    })
    detailMap.set(line.batchId, current)
  }

  return sortedBatches.flatMap((batch) => {
    const order = orderMap.get(batch.orderId)
    if (!order) {
      return []
    }

    return [buildSummary(order, batch, detailMap.get(batch.id) || [])]
  })
}

export async function getPdaInventoryCountBatchDetail(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  warehouseId?: string,
  filters: { locationCode?: string; skuOrBarcode?: string } = {},
  options: { allowFinished?: boolean } = {}
) {
  const order = await loadOrderForPda(authUser, orderId, warehouseId, options)
  const batch = await prismaRead.inventoryCountBatch.findFirst({
    where: {
      id: batchId,
      orderId: order.id,
      tenantId: authUser.tenantId,
    },
    select: {
      id: true,
      batchNumber: true,
      batchType: true,
      status: true,
      clientName: true,
      scopeSummary: true,
      startedAt: true,
      completedAt: true,
      counterUserId: true,
      reviewerUserId: true,
    },
  })

  if (!batch) {
    throw new Error('盘点批次不存在')
  }

  assertPdaBatchAssignee(authUser, batch)

  const detailWhere: {
    orderId: string
    tenantId: string
    locationCode?: string
    skuId?: string
    skuCode?: string
  } = {
    orderId: order.id,
    tenantId: authUser.tenantId,
  }

  const locationCode = filters.locationCode?.trim()
  if (locationCode) {
    detailWhere.locationCode = locationCode
  }

  const skuOrBarcode = filters.skuOrBarcode?.trim()
  if (skuOrBarcode) {
    const sku = await prismaRead.sku.findFirst({
      where: {
        tenantId: authUser.tenantId,
        OR: [
          { skuCode: skuOrBarcode },
          { barcode: skuOrBarcode },
        ],
      },
      select: {
        id: true,
      },
    })

    if (sku) {
      detailWhere.skuId = sku.id
    } else {
      detailWhere.skuCode = skuOrBarcode
    }
  }

  const roundLines = await prismaRead.inventoryCountRoundLine.findMany({
    where: {
      orderId: order.id,
      batchId: batch.id,
      tenantId: authUser.tenantId,
      detail: detailWhere,
    },
    select: {
      id: true,
      status: true,
      countedQuantity: true,
      diffQuantity: true,
      batchId: true,
      detail: {
        select: {
          id: true,
          detailNumber: true,
          clientName: true,
          locationCode: true,
          skuId: true,
          skuCode: true,
          batchNumber: true,
          lpn: true,
          bucketType: true,
          locationId: true,
          bookQuantity: true,
          finalQuantity: true,
          diffQuantity: true,
          status: true,
          expiryDate: true,
        },
      },
    },
    orderBy: [
      { detail: { skuCode: 'asc' } },
      { detail: { detailNumber: 'asc' } },
    ],
  })
  const details = roundLines.map((line) => ({
    ...line.detail,
    batchId: line.batchId,
    status: line.status === 'PENDING'
      ? (batch.batchType === 'RECOUNT' ? 'RECOUNT_PENDING' : 'PENDING')
      : line.detail.status,
    finalQuantity: line.countedQuantity ?? line.detail.finalQuantity,
    diffQuantity: line.diffQuantity ?? line.detail.diffQuantity,
  }))

  const locationIds = [...new Set(details.map((detail) => detail.locationId))]
  const locations = locationIds.length > 0
    ? await prismaRead.binLocation.findMany({
        where: {
          tenantId: authUser.tenantId,
          id: {
            in: locationIds,
          },
        },
        select: {
          id: true,
          locationCode: true,
          pickPriority: true,
          pickSequence: true,
        },
      })
    : []
  const locationMap = new Map(locations.map((location) => [location.id, location]))
  const sortedDetails = [...details].sort((left, right) => {
    const leftLocation = locationMap.get(left.locationId)
    const rightLocation = locationMap.get(right.locationId)
    const leftPriority = leftLocation?.pickPriority ?? 100
    const rightPriority = rightLocation?.pickPriority ?? 100
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    const leftSequence = leftLocation?.pickSequence ?? 0
    const rightSequence = rightLocation?.pickSequence ?? 0
    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence
    }

    const locationCompare = compareLocationCode(left.locationCode, right.locationCode)
    if (locationCompare !== 0) {
      return locationCompare
    }

    const skuCompare = left.skuCode.localeCompare(right.skuCode, undefined, { numeric: true })
    if (skuCompare !== 0) {
      return skuCompare
    }

    return left.detailNumber.localeCompare(right.detailNumber, undefined, { numeric: true })
  })

  const skuIds = [...new Set(sortedDetails.map((detail) => detail.skuId))]
  const skus = skuIds.length > 0
    ? await prismaRead.sku.findMany({
        where: {
          tenantId: authUser.tenantId,
          id: {
            in: skuIds,
          },
        },
        select: {
          id: true,
          skuName: true,
          barcode: true,
        },
      })
    : []
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]))

  return {
    batch: buildSummary(order, batch, sortedDetails),
    details: sortedDetails.map((detail) => {
      const sku = skuMap.get(detail.skuId)
      return {
        id: detail.id,
        batchId: detail.batchId,
        detailNumber: detail.detailNumber,
        clientName: detail.clientName || '',
        locationId: detail.locationId,
        locationCode: detail.locationCode,
        skuId: detail.skuId,
        skuCode: detail.skuCode,
        skuName: sku?.skuName || '',
        barcode: sku?.barcode || '',
        batchNumber: detail.batchNumber,
        lpn: detail.lpn,
        bucketType: detail.bucketType,
        bookQuantity: detail.bookQuantity,
        finalQuantity: detail.finalQuantity,
        diffQuantity: detail.diffQuantity,
        status: detail.status,
        expiryDate: formatDate(detail.expiryDate)?.slice(0, 10) || null,
      }
    }),
  }
}

export async function startPdaInventoryCountBatch(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  warehouseId?: string
) {
  await assertPdaInventoryCountBatchAssignee(authUser, orderId, batchId, warehouseId)
  await startInventoryCountBatch(authUser, orderId, batchId, warehouseId)
  return getPdaInventoryCountBatchDetail(authUser, orderId, batchId, warehouseId)
}

export async function submitPdaInventoryCountLine(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  detailId: string,
  input: SubmitInventoryCountLineInput,
  warehouseId?: string
) {
  await assertPdaInventoryCountBatchAssignee(authUser, orderId, batchId, warehouseId)
  await submitInventoryCountTaskLines(
    authUser,
    orderId,
    batchId,
    {
      ...input,
      detailIds: [detailId],
      roundType: input.roundType || undefined,
    },
    warehouseId,
    { sourceType: 'PDA' }
  )
  return getPdaInventoryCountBatchDetail(authUser, orderId, batchId, warehouseId, {}, {
    allowFinished: true,
  })
}

export async function submitPdaInventoryCountScopeLine(
  authUser: AuthUser,
  orderId: string,
  input: SubmitInventoryCountLineInput,
  warehouseId?: string
) {
  if (!input.scope || !input.roundType) {
    throw new Error('PDA 汇总提交缺少盘点范围或盘点轮次')
  }

  const order = await loadOrderForPda(authUser, orderId, warehouseId)
  const roundLines = await prismaRead.inventoryCountRoundLine.findMany({
    where: {
      orderId: order.id,
      tenantId: authUser.tenantId,
      roundType: input.roundType,
      status: 'PENDING',
      detail: {
        orderId: order.id,
        tenantId: authUser.tenantId,
        locationId: input.scope.locationId,
        skuId: input.scope.skuId,
        batchNumber: input.scope.batchNumber,
        lpn: input.scope.lpn,
        bucketType: input.scope.bucketType,
        status: input.roundType === 'RECOUNT' ? 'RECOUNT_PENDING' : 'PENDING',
      },
    },
    select: {
      batchId: true,
      detail: {
        select: {
          expiryDate: true,
        },
      },
    },
  })
  const batchIds = Array.from(new Set(
    roundLines
      .filter((line) => expiryDateKey(line.detail.expiryDate) === input.scope?.expiryDateKey)
      .map((line) => line.batchId)
  ))

  if (batchIds.length === 0) {
    throw new Error('未找到可提交的盘点明细')
  }

  for (const batchId of batchIds) {
    await assertPdaInventoryCountBatchAssignee(authUser, orderId, batchId, warehouseId)
  }

  await submitInventoryCountTaskLines(
    authUser,
    orderId,
    batchIds[0],
    input,
    warehouseId,
    { sourceType: 'PDA' }
  )
  return getPdaInventoryCountBatchDetail(authUser, orderId, batchIds[0], warehouseId, {}, {
    allowFinished: true,
  })
}

export async function completePdaInventoryCountBatch(
  authUser: AuthUser,
  orderId: string,
  batchId: string,
  warehouseId?: string
) {
  await assertPdaInventoryCountBatchAssignee(authUser, orderId, batchId, warehouseId)
  await completeInventoryCountBatch(authUser, orderId, batchId, warehouseId)
  return getPdaInventoryCountBatchDetail(authUser, orderId, batchId, warehouseId, {}, {
    allowFinished: true,
  })
}
