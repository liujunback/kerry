import { Prisma } from '@prisma/client'
import { prisma, type TransactionClient } from '@/lib/db/prisma'
import type { AuthUser } from '@/lib/auth/middleware'
import { withOrderLock } from '@/lib/services/inventory-lock-service'
import {
  type CreateInventoryCountInput,
  type InventoryCountExecutionConfig,
  type InventoryCountListQuery,
  type InventoryCountOwnerScopeConfig,
  type InventoryCountScopeConfig,
  InventoryCountMode,
  InventoryCountOrderStatus,
  InventoryCountOwnerScopeMode,
  InventoryCountSaveMode,
  InventoryCountSplitRule,
} from '@/lib/validations/inventory-count'
import {
  assertInventoryCountScopeBucketsUnlocked,
  assertNoDirtyCountDifferenceBucketsForOrderScope,
  groupInventoryCountScopeBatchesByLocation,
  moveInventoryCountScopeBucketsToHold,
  resolveInventoryCountScopeBuckets,
  type InventoryCountScopeBucket,
  type InventoryCountOrderContext,
} from '@/lib/services/inventory-count/scope-generation'
import {
  appendInventoryCountOperationLog,
  getOperatorName,
} from '@/lib/services/inventory-count/operation-log'
import {
  getSequenceStart,
  parseExecutionConfig,
  toJsonValue,
} from '@/lib/services/inventory-count/utils'
import { releaseInventoryCountDetailLock } from '@/lib/services/inventory-count/lock-release'
import {
  buildInventoryCountScopedWhere,
  loadInventoryCountOrderContext,
} from '@/lib/services/inventory-count/context'
export {
  completeInventoryCountBatch,
  startInventoryCountBatch,
  submitInventoryCountScopeLine,
  submitInventoryCountTaskLines,
  updateInventoryCountBatchAssignee,
  updateInventoryCountBatchAssignees,
} from '@/lib/services/inventory-count/batch'
export { generateInventoryCountRecounts } from '@/lib/services/inventory-count/recount'
export {
  completeInventoryCountDisposal,
  confirmInventoryCountDifferences,
  settleInventoryCountOrder,
  startInventoryCountDisposal,
} from '@/lib/services/inventory-count/settlement'

type TxClient = TransactionClient

interface CreatedBatchResult {
  id: string
  batchNumber: string
  clientId: string
  clientName: string | null
  warehouseId: string
}

type InventoryCountScopeDetailGroup = {
  batch: CreatedBatchResult
  buckets: InventoryCountScopeBucket[]
}

function buildScopedWhere(authUser: AuthUser, warehouseId?: string): Prisma.InventoryCountOrderWhereInput {
  return buildInventoryCountScopedWhere(authUser, warehouseId)
}

function toCodePrefix(prefix: string, warehouseCode: string) {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  return `${prefix}-${warehouseCode}-${datePart}-`
}

