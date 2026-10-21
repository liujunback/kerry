import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { ORDER_OPERATION_TYPES, PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma, prismaRead } from '@/lib/db/prisma'
import {
  ORDER_EXECUTION_LOCK_CONFLICT_CODE,
  OrderExecutionLockConflictError,
  withOrderExecutionLocks,
} from '@/lib/services/order-execution-lock-service'
import { assignPickOrder } from '@/lib/services/pick-assignment-service'
import { findActiveWaveStrategyExecutionJobsByWarehouses } from '@/lib/services/wave-strategy-execution-job-service'
import { generatePickTaskNumber } from '@/lib/utils/number-generator'
import { createPickOrderSchema, pickOrderListQuerySchema } from '@/lib/validations/pick-order'
import { waveTypeConfigItemSchema } from '@/lib/validations/wave-strategy'
import { NextRequest, NextResponse } from 'next/server'

type ManualPickMode = 'SKU_BATCH' | 'MIXED_BATCH'
type ManualTaskType =
  | 'SINGLE_ONE_HOT'
  | 'SINGLE_ONE_NORMAL'
  | 'SINGLE_MULTI_HOT'
  | 'SINGLE_MULTI_NORMAL'
  | 'MULTI_FIXED_COMBO'
  | 'MULTI_NON_FIXED'

type ManualWaveTypeConfig = {
  code: ManualTaskType
  enabled: boolean
  minOrdersPerWave: number
  pickMode: string
}

const manualFallbackRules: Record<ManualTaskType, { enabled: boolean; minOrdersPerWave: number; pickMode: ManualPickMode }> = {
  SINGLE_ONE_HOT: { enabled: true, minOrdersPerWave: 5, pickMode: 'SKU_BATCH' },
  SINGLE_ONE_NORMAL: { enabled: true, minOrdersPerWave: 50, pickMode: 'MIXED_BATCH' },
  SINGLE_MULTI_HOT: { enabled: true, minOrdersPerWave: 80, pickMode: 'SKU_BATCH' },
  SINGLE_MULTI_NORMAL: { enabled: true, minOrdersPerWave: 48, pickMode: 'MIXED_BATCH' },
  MULTI_FIXED_COMBO: { enabled: true, minOrdersPerWave: 5, pickMode: 'MIXED_BATCH' },
  MULTI_NON_FIXED: { enabled: true, minOrdersPerWave: 48, pickMode: 'MIXED_BATCH' },
}

function normalizeManualPickMode(value: string | undefined, fallback: ManualPickMode): ManualPickMode {
  return value === 'SKU_BATCH' || value === 'MIXED_BATCH' ? value : fallback
}

function getManualRule(configs: ManualWaveTypeConfig[], code: ManualTaskType) {
  const fallback = manualFallbackRules[code]
  const config = configs.find((item) => item.code === code)
  if (!config) {
    return fallback
  }

  return {
    enabled: config.enabled,
    minOrdersPerWave: config.minOrdersPerWave || fallback.minOrdersPerWave,
    pickMode: normalizeManualPickMode(config.pickMode, fallback.pickMode),
  }
}