async function generateInventoryCountOrderNumber(tenantId: string, warehouseCode: string) {
  const prefix = toCodePrefix('CO', warehouseCode)

  const latest = await prisma.inventoryCountOrder.findFirst({
    where: {
      tenantId,
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  })

  const nextSequence = latest
    ? Number.parseInt(latest.orderNumber.slice(-4), 10) + 1
    : 1

  return `${prefix}${nextSequence.toString().padStart(4, '0')}`
}

function uniqStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function normalizeScopeConfig(input: CreateInventoryCountInput['scopeConfig']) {
  const scopeConfig: InventoryCountScopeConfig = {
    inventoryStatuses: uniqStrings(input.inventoryStatuses ?? []),
    skuCodes: uniqStrings(input.skuCodes ?? []),
    startLocationCode: input.startLocationCode?.trim() || undefined,
    endLocationCode: input.endLocationCode?.trim() || undefined,
    zoneId: input.zoneId,
    zoneName: input.zoneName?.trim() || undefined,
    aisle: input.aisle?.trim() || undefined,
    rack: input.rack?.trim() || undefined,
    shelfStart: input.shelfStart?.trim() || undefined,
    shelfEnd: input.shelfEnd?.trim() || undefined,
    cycleDays: input.cycleDays,
    calendarCode: input.calendarCode?.trim() || undefined,
    timeWindow: input.timeWindow?.trim() || undefined,
    excludeRules: input.excludeRules?.trim() || undefined,
    maxLocationsPerBatch: input.maxLocationsPerBatch,
  }

  return scopeConfig
}

function getMaxLocationsPerBatch(scopeConfigJson: unknown) {
  if (!scopeConfigJson || typeof scopeConfigJson !== 'object' || Array.isArray(scopeConfigJson)) {
    return 1
  }

  const value = (scopeConfigJson as Record<string, unknown>).maxLocationsPerBatch
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 1
}

function getDateKey(value: Date | string | null | undefined) {
  if (!value) {
    return '1000-01-01'
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '1000-01-01' : date.toISOString().slice(0, 10)
}

function getProgressPercent(order: {
  totalBatchCount: number
  completedBatchCount: number
  totalDetailCount: number
}) {
  if (order.totalBatchCount > 0) {
    return Math.min(100, Math.round((order.completedBatchCount / order.totalBatchCount) * 100))
  }

  if (order.totalDetailCount > 0) {
    return 0
  }

  return 0
}

async function validateOrderForGeneration(tx: TxClient, order: InventoryCountOrderContext) {
  const [batches, details, recordCount] = await Promise.all([
    tx.inventoryCountBatch.findMany({
      where: { orderId: order.id },
      select: { id: true, status: true },
    }),
    tx.inventoryCountDetail.findMany({
      where: { orderId: order.id },
      select: { id: true, status: true },
    }),
    tx.inventoryCountRecord.count({
      where: { orderId: order.id },
    }),
  ])

  if ([
    InventoryCountOrderStatus.PENDING_SCOPE,
    InventoryCountOrderStatus.GENERATING_SCOPE,
    InventoryCountOrderStatus.SCOPE_FAILED,
  ].includes(order.status as never)) {
    return { batches, details, canReplace: true }
  }

  if (order.status === InventoryCountOrderStatus.READY && recordCount > 0) {
    throw new Error('当前盘点单已开始执行，不允许重新生成范围')
  }

  if (order.status === InventoryCountOrderStatus.READY && batches.some((batch) => batch.status !== 'READY')) {
    throw new Error('存在已启动批次，不允许重新生成范围')
  }

  if (order.status === InventoryCountOrderStatus.READY && details.some((detail) => detail.status !== 'PENDING')) {
    throw new Error('存在非待盘点明细，不允许重新生成范围')
  }

  throw new Error('当前状态不允许生成范围')
}

async function replaceGeneratedScope(tx: TxClient, orderId: string) {
  const order = await tx.inventoryCountOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      tenantId: true,
    },
  })

  if (!order) {
    throw new Error('盘点单不存在')
  }

  const activeLocks = await tx.inventoryCountLock.findMany({
    where: {
      orderId,
      status: 'ACTIVE',
    },
  })

  await releaseActiveInventoryCountLocks(tx, activeLocks, undefined, order.orderNumber)
  await tx.inventoryCountLock.deleteMany({ where: { orderId } })
  await tx.inventoryCountRecord.deleteMany({ where: { orderId } })
  await tx.inventoryCountDetail.deleteMany({ where: { orderId } })
  await tx.inventoryCountBatch.deleteMany({ where: { orderId } })
}

async function cleanupOrphanActiveInventoryCountLocks(tx: TxClient, releasedBy?: string) {
  const activeLocks = await tx.inventoryCountLock.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      orderId: true,
    },
  })

  if (activeLocks.length === 0) {
    return 0
  }

  const orderIds = [...new Set(activeLocks.map((lock) => lock.orderId))]
  const existingOrders = await tx.inventoryCountOrder.findMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    select: {
      id: true,
    },
  })
  const existingOrderIdSet = new Set(existingOrders.map((order) => order.id))
  const orphanLockIds = activeLocks
    .filter((lock) => !existingOrderIdSet.has(lock.orderId))
    .map((lock) => lock.id)

  if (orphanLockIds.length === 0) {
    return 0
  }

  const orphanLocks = await tx.inventoryCountLock.findMany({
    where: {
      id: {
        in: orphanLockIds,
      },
      status: 'ACTIVE',
    },
  })

  await releaseActiveInventoryCountLocks(tx, orphanLocks, releasedBy, 'ORPHAN_INVENTORY_COUNT_LOCK')

  return orphanLockIds.length
}

async function releaseActiveInventoryCountLocks(
  tx: TxClient,
  activeLocks: Array<{
    id: string
    tenantId: string
    orderId: string
    detailId: string | null
    warehouseId: string
    clientId: string | null
    locationId: string
    skuId: string
    sourceBucketId: string
    bucketType: string
    lockedQuantity: number
    status: string
    lockedAt: Date
    releasedAt: Date | null
    releasedBy: string | null
    createdAt: Date
  }>,
  releasedBy?: string,
  referenceNumber?: string
) {
  if (activeLocks.length === 0) {
    return
  }

  const details = await tx.inventoryCountDetail.findMany({
    where: {
      id: {
        in: activeLocks
          .map((lock) => lock.detailId)
          .filter((value): value is string => !!value),
      },
    },
  })

  const detailMap = new Map(details.map((detail) => [detail.id, detail]))

  for (const lock of activeLocks) {
    const detail = lock.detailId ? detailMap.get(lock.detailId) : null
    if (!detail) {
      throw new Error(`盘点锁缺少关联明细，无法释放库存：${lock.id}`)
    }

    await releaseInventoryCountDetailLock(tx, detail, lock, {
      id: releasedBy || detail.tenantId,
      name: releasedBy ? '盘点操作人' : '系统',
    }, referenceNumber || lock.orderId)
  }
}

export async function cancelInventoryCountOrder(authUser: AuthUser, id: string, warehouseId?: string) {
  const order = await loadInventoryCountOrderContext(authUser, id, warehouseId)

  return withOrderLock(order.tenantId, order.id, async () => (
    prisma.$transaction(async (tx) => {
      await cleanupOrphanActiveInventoryCountLocks(tx, authUser.id)

      const [batches, details, recordCount] = await Promise.all([
        tx.inventoryCountBatch.findMany({
          where: { orderId: order.id },
          select: { status: true },
        }),
        tx.inventoryCountDetail.findMany({
          where: { orderId: order.id },
          select: { status: true },
        }),
        tx.inventoryCountRecord.count({
          where: { orderId: order.id },
        }),
      ])

      const cancellableStatuses = new Set<string>([
        InventoryCountOrderStatus.DRAFT,
        InventoryCountOrderStatus.PENDING_SCOPE,
        InventoryCountOrderStatus.READY,
      ])

      if (!cancellableStatuses.has(order.status as (typeof InventoryCountOrderStatus)[keyof typeof InventoryCountOrderStatus])) {
        throw new Error('当前状态不允许取消盘点单')
      }

      if (recordCount > 0) {
        throw new Error('盘点单已开始执行，不能取消')
      }

      if (batches.some((batch) => batch.status !== 'READY')) {
        throw new Error('存在非待执行批次，不能取消')
      }

      if (details.some((detail) => detail.status !== 'PENDING')) {
        throw new Error('存在非待盘点明细，不能取消')
      }

      const activeLocks = await tx.inventoryCountLock.findMany({
        where: {
          orderId: order.id,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          tenantId: true,
          orderId: true,
          detailId: true,
          warehouseId: true,
          clientId: true,
          locationId: true,
          skuId: true,
          sourceBucketId: true,
          bucketType: true,
          lockedQuantity: true,
          status: true,
          lockedAt: true,
          releasedAt: true,
          releasedBy: true,
          createdAt: true,
        },
      })
      const activeLockDetailIds = new Set(activeLocks.map((lock) => lock.detailId).filter(Boolean))
      const missingLockDetail = await tx.inventoryCountDetail.findFirst({
        where: {
          orderId: order.id,
          status: 'PENDING',
          id: {
            notIn: [...activeLockDetailIds] as string[],
          },
        },
        select: {
          detailNumber: true,
          skuCode: true,
          locationCode: true,
        },
      })

      if (missingLockDetail) {
        throw new Error(
          `盘点单锁记录缺失，无法安全取消并回写库存：${missingLockDetail.detailNumber} / ${missingLockDetail.locationCode} / ${missingLockDetail.skuCode}`
        )
      }

      await releaseActiveInventoryCountLocks(tx, activeLocks, authUser.id, order.orderNumber)

      await tx.inventoryCountBatch.updateMany({
        where: {
          orderId: order.id,
        },
        data: {
          status: 'CANCELLED',
        },
      })

      await tx.inventoryCountDetail.updateMany({
        where: {
          orderId: order.id,
        },
        data: {
          status: 'CANCELLED',
        },
      })

      const cancelledOrder = await tx.inventoryCountOrder.update({
        where: { id: order.id },
        data: {
          status: InventoryCountOrderStatus.CANCELLED,
          pendingRecountCount: 0,
          pendingAdjustCount: 0,
          updatedBy: authUser.id,
        },
      })

      await appendInventoryCountOperationLog(tx, {
        tenantId: order.tenantId,
        orderId: order.id,
        entityType: 'InventoryCountOrder',
        entityId: order.id,
        operationType: 'ORDER_CANCELLED',
        description: `取消盘点单：${order.orderNumber}`,
        operatorId: authUser.id,
        operatorName: getOperatorName(authUser),
      })

      return cancelledOrder
    })
  ))
}