async function loadManualWaveTypeConfigs(tenantId: string, warehouseId: string): Promise<ManualWaveTypeConfig[]> {
  const strategy = await prismaRead.waveStrategy.findFirst({
    where: {
      tenantId,
      warehouseId,
      status: 'ENABLED',
      isDeleted: false,
    },
    include: {
      currentVersion: {
        include: {
          ruleSet: {
            select: {
              waveTypeConfigJson: true,
            },
          },
        },
      },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  const rawConfigs = strategy?.currentVersion?.ruleSet?.waveTypeConfigJson
  if (!Array.isArray(rawConfigs)) {
    return []
  }

  return rawConfigs.flatMap((item) => {
    const parsed = waveTypeConfigItemSchema.safeParse(item)
    if (!parsed.success) {
      return []
    }

    return [{
      code: parsed.data.code,
      enabled: parsed.data.enabled,
      minOrdersPerWave: parsed.data.minOrdersPerWave,
      pickMode: parsed.data.pickMode,
    }]
  })
}

function buildSingleSkuOrderCounts(
  orders: Array<{ id: string }>,
  allocations: Array<{ referenceId: string; skuId: string }>
) {
  const skuIdsByOrderId = new Map<string, Set<string>>()

  for (const allocation of allocations) {
    const skuIds = skuIdsByOrderId.get(allocation.referenceId) || new Set<string>()
    skuIds.add(allocation.skuId)
    skuIdsByOrderId.set(allocation.referenceId, skuIds)
  }

  const counts = new Map<string, number>()
  for (const order of orders) {
    const skuIds = skuIdsByOrderId.get(order.id)
    if (!skuIds || skuIds.size !== 1) {
      return null
    }
    const skuId = Array.from(skuIds)[0]
    counts.set(skuId, (counts.get(skuId) || 0) + 1)
  }

  return counts
}

function buildManualLineSignatureCounts(
  orders: Array<{ id: string }>,
  allocations: Array<{ referenceId: string; skuId: string; allocatedQty: number }>
) {
  const skuQtyByOrderId = new Map<string, Map<string, number>>()

  for (const allocation of allocations) {
    const skuQtyMap = skuQtyByOrderId.get(allocation.referenceId) || new Map<string, number>()
    skuQtyMap.set(allocation.skuId, (skuQtyMap.get(allocation.skuId) || 0) + allocation.allocatedQty)
    skuQtyByOrderId.set(allocation.referenceId, skuQtyMap)
  }

  const counts = new Map<string, number>()
  for (const order of orders) {
    const skuQtyMap = skuQtyByOrderId.get(order.id)
    if (!skuQtyMap || skuQtyMap.size === 0) {
      return null
    }

    const signature = Array.from(skuQtyMap.entries())
      .map(([skuId, allocatedQty]) => `${skuId}:${allocatedQty}`)
      .sort()
      .join('|')

    counts.set(signature, (counts.get(signature) || 0) + 1)
  }

  return counts
}

function inferManualPickOrderType(
  orders: Array<{ id: string; orderType: string }>,
  allocations: Array<{ referenceId: string; skuId: string; allocatedQty: number }>,
  waveTypeConfigs: ManualWaveTypeConfig[]
): { taskType: ManualTaskType; pickMode: ManualPickMode } {
  const singleSkuOrderCounts = buildSingleSkuOrderCounts(orders, allocations)
  const manualLineSignatureCounts = buildManualLineSignatureCounts(orders, allocations)

  if (orders.every((order) => order.orderType === 'SINGLE_ITEM_SINGLE')) {
    const hotRule = getManualRule(waveTypeConfigs, 'SINGLE_ONE_HOT')
    if (hotRule.enabled && singleSkuOrderCounts?.size === 1 && Math.max(...singleSkuOrderCounts.values()) >= hotRule.minOrdersPerWave) {
      return { taskType: 'SINGLE_ONE_HOT', pickMode: hotRule.pickMode }
    }
    const normalRule = getManualRule(waveTypeConfigs, 'SINGLE_ONE_NORMAL')
    return { taskType: 'SINGLE_ONE_NORMAL', pickMode: normalRule.pickMode }
  }

  if (orders.every((order) => order.orderType === 'SINGLE_ITEM_MULTI')) {
    const hotRule = getManualRule(waveTypeConfigs, 'SINGLE_MULTI_HOT')
    if (hotRule.enabled && singleSkuOrderCounts?.size === 1 && Math.max(...singleSkuOrderCounts.values()) >= hotRule.minOrdersPerWave) {
      return { taskType: 'SINGLE_MULTI_HOT', pickMode: hotRule.pickMode }
    }
    const normalRule = getManualRule(waveTypeConfigs, 'SINGLE_MULTI_NORMAL')
    return { taskType: 'SINGLE_MULTI_NORMAL', pickMode: normalRule.pickMode }
  }

  if (orders.every((order) => order.orderType === 'MULTI_ITEM')) {
    const fixedRule = getManualRule(waveTypeConfigs, 'MULTI_FIXED_COMBO')
    if (
      fixedRule.enabled &&
      manualLineSignatureCounts?.size === 1 &&
      Math.max(...manualLineSignatureCounts.values()) >= fixedRule.minOrdersPerWave
    ) {
      return { taskType: 'MULTI_FIXED_COMBO', pickMode: fixedRule.pickMode }
    }

    const nonFixedRule = getManualRule(waveTypeConfigs, 'MULTI_NON_FIXED')
    return { taskType: 'MULTI_NON_FIXED', pickMode: nonFixedRule.pickMode }
  }

  if (orders.every((order) => order.orderType !== 'MULTI_ITEM')) {
    const normalRule = getManualRule(waveTypeConfigs, 'SINGLE_MULTI_NORMAL')
    return { taskType: 'SINGLE_MULTI_NORMAL', pickMode: normalRule.pickMode }
  }

  const nonFixedRule = getManualRule(waveTypeConfigs, 'MULTI_NON_FIXED')
  return { taskType: 'MULTI_NON_FIXED', pickMode: nonFixedRule.pickMode }
}

// GET /api/v1/pick-orders - 获取拣货单列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = pickOrderListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      searchType: searchParams.get('searchType'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      orderBusinessType: searchParams.get('orderBusinessType'),
      dateType: searchParams.get('dateType'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      channel: searchParams.get('channel'),
      isCombined: searchParams.get('isCombined'),
      taskType: searchParams.get('taskType'),
      pickMode: searchParams.get('pickMode'),
      warehouseId: searchParams.get('warehouseId'),
      zoneId: searchParams.get('zoneId'),
      assignedUserId: searchParams.get('assignedUserId'),
      createdAtFrom: searchParams.get('createdAtFrom'),
      createdAtTo: searchParams.get('createdAtTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const {
      page, pageSize, searchType, search, status, orderBusinessType,
      dateType, dateFrom, dateTo, channel, isCombined, taskType, pickMode,
      warehouseId: requestedWarehouseId, assignedUserId, createdAtFrom, createdAtTo,
      sortBy, sortOrder,
    } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      const searchTerms = search.split(',').map((s) => s.trim()).filter(Boolean)
      const isMultiple = searchTerms.length > 1

      switch (searchType) {
        case 'taskNumber':
          where.taskNumber = isMultiple ? { in: searchTerms } : { contains: search }
          break
        case 'waveNumber':
          where.wave = isMultiple ? { waveNumber: { in: searchTerms } } : { waveNumber: { contains: search } }
          break
        case 'containerNumber':
          where.containerNumber = isMultiple ? { in: searchTerms } : { contains: search }
          break
        case 'orderNumber':
        default:
          where.lines = isMultiple
            ? { some: { order: { orderNumber: { in: searchTerms } } } }
            : { some: { order: { orderNumber: { contains: search } } } }
          break
      }
    }

    if (status) where.status = status
    if (taskType) where.taskType = taskType
    if (pickMode) where.pickMode = pickMode
    if (warehouseId) where.warehouseId = warehouseId
    if (assignedUserId) where.assignedUserId = assignedUserId

    if (orderBusinessType || channel || isCombined !== undefined) {
      const orderConditions: Record<string, unknown> = {}
      if (orderBusinessType) orderConditions.orderBusinessType = orderBusinessType
      if (channel) orderConditions.extension = { channel: { contains: channel } }
      if (isCombined !== undefined) orderConditions.isCombined = isCombined

      if (!where.lines) {
        where.lines = { some: { order: orderConditions } }
      } else {
        const existingLines = where.lines as Record<string, unknown>
        if (existingLines.some) {
          const existingOrder = ((existingLines.some as Record<string, unknown>).order as Record<string, unknown>) || {}
          existingLines.some = { order: { ...existingOrder, ...orderConditions } }
        }
      }
    }

    const effectiveDateFrom = dateFrom || createdAtFrom
    const effectiveDateTo = dateTo || createdAtTo
    if (effectiveDateFrom || effectiveDateTo) {
      const dateField = dateType === 'completed' ? 'completedAt' : 'createdAt'
      where[dateField] = {}
      if (effectiveDateFrom) {
        ;(where[dateField] as Record<string, unknown>).gte = effectiveDateFrom
      }
      if (effectiveDateTo) {
        const endOfDay = new Date(effectiveDateTo)
        endOfDay.setHours(23, 59, 59, 999)
        ;(where[dateField] as Record<string, unknown>).lte = endOfDay
      }
    }

    const total = await prismaRead.pickOrder.count({ where })

    const tasks = await prismaRead.pickOrder.findMany({
      where,
      select: {
        id: true,
        taskNumber: true,
        taskType: true,
        status: true,
        priority: true,
        assignedUserId: true,
        assignedAt: true,
        startedAt: true,
        completedAt: true,
        totalLines: true,
        totalQty: true,
        pickedQty: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        wave: {
          select: {
            id: true,
            waveNumber: true,
            strategyId: true,
          },
        },
        _count: {
          select: {
            lines: true,
          },
        },
        lines: {
          select: {
            orderId: true,
            skuId: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                orderBusinessType: true,
                orderType: true,
                isCombined: true,
                extension: {
                  select: {
                    channel: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const strategyIds = [...new Set(tasks.map((task) => task.wave?.strategyId).filter((id): id is string => Boolean(id)))]
    const strategies = strategyIds.length === 0
      ? []
      : await prismaRead.waveStrategy.findMany({
          where: {
            tenantId: auth.user.tenantId,
            id: { in: strategyIds },
          },
          select: {
            id: true,
            createdBy: true,
          },
        })
    const strategyCreatorMap = new Map(strategies.map((strategy) => [strategy.id, strategy.createdBy]))
    const assignedUserIds = tasks.map((task) => task.assignedUserId).filter((id): id is string => Boolean(id))
    const createdByUserIds = tasks
      .map((task) => task.createdBy || (task.wave?.strategyId ? strategyCreatorMap.get(task.wave.strategyId) : null))
      .filter((id): id is string => Boolean(id))
    const userIds = [...new Set([...assignedUserIds, ...createdByUserIds])]
    const users = userIds.length === 0
      ? []
      : await prismaRead.user.findMany({
          where: {
            tenantId: auth.user.tenantId,
            id: { in: userIds },
          },
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        })
    const userMap = new Map(users.map((user) => [user.id, user]))

    const processedTasks = tasks.map((task) => {
      const uniqueOrders = task.lines.map((line) => line.order).filter((order, index, arr) => arr.findIndex((item) => item.id === order.id) === index)
      const orderCount = uniqueOrders.length
      const skuCount = new Set(task.lines.map((line) => line.skuId)).size
      const businessTypes = [...new Set(uniqueOrders.map((order) => order.orderBusinessType))]
      const orderTypes = [...new Set(uniqueOrders.map((order) => order.orderType))]
      const channels = [...new Set(uniqueOrders.map((order) => order.extension?.channel).filter(Boolean))]
      const hasCombined = uniqueOrders.some((order) => order.isCombined)
      const creatorId = task.createdBy || (task.wave?.strategyId ? strategyCreatorMap.get(task.wave.strategyId) : null)

      return {
        ...task,
        orderCount,
        skuCount,
        businessTypes,
        orderTypes,
        channels,
        hasCombined,
        assignedUser: task.assignedUserId ? userMap.get(task.assignedUserId) || null : null,
        createdByUser: creatorId ? userMap.get(creatorId) || null : null,
        lines: undefined,
      }
    })

    return NextResponse.json({
      success: true,
      data: processedTasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取拣货单列表失败', error)
    return NextResponse.json({ success: false, message: '获取拣货单列表失败' }, { status: 500 })
  }
})

// POST /api/v1/pick-orders - 创建拣货单
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validation = createPickOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validation.error.errors },
        { status: 400 },
      )
    }

    const { warehouseId, orderIds, assignedUserId, priority, notes } = validation.data
    const tenantId = auth.user.tenantId
    const userId = auth.user.id
    const now = new Date()

    const warehouse = await prismaRead.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
      select: { id: true, warehouseCode: true },
    })

    if (!warehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 })
    }

    const activeWaveJobs = await findActiveWaveStrategyExecutionJobsByWarehouses(tenantId, [warehouseId])
    const activeWaveJob = activeWaveJobs.get(warehouseId)
    if (activeWaveJob) {
      return NextResponse.json(
        {
          success: false,
          message: `仓库正在执行波次策略（任务 ${activeWaveJob.jobNumber}），请稍后再创建拣货单`,
          code: 'WAREHOUSE_WAVE_EXECUTION_RUNNING',
          data: activeWaveJob,
        },
        { status: 409 }
      )
    }

    const orders = await prismaRead.outboundOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId,
        warehouseId,
        status: 'ALLOCATED',
      },
      select: {
        id: true,
        orderNumber: true,
        orderBusinessType: true,
        orderType: true,
        status: true,
      },
    })

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { success: false, message: '存在订单不存在、仓库不匹配或状态不允许创建拣货单' },
        { status: 400 },
      )
    }

    const existingPickLine = await prismaRead.pickOrderLine.findFirst({
      where: {
        tenantId,
        orderId: { in: orderIds },
        task: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
      select: {
        task: {
          select: { taskNumber: true },
        },
      },
    })

    if (existingPickLine?.task) {
      return NextResponse.json(
        {
          success: false,
          message: `订单已存在进行中的拣货单: ${existingPickLine.task.taskNumber}`,
        },
        { status: 400 },
      )
    }

    const allocations = await prismaRead.allocationDetail.findMany({
      where: {
        tenantId,
        referenceType: 'OUTBOUND_ORDER',
        referenceId: { in: orderIds },
        status: 'ALLOCATED',
      },
      select: {
        bucketId: true,
        locationId: true,
        skuId: true,
        batchNumber: true,
        lpn: true,
        allocatedQty: true,
        referenceId: true,
        referenceLineId: true,
      },
      orderBy: [{ referenceId: 'asc' }, { allocatedAt: 'asc' }],
    })

    if (allocations.length === 0) {
      const orderLineSummary = await prismaRead.outboundOrderLine.findMany({
        where: {
          tenantId,
          orderId: { in: orderIds },
        },
        select: {
          skuId: true,
          skuCode: true,
          allocatedQty: true,
        },
      })

      const allocatedBucketCount = await prismaRead.inventoryBucket.count({
        where: {
          tenantId,
          warehouseId,
          bucketType: 'ALLOCATED',
          skuId: { in: Array.from(new Set(orderLineSummary.map((line) => line.skuId))) },
        },
      })

      const allocatedLineCount = orderLineSummary.filter((line) => line.allocatedQty > 0).length

      return NextResponse.json(
        {
          success: false,
          message:
            allocatedLineCount > 0
              ? `订单状态为已分配，但缺少分配明细${allocatedBucketCount === 0 ? '且没有 ALLOCATED 库存桶' : ''}，请重新执行分配库存或修复历史数据`
              : '订单尚未产生可拣货的分配结果，请先执行分配库存',
        },
        { status: 400 },
      )
    }

    const orderLineIds = allocations
      .map((allocation) => allocation.referenceLineId)
      .filter((id): id is string => Boolean(id))

    const orderLines = await prismaRead.outboundOrderLine.findMany({
      where: {
        tenantId,
        id: { in: orderLineIds },
      },
      select: {
        id: true,
        skuId: true,
        skuCode: true,
      },
    })

    const orderLineMap = new Map(orderLines.map((line) => [line.id, line]))
    const pickLines = allocations.filter(
      (allocation) => allocation.referenceLineId && orderLineMap.has(allocation.referenceLineId),
    )

    if (pickLines.length === 0) {
      return NextResponse.json(
        { success: false, message: '分配明细缺少订单行信息，无法创建拣货单' },
        { status: 400 },
      )
    }

    const waveTypeConfigs = await loadManualWaveTypeConfigs(tenantId, warehouseId)
    const { taskType, pickMode } = inferManualPickOrderType(orders, allocations, waveTypeConfigs)
    const orderBusinessType = orders.length === 1 ? orders[0].orderBusinessType : 'STANDARD'

    const createdTask = await withOrderExecutionLocks(
      {
        tenantId,
        orderIds,
      },
      async () =>
        prisma.$transaction(async (tx) => {
          const taskNumber = await generatePickTaskNumber(tenantId, warehouse.warehouseCode, tx)
          const pickOrder = await tx.pickOrder.create({
            data: {
              tenantId,
              warehouseId,
              taskNumber,
              taskType,
              order_business_type: orderBusinessType,
              status: 'PENDING',
              priority,
              assignedUserId: assignedUserId || undefined,
              assignedAt: assignedUserId ? now : null,
              assignmentSource: assignedUserId ? 'MANUAL' : null,
              assignmentStrategyType: null,
              pickMethod: 'PAPER',
              pickMode,
              notes: notes || undefined,
              totalLines: pickLines.length,
              totalQty: pickLines.reduce((sum, line) => sum + line.allocatedQty, 0),
              createdBy: userId,
              updatedBy: userId,
              lines: {
                create: pickLines.map((line, index) => {
                  const orderLine = orderLineMap.get(line.referenceLineId!)!
                  return {
                    tenantId,
                    lineNumber: index + 1,
                    orderId: line.referenceId,
                    orderLineId: line.referenceLineId!,
                    skuId: line.skuId,
                    skuCode: orderLine.skuCode,
                    locationId: line.locationId,
                    bucketId: line.bucketId,
                    batchNumber: line.batchNumber || null,
                    lpn: line.lpn || null,
                    expectedQty: line.allocatedQty,
                    createdBy: userId,
                    updatedBy: userId,
                  }
                }),
              },
            },
            select: {
              id: true,
              taskNumber: true,
            },
          })

          const updatedOrders = await tx.outboundOrder.updateMany({
            where: {
              id: { in: orderIds },
              tenantId,
              status: 'ALLOCATED',
              waveId: null,
            },
            data: {
              status: 'PENDING_PICK',
              updatedBy: userId,
            },
          })

          if (updatedOrders.count !== orderIds.length) {
            throw new Error('订单状态已变化、已加入波次或已被其他流程占用，请刷新后重试')
          }

          for (const order of orders) {
            await tx.orderTimeline.upsert({
              where: { orderId: order.id },
              create: {
                tenantId,
                orderId: order.id,
                pendingPickAt: now,
              },
              update: {
                pendingPickAt: now,
              },
            })
          }

          await tx.operationLog.create({
            data: {
              tenantId,
              entityType: 'PICK_TASK',
              entityId: pickOrder.id,
              entityNumber: pickOrder.taskNumber,
              operationType: PICK_TASK_OPERATION_TYPES.CREATE.type,
              operationName: PICK_TASK_OPERATION_TYPES.CREATE.name,
              beforeStatus: '',
              afterStatus: 'PENDING',
              remark: `创建拣货单，关联 ${orderIds.length} 个订单`,
              operatorId: userId,
              operatorName: auth.user.name || undefined,
            },
          })

          await tx.operationLog.createMany({
            data: orders.map((order) => ({
              tenantId,
              entityType: 'OUTBOUND_ORDER',
              entityId: order.id,
              entityNumber: order.orderNumber,
              operationType: ORDER_OPERATION_TYPES.CREATE_PICK_TASK.type,
              operationName: ORDER_OPERATION_TYPES.CREATE_PICK_TASK.name,
              beforeStatus: order.status,
              afterStatus: 'PENDING_PICK',
              remark: `生成拣货单 ${pickOrder.taskNumber}`,
              operatorId: userId,
              operatorName: auth.user.name || undefined,
            })),
          })

          if (!assignedUserId) {
            await assignPickOrder({
              tenantId,
              pickOrderId: pickOrder.id,
              operatorId: userId,
              db: tx,
            })
          }

          return tx.pickOrder.findUniqueOrThrow({
            where: { id: pickOrder.id },
            select: {
              id: true,
              taskNumber: true,
              assignedUserId: true,
              assignedAt: true,
              assignmentSource: true,
              assignmentStrategyType: true,
            },
          })
        }),
    )

    return NextResponse.json({
      success: true,
      data: createdTask,
      message: '创建拣货单成功',
    })
  } catch (error) {
    console.error('创建拣货单失败', error)
    if (error instanceof OrderExecutionLockConflictError) {
      return NextResponse.json(
        {
          success: false,
          code: ORDER_EXECUTION_LOCK_CONFLICT_CODE,
          message: error.message,
          data: {
            orderIds: error.orderIds,
          },
        },
        { status: 409 }
      )
    }
    const message = error instanceof Error ? error.message : '创建拣货单失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})