export async function listInventoryCountOrders(authUser: AuthUser, query: InventoryCountListQuery) {
  const where = buildScopedWhere(authUser, query.warehouseId)

  if (query.orderType) {
    where.orderType = query.orderType
  }

  if (query.status) {
    where.status = query.status
  }

  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search } },
      { ownerScopeSummary: { contains: query.search } },
    ]
  }

  if (query.plannedStart || query.plannedEnd) {
    const plannedAtFilter: Prisma.DateTimeFilter = {}
    if (query.plannedStart) {
      plannedAtFilter.gte = new Date(query.plannedStart)
    }
    if (query.plannedEnd) {
      plannedAtFilter.lte = new Date(query.plannedEnd)
    }
    where.plannedAt = plannedAtFilter
  }

  const [data, total] = await Promise.all([
    prisma.inventoryCountOrder.findMany({
      where,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.inventoryCountOrder.count({ where }),
  ])

  return {
    data: data.map((order) => ({
      ...order,
      progressPercent: getProgressPercent(order),
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
}

export async function createInventoryCountOrder(authUser: AuthUser, input: CreateInventoryCountInput) {
  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: input.warehouseId,
      tenantId: authUser.tenantId,
    },
    select: {
      id: true,
      warehouseCode: true,
      warehouseName: true,
    },
  })

  if (!warehouse) {
    throw new Error('仓库不存在')
  }

  const scopeConfig = normalizeScopeConfig(input.scopeConfig)

  let ownerScopeConfig: InventoryCountOwnerScopeConfig
  if (input.ownerScopeMode === InventoryCountOwnerScopeMode.ALL) {
    ownerScopeConfig = {
      mode: InventoryCountOwnerScopeMode.ALL,
      clientIds: [],
      clientNames: [],
    }
  } else {
    const clients = await prisma.client.findMany({
      where: {
        tenantId: authUser.tenantId,
        id: {
          in: input.clientIds,
        },
      },
      select: {
        id: true,
        clientName: true,
      },
    })

    if (clients.length !== input.clientIds.length) {
      throw new Error('部分客户不存在')
    }

    ownerScopeConfig = {
      mode: InventoryCountOwnerScopeMode.PARTIAL,
      clientIds: clients.map((client) => client.id),
      clientNames: clients.map((client) => client.clientName),
    }
  }

  if (scopeConfig.zoneId && !scopeConfig.zoneName) {
    const zone = await prisma.zone.findFirst({
      where: {
        id: scopeConfig.zoneId,
        tenantId: authUser.tenantId,
      },
      select: {
        zoneName: true,
      },
    })

    if (!zone) {
      throw new Error('库区不存在')
    }

    scopeConfig.zoneName = zone.zoneName || undefined
  }

  if (scopeConfig.skuCodes.length > 0) {
    const skus = await prisma.sku.findMany({
      where: {
        tenantId: authUser.tenantId,
        skuCode: {
          in: scopeConfig.skuCodes,
        },
      },
      select: {
        skuCode: true,
      },
    })

    const foundCodes = new Set(skus.map((sku) => sku.skuCode))
    const missingCodes = scopeConfig.skuCodes.filter((code) => !foundCodes.has(code))
    if (missingCodes.length > 0) {
      throw new Error(`以下 SKU 不存在：${missingCodes.join('、')}`)
    }
  }

  const executionConfig: InventoryCountExecutionConfig & {
    counterUserName?: string
    reviewerUserName?: string
  } = {
    ...input.executionConfig,
    splitRule: InventoryCountSplitRule.BY_LOCATION,
    pdaMode: input.executionConfig.pdaMode || input.countMode || InventoryCountMode.BLIND,
  }

  const userIds = [input.executionConfig.counterUserId, input.executionConfig.reviewerUserId].filter(
    (value): value is string => !!value
  )
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        tenantId: authUser.tenantId,
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
      },
    })

    if (users.length !== userIds.length) {
      throw new Error('部分盘点人或复盘人不存在')
    }

    const userMap = new Map(users.map((user) => [user.id, user.fullName || user.username]))
    executionConfig.counterUserName = executionConfig.counterUserId
      ? userMap.get(executionConfig.counterUserId)
      : undefined
    executionConfig.reviewerUserName = executionConfig.reviewerUserId
      ? userMap.get(executionConfig.reviewerUserId)
      : undefined
  }

  const orderNumber = await generateInventoryCountOrderNumber(authUser.tenantId, warehouse.warehouseCode)
  const orderName = input.orderName || orderNumber

  return prisma.$transaction(async (tx) => {
    const order = await tx.inventoryCountOrder.create({
      data: {
        tenantId: authUser.tenantId,
        orderNumber,
        orderName,
        orderType: input.orderType,
        countMode: input.countMode,
        status: input.saveMode === InventoryCountSaveMode.DRAFT
          ? InventoryCountOrderStatus.DRAFT
          : InventoryCountOrderStatus.PENDING_SCOPE,
        warehouseId: warehouse.id,
        warehouseName: warehouse.warehouseName,
        plannedAt: new Date(input.plannedAt),
        remark: input.remark,
        ownerScopeMode: input.ownerScopeMode,
        ownerScopeSummary: ownerScopeConfig.mode === InventoryCountOwnerScopeMode.ALL
          ? '全部货主'
          : ownerScopeConfig.clientNames.join('、'),
        ownerScopeConfigJson: toJsonValue(ownerScopeConfig),
        scopeConfigJson: toJsonValue(scopeConfig),
        executionConfigJson: toJsonValue(executionConfig),
        createdBy: authUser.id,
        updatedBy: authUser.id,
      },
    })

    await appendInventoryCountOperationLog(tx, {
      tenantId: authUser.tenantId,
      orderId: order.id,
      entityType: 'InventoryCountOrder',
      entityId: order.id,
      operationType: 'ORDER_CREATED',
      description: `创建盘点单：${order.orderNumber}`,
      operatorId: authUser.id,
      operatorName: getOperatorName(authUser),
    })

    return order
  })
}

export async function updateInventoryCountOrder(
  authUser: AuthUser,
  id: string,
  input: CreateInventoryCountInput,
  warehouseId?: string
) {
  const existing = await prisma.inventoryCountOrder.findFirst({
    where: {
      ...buildScopedWhere(authUser, warehouseId),
      id,
    },
    select: {
      id: true,
      status: true,
      orderNumber: true,
    },
  })

  if (!existing) {
    throw new Error('盘点单不存在')
  }

  if (!['DRAFT', 'PENDING_SCOPE', 'SCOPE_FAILED'].includes(existing.status)) {
    throw new Error('当前状态不允许编辑盘点单')
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: input.warehouseId,
      tenantId: authUser.tenantId,
    },
    select: {
      id: true,
      warehouseName: true,
    },
  })

  if (!warehouse) {
    throw new Error('仓库不存在')
  }

  const scopeConfig = normalizeScopeConfig(input.scopeConfig)

  let ownerScopeConfig: InventoryCountOwnerScopeConfig
  if (input.ownerScopeMode === InventoryCountOwnerScopeMode.ALL) {
    ownerScopeConfig = {
      mode: InventoryCountOwnerScopeMode.ALL,
      clientIds: [],
      clientNames: [],
    }
  } else {
    const clients = await prisma.client.findMany({
      where: {
        tenantId: authUser.tenantId,
        id: {
          in: input.clientIds,
        },
      },
      select: {
        id: true,
        clientName: true,
      },
    })

    if (clients.length !== input.clientIds.length) {
      throw new Error('部分客户不存在')
    }

    ownerScopeConfig = {
      mode: InventoryCountOwnerScopeMode.PARTIAL,
      clientIds: clients.map((client) => client.id),
      clientNames: clients.map((client) => client.clientName),
    }
  }

  if (scopeConfig.zoneId && !scopeConfig.zoneName) {
    const zone = await prisma.zone.findFirst({
      where: {
        id: scopeConfig.zoneId,
        tenantId: authUser.tenantId,
      },
      select: {
        zoneName: true,
      },
    })

    if (!zone) {
      throw new Error('库区不存在')
    }

    scopeConfig.zoneName = zone.zoneName || undefined
  }

  if (scopeConfig.skuCodes.length > 0) {
    const skus = await prisma.sku.findMany({
      where: {
        tenantId: authUser.tenantId,
        skuCode: {
          in: scopeConfig.skuCodes,
        },
      },
      select: {
        skuCode: true,
      },
    })

    const foundCodes = new Set(skus.map((sku) => sku.skuCode))
    const missingCodes = scopeConfig.skuCodes.filter((code) => !foundCodes.has(code))
    if (missingCodes.length > 0) {
      throw new Error(`以下 SKU 不存在：${missingCodes.join('、')}`)
    }
  }

  const executionConfig: InventoryCountExecutionConfig & {
    counterUserName?: string
    reviewerUserName?: string
  } = {
    ...input.executionConfig,
    splitRule: InventoryCountSplitRule.BY_LOCATION,
    pdaMode: input.executionConfig.pdaMode || input.countMode || InventoryCountMode.BLIND,
  }

  const userIds = [input.executionConfig.counterUserId, input.executionConfig.reviewerUserId].filter(
    (value): value is string => !!value
  )
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        tenantId: authUser.tenantId,
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
      },
    })

    if (users.length !== userIds.length) {
      throw new Error('部分盘点人或复盘人不存在')
    }

    const userMap = new Map(users.map((user) => [user.id, user.fullName || user.username]))
    executionConfig.counterUserName = executionConfig.counterUserId
      ? userMap.get(executionConfig.counterUserId)
      : undefined
    executionConfig.reviewerUserName = executionConfig.reviewerUserId
      ? userMap.get(executionConfig.reviewerUserId)
      : undefined
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.inventoryCountOrder.update({
      where: { id },
      data: {
        orderName: input.orderName || existing.orderNumber,
        orderType: input.orderType,
        countMode: input.countMode,
        status: input.saveMode === InventoryCountSaveMode.DRAFT
          ? InventoryCountOrderStatus.DRAFT
          : InventoryCountOrderStatus.PENDING_SCOPE,
        warehouseId: warehouse.id,
        warehouseName: warehouse.warehouseName,
        plannedAt: new Date(input.plannedAt),
        remark: input.remark,
        ownerScopeMode: input.ownerScopeMode,
        ownerScopeSummary: ownerScopeConfig.mode === InventoryCountOwnerScopeMode.ALL
          ? '全部货主'
          : ownerScopeConfig.clientNames.join('、'),
        ownerScopeConfigJson: toJsonValue(ownerScopeConfig),
        scopeConfigJson: toJsonValue(scopeConfig),
        executionConfigJson: toJsonValue(executionConfig),
        updatedBy: authUser.id,
      },
    })

    await appendInventoryCountOperationLog(tx, {
      tenantId: authUser.tenantId,
      orderId: id,
      entityType: 'InventoryCountOrder',
      entityId: id,
      operationType: 'ORDER_UPDATED',
      description: `编辑盘点单：${existing.orderNumber}`,
      operatorId: authUser.id,
      operatorName: getOperatorName(authUser),
    })

    return order
  })
}

export async function generateInventoryCountScope(authUser: AuthUser, id: string, warehouseId?: string) {
  return withOrderLock(authUser.tenantId, id, async () => {
    const order = await loadInventoryCountOrderContext(authUser, id, warehouseId)

    return prisma.$transaction(async (tx) => {
      await cleanupOrphanActiveInventoryCountLocks(tx, authUser.id)

      await validateOrderForGeneration(tx, order)
      await replaceGeneratedScope(tx, order.id)
      await assertNoDirtyCountDifferenceBucketsForOrderScope(tx, order)

      const buckets = await resolveInventoryCountScopeBuckets(tx, order)
      if (buckets.length === 0) {
        throw new Error('当前配置未命中任何库存范围')
      }
      await assertInventoryCountScopeBucketsUnlocked(tx, order.id, buckets.map((bucket) => bucket.id), authUser.id)

      const executionConfig = parseExecutionConfig(order.executionConfigJson, order.countMode)
      const maxLocationsPerBatch = getMaxLocationsPerBatch(order.scopeConfigJson)
      const batchPlans = groupInventoryCountScopeBatchesByLocation(buckets, maxLocationsPerBatch)
      const batchSequence = await getSequenceStart(tx, 'batch', order.tenantId, order.warehouseCode)
      const detailSequence = await getSequenceStart(tx, 'detail', order.tenantId, order.warehouseCode)

      await moveInventoryCountScopeBucketsToHold({
        tx,
        buckets,
        order,
        operatorId: authUser.id,
      })

      const batchMap = new Map<string, CreatedBatchResult>()

      for (const batchPlan of batchPlans) {
        const batchNumber = `${batchSequence.prefix}${String(batchSequence.next).padStart(6, '0')}`
        batchSequence.next += 1

        const createdBatch = await tx.inventoryCountBatch.create({
          data: {
            tenantId: order.tenantId,
            orderId: order.id,
            batchNumber,
            batchType: 'FIRST',
            status: 'READY',
            warehouseId: batchPlan.warehouseId,
            clientId: batchPlan.clientId,
            clientName: batchPlan.clientName,
            scopeSummary: batchPlan.scopeSummary,
            scopeSnapshotJson: toJsonValue({
              locationIds: batchPlan.locationIds,
              locationCodes: batchPlan.locationCodes,
              maxLocationsPerBatch,
              clientId: batchPlan.clientId,
              clientName: batchPlan.clientName,
            }),
            counterUserId: executionConfig.counterUserId,
            counterUserName: executionConfig.counterUserName,
            reviewerUserId: executionConfig.reviewerUserId,
            reviewerUserName: executionConfig.reviewerUserName,
          },
          select: {
            id: true,
            batchNumber: true,
          },
        })

        for (const bucketId of batchPlan.bucketIds) {
          batchMap.set(bucketId, {
            id: createdBatch.id,
            batchNumber: createdBatch.batchNumber,
            clientId: batchPlan.clientId,
            clientName: batchPlan.clientName,
            warehouseId: batchPlan.warehouseId,
          })
        }
      }

      const detailGroups = new Map<string, InventoryCountScopeDetailGroup>()
      for (const bucket of buckets) {
        const batch = batchMap.get(bucket.id)
        if (!batch) {
          throw new Error(`未找到对应批次: ${bucket.locationCode} / ${bucket.skuCode}`)
        }

        const key = JSON.stringify([
          batch.id,
          bucket.clientId || '',
          bucket.locationId,
          bucket.skuId,
          bucket.batchNumber || '',
          bucket.lpn || '',
          bucket.bucketType,
          getDateKey(bucket.expiryDate),
        ])
        const group = detailGroups.get(key)
        if (group) {
          group.buckets.push(bucket)
        } else {
          detailGroups.set(key, { batch, buckets: [bucket] })
        }
      }

      let detailCount = 0

      for (const group of detailGroups.values()) {
        const firstBucket = group.buckets[0]!
        const batch = group.batch
        const detailNumber = `${detailSequence.prefix}${String(detailSequence.next).padStart(6, '0')}`
        detailSequence.next += 1

        const detail = await tx.inventoryCountDetail.create({
          data: {
            tenantId: order.tenantId,
            orderId: order.id,
            detailNumber,
            clientId: firstBucket.clientId,
            clientName: firstBucket.clientName,
            warehouseId: firstBucket.warehouseId,
            zoneId: firstBucket.zoneId,
            locationId: firstBucket.locationId,
            locationCode: firstBucket.locationCode,
            skuId: firstBucket.skuId,
            skuCode: firstBucket.skuCode,
            batchNumber: firstBucket.batchNumber,
            lpn: firstBucket.lpn,
            bucketType: firstBucket.bucketType,
            expiryDate: firstBucket.expiryDate,
            productionDate: firstBucket.productionDate,
            bookQuantity: group.buckets.reduce((sum, bucket) => sum + bucket.quantity, 0),
            status: 'PENDING',
          },
          select: {
            id: true,
          },
        })

        await tx.inventoryCountRoundLine.create({
          data: {
            tenantId: order.tenantId,
            orderId: order.id,
            detailId: detail.id,
            batchId: batch.id,
            roundType: 'FIRST',
            roundNo: 1,
            status: 'PENDING',
            bookQuantitySnapshot: group.buckets.reduce((sum, bucket) => sum + bucket.quantity, 0),
          },
        })

        for (const bucket of group.buckets) {
          await tx.inventoryCountLock.create({
            data: {
              tenantId: order.tenantId,
              orderId: order.id,
              detailId: detail.id,
              warehouseId: bucket.warehouseId,
              clientId: bucket.clientId,
              locationId: bucket.locationId,
              skuId: bucket.skuId,
              sourceBucketId: bucket.id,
              bucketType: bucket.bucketType,
              lockedQuantity: bucket.quantity,
              status: 'ACTIVE',
              lockedAt: new Date(),
            },
          })
        }

        detailCount += 1
      }

      const generatedOrder = await tx.inventoryCountOrder.update({
        where: { id: order.id },
        data: {
          status: InventoryCountOrderStatus.READY,
          totalBatchCount: batchPlans.length,
          completedBatchCount: 0,
          totalDetailCount: detailCount,
          diffDetailCount: 0,
          pendingRecountCount: 0,
          pendingAdjustCount: 0,
          updatedBy: authUser.id,
        },
      })

      await appendInventoryCountOperationLog(tx, {
        tenantId: order.tenantId,
        orderId: order.id,
        entityType: 'InventoryCountOrder',
        entityId: order.id,
        operationType: 'SCOPE_GENERATED',
        description: `生成盘点范围：生成 ${detailCount} 条明细，批次 ${batchPlans.length} 个，锁定库存 ${buckets.reduce((sum, bucket) => sum + bucket.quantity, 0)}`,
        operatorId: authUser.id,
        operatorName: getOperatorName(authUser),
        metadata: {
          detailCount,
          batchCount: batchPlans.length,
          lockedQuantity: buckets.reduce((sum, bucket) => sum + bucket.quantity, 0),
        },
      })

      return generatedOrder
    })
  })
}

export async function getInventoryCountOrderDetail(authUser: AuthUser, id: string, warehouseId?: string) {
  const order = await prisma.inventoryCountOrder.findFirst({
    where: {
      ...buildScopedWhere(authUser, warehouseId),
      id,
    },
  })

  if (!order) {
    return null
  }

  const [operationLogs, createAudit, batches, details, roundLines, records] = await Promise.all([
    prisma.inventoryCountOperationLog.findMany({
      where: {
        tenantId: authUser.tenantId,
        orderId: order.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        operationType: true,
        operatorName: true,
        description: true,
        entityType: true,
        createdAt: true,
      },
    }),
    prisma.audit.findFirst({
      where: {
        tenantId: authUser.tenantId,
        entityType: 'InventoryCountOrder',
        entityId: order.id,
        operationType: 'CREATE',
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
    prisma.inventoryCountBatch.findMany({
      where: {
        orderId: order.id,
      },
      orderBy: [
        { createdAt: 'asc' },
        { batchNumber: 'asc' },
      ],
      select: {
        id: true,
        batchNumber: true,
        batchType: true,
        status: true,
        clientName: true,
        scopeSummary: true,
        counterUserId: true,
        counterUserName: true,
        reviewerUserId: true,
        reviewerUserName: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    prisma.inventoryCountDetail.findMany({
      where: {
        orderId: order.id,
      },
      orderBy: [
        { createdAt: 'asc' },
        { detailNumber: 'asc' },
      ],
      select: {
        id: true,
        detailNumber: true,
        locationId: true,
        clientName: true,
        locationCode: true,
        skuId: true,
        skuCode: true,
        batchNumber: true,
        lpn: true,
        bucketType: true,
        expiryDate: true,
        bookQuantity: true,
        finalQuantity: true,
        diffQuantity: true,
        adjustmentId: true,
        disposalId: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.inventoryCountRoundLine.findMany({
      where: {
        orderId: order.id,
      },
      select: {
        id: true,
        detailId: true,
        batchId: true,
        roundType: true,
        status: true,
        countedQuantity: true,
        diffQuantity: true,
        counterUserName: true,
      },
    }),
    prisma.inventoryCountRecord.findMany({
      where: {
        orderId: order.id,
      },
      orderBy: [
        { submittedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        detailId: true,
        batchId: true,
        roundType: true,
        sourceType: true,
        countedQuantity: true,
        diffQuantity: true,
        actorUserName: true,
        remark: true,
        submittedAt: true,
        createdAt: true,
      },
    }),
  ])

  const recordDetailIds = records
    .map((record) => record.detailId)
    .filter((value): value is string => !!value)
  const adjustmentIds = details
    .map((detail) => detail.adjustmentId)
    .filter((value): value is string => !!value)
  const disposalIds = details
    .map((detail) => detail.disposalId)
    .filter((value): value is string => !!value)

  const [recordDetails, adjustments, disposals] = await Promise.all([
    recordDetailIds.length > 0
      ? prisma.inventoryCountDetail.findMany({
          where: {
            id: { in: recordDetailIds },
          },
          select: {
            id: true,
            detailNumber: true,
            locationCode: true,
            skuCode: true,
          },
        })
      : [],
    adjustmentIds.length > 0
      ? prisma.inventoryAdjustment.findMany({
          where: {
            id: {
              in: adjustmentIds,
            },
          },
          select: {
            id: true,
            adjustmentNumber: true,
            status: true,
            totalQuantityChange: true,
          },
        })
      : [],
    disposalIds.length > 0
      ? prisma.inventoryCountDisposal.findMany({
          where: {
            id: {
              in: disposalIds,
            },
          },
          select: {
            id: true,
            disposalNumber: true,
            sourceAdjustmentId: true,
            quantity: true,
            status: true,
            disposalType: true,
            sourceLocationCode: true,
            targetLocationCode: true,
          },
        })
      : [],
  ])

  const detailMap = new Map(recordDetails.map((detail) => [detail.id, detail]))
  const adjustmentMap = new Map(adjustments.map((adjustment) => [adjustment.id, adjustment]))
  const disposalMap = new Map(disposals.map((disposal) => [disposal.id, disposal]))
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]))
  const roundLinesByDetailId = new Map<string, typeof roundLines>()
  const batchStats = batches.reduce<Record<string, { total: number; completed: number }>>((acc, batch) => {
    acc[batch.id] = { total: 0, completed: 0 }
    return acc
  }, {})
  for (const roundLine of roundLines) {
    const current = roundLinesByDetailId.get(roundLine.detailId) || []
    current.push(roundLine)
    roundLinesByDetailId.set(roundLine.detailId, current)

    const stat = batchStats[roundLine.batchId] || { total: 0, completed: 0 }
    stat.total += 1
    if (roundLine.status !== 'PENDING') {
      stat.completed += 1
    }
    batchStats[roundLine.batchId] = stat
  }

  return {
    ...order,
    progressPercent: getProgressPercent(order),
    createdByName: createAudit?.operatorName || null,
    auditLogs: operationLogs,
    batches,
    batchStats,
    pendingDetails: details.map((detail) => {
      const adjustment = detail.adjustmentId ? adjustmentMap.get(detail.adjustmentId) : null
      const disposal = detail.disposalId ? disposalMap.get(detail.disposalId) : null
      const detailRoundLines = roundLinesByDetailId.get(detail.id) || []
      const firstRoundLine = detailRoundLines.find((roundLine) => roundLine.roundType === 'FIRST')
      const recountRoundLine = detailRoundLines.find((roundLine) => roundLine.roundType === 'RECOUNT')
      const activeRoundLine = detail.status === 'RECOUNT_PENDING'
        ? recountRoundLine || firstRoundLine
        : firstRoundLine || recountRoundLine
      return {
        ...detail,
        batchId: activeRoundLine?.batchId || null,
        roundLineId: activeRoundLine?.id || null,
        countBatchNumber: firstRoundLine?.batchId ? batchMap.get(firstRoundLine.batchId)?.batchNumber || null : null,
        firstCountQuantity: firstRoundLine?.countedQuantity ?? null,
        firstCounterUserName: firstRoundLine?.counterUserName ?? null,
        recountQuantity: recountRoundLine?.countedQuantity ?? null,
        recountUserName: recountRoundLine?.counterUserName ?? null,
        adjustmentNumber: adjustment?.adjustmentNumber || null,
        adjustmentStatus: adjustment?.status || null,
        adjustmentQuantity: adjustment?.totalQuantityChange ?? null,
        disposalNumber: disposal?.disposalNumber || null,
        disposalStatus: disposal?.status || null,
        disposalQuantity: disposal?.quantity ?? null,
        disposalType: disposal?.disposalType || null,
        disposalSourceLocationCode: disposal?.sourceLocationCode || null,
        disposalTargetLocationCode: disposal?.targetLocationCode || null,
        disposalSourceAdjustmentId: disposal?.sourceAdjustmentId || null,
      }
    }),
    records: records.map((record) => {
      const detail = detailMap.get(record.detailId)
      return {
        ...record,
        countBatchNumber: record.batchId ? batchMap.get(record.batchId)?.batchNumber || '-' : '-',
        detailNumber: detail?.detailNumber || '-',
        locationCode: detail?.locationCode || '-',
        skuCode: detail?.skuCode || '-',
      }
    }),
  }
}
