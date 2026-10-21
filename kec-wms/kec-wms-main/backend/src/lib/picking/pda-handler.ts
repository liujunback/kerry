import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import type { AuthUser } from '@/lib/auth/middleware'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { checkPermissionForUser } from '@/lib/auth/user-permissions'
import { ORDER_OPERATION_TYPES, PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma, prismaRead, type TransactionClient } from '@/lib/db/prisma'
import { adjust, pick as pickInventory } from '@/lib/services/inventory-operation-service'
import { BucketType, InventoryEventType } from '@/lib/services/inventory-event-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { createOrUpdatePickingShortageCases } from '@/lib/services/picking-exception-service'

const bindPickingContainerSchema = z.object({
  containerCode: z.string().trim().min(1, '拣货框号不能为空').max(32, '拣货框号不能超过 32 个字符'),
})

const submitPickingLineSchema = z.object({
  locationCode: z.string().trim().min(1, '货位编码不能为空').max(64, '货位编码不能超过 64 个字符'),
  skuBarcode: z.string().trim().min(1, 'SKU 条码不能为空').max(128, 'SKU 条码不能超过 128 个字符'),
  actualQty: z.coerce.number().int().min(0, '实际拣货数量不能小于 0'),
  shortageConfirmed: z.coerce.boolean().optional().default(false),
  shortageReason: z.string().trim().max(200, '缺货原因不能超过 200 个字符').optional(),
})

type AuthContext = { user: AuthUser }

type PickTaskOwnershipRecord = {
  id: string
  assignedUserId: string | null
}

const PDA_PICKING_PERMISSION = 'picking:execute'
const PDA_PICKING_TRANSACTION_OPTIONS = {
  maxWait: 10000,
  timeout: 30000,
}
const PDA_PICKING_BUSY_MESSAGE = '当前操作较多，请稍后重试'

type PickTaskSummaryRecord = {
  id: string
  taskNumber: string
  taskType: string
  status: string
  createdAt: string | Date
  targetContainer: string | null
  totalLines: number
  totalQty: number
  pickedQty: number
  lines: Array<{
    orderId: string
    skuId: string
    locationId: string
    order: {
      id: string
      extension: {
        channel: string | null
      } | null
    }
  }>
}

type PickTaskDetailRecord = {
  id: string
  taskNumber: string
  taskType: string
  status: string
  totalLines: number
  totalQty: number
  pickedQty: number
  targetContainer: string | null
  downstreamMode: string | null
  createdAt: string | Date
  lines: Array<{
    id: string
    lineNumber: number
    status: string
    expectedQty: number
    pickedQty: number
    shortQty: number
    skuId: string
    skuCode: string
    locationId: string
    batchNumber: string | null
    lpn: string | null
    orderId: string
    orderLineId: string
    location: {
      locationCode: string
    }
    sku: {
      skuCode: string
      skuName: string
      barcode: string | null
    }
    order: {
      id: string
      orderNumber: string
      clientId: string
      extension: {
        channel: string | null
      } | null
    }
  }>
}

type PickTaskShortageLineRecord = {
  id: string
  orderId: string
  orderLineId: string
  skuId: string
  skuCode: string
  expectedQty: number
  pickedQty: number
  shortQty: number
  locationId: string
  bucketId: string | null
  batchNumber: string | null
  lpn: string | null
  bucket: {
    asnNumber: string | null
  } | null
  location: {
    locationCode: string
  }
  sku: {
    skuName: string | null
  }
  order: {
    orderNumber: string
  }
}

function isPdaPickingTransactionBusyError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes('Unable to start a transaction')
    || error.message.includes('Transaction API error')
}

function createPdaPickingBusyResponse() {
  return NextResponse.json(
    {
      success: false,
      code: 'PDA_PICKING_BUSY',
      message: PDA_PICKING_BUSY_MESSAGE,
    },
    {
      status: 409,
      headers: {
        'Retry-After': '3',
      },
    }
  )
}

function getTaskStatusPriority(status: string): number {
  switch (status) {
    case 'IN_PROGRESS':
      return 0
    case 'PENDING':
      return 1
    default:
      return 99
  }
}

function mapDownstreamArea(downstreamMode: string | null): string {
  return downstreamMode === 'PACK_DIRECT' ? '爆款打包区' : '分拣区'
}

function buildTaskSummary(task: PickTaskSummaryRecord) {
  const orderIds = new Set(task.lines.map((line) => line.orderId))
  const skuIds = new Set(task.lines.map((line) => line.skuId))
  const locationIds = new Set(task.lines.map((line) => line.locationId))
  const channels = Array.from(
    new Set(
      task.lines
        .map((line) => line.order.extension?.channel?.trim())
        .filter((channel): channel is string => Boolean(channel))
    )
  )

  return {
    id: task.id,
    taskNumber: task.taskNumber,
    taskType: task.taskType,
    status: task.status,
    orderCount: orderIds.size,
    skuCount: skuIds.size,
    locationCount: locationIds.size,
    channel: channels.join(' / ') || null,
    createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
    targetContainer: task.targetContainer,
    totalLines: task.totalLines,
    totalQty: task.totalQty,
    pickedQty: task.pickedQty,
  }
}

function buildTaskDetail(task: PickTaskDetailRecord) {
  const summary = buildTaskSummary(task)
  const lines = task.lines.map((line) => {
    const remainingQty = getLineRemainingQty(line)

    return {
      id: line.id,
      lineNumber: line.lineNumber,
      status: line.status,
      orderId: line.orderId,
      orderNumber: line.order.orderNumber,
      locationCode: line.location.locationCode,
      skuCode: line.sku.skuCode,
      skuName: line.sku.skuName,
      barcode: line.sku.barcode,
      expectedQty: line.expectedQty,
      pickedQty: line.pickedQty,
      shortQty: line.shortQty,
      remainingQty,
    }
  })
  const processedLines = lines.filter((line) => line.status !== 'PENDING').length
  const recommendedLine = lines.find((line) => line.status === 'PENDING') ?? null
  const totalShortQty = lines.reduce((sum, line) => sum + line.shortQty, 0)

  return {
    ...summary,
    downstreamMode: task.downstreamMode,
    downstreamArea: mapDownstreamArea(task.downstreamMode),
    processedLines,
    totalShortQty,
    lines,
    recommendedLine,
  }
}

function getLineRemainingQty(line: { expectedQty: number; pickedQty: number; shortQty: number }) {
  return Math.max(0, line.expectedQty - line.pickedQty - line.shortQty)
}

async function decrementShortageAllocation(params: {
  tenantId: string
  orderId: string
  orderLineId: string
  locationId: string
  skuId: string
  batchNumber: string | null
  lpn: string | null
  asnNumber: string | null
  quantity: number
  tx: TransactionClient
}) {
  let remainingQty = params.quantity
  const allocations = await params.tx.$queryRaw<Array<{
    id: string
    allocated_qty: number
    status: string
    released_at: Date | null
  }>>`
    SELECT id, allocated_qty, status, released_at
    FROM allocation_detail
    WHERE tenant_id = ${params.tenantId}
      AND reference_type = 'OUTBOUND_ORDER'
      AND reference_id = ${params.orderId}
      AND reference_line_id = ${params.orderLineId}
      AND location_id = ${params.locationId}
      AND sku_id = ${params.skuId}
      AND batch_number = ${params.batchNumber || ''}
      AND lpn = ${params.lpn || ''}
      AND asn_number = ${params.asnNumber || ''}
      AND status IN ('ALLOCATED', 'PICKING', 'PICKED')
      AND allocated_qty > 0
    ORDER BY allocated_at ASC
    FOR UPDATE
  `

  for (const allocation of allocations) {
    if (remainingQty <= 0) break

    const decrementQty = Math.min(remainingQty, allocation.allocated_qty)
    const nextAllocatedQty = allocation.allocated_qty - decrementQty
    await params.tx.allocationDetail.update({
      where: { id: allocation.id },
      data: {
        allocatedQty: nextAllocatedQty,
        status: nextAllocatedQty === 0 ? 'RELEASED' : allocation.status,
        releasedAt: nextAllocatedQty === 0 ? new Date() : allocation.released_at,
      },
    })
    remainingQty -= decrementQty
  }

  if (remainingQty > 0) {
    throw new Error('缺货数量超过原分配明细可冲销数量')
  }
}

async function ensurePdaPickingAccess(auth: AuthContext): Promise<NextResponse | null> {
  const hasPermission = await checkPermissionForUser(auth.user.id, PDA_PICKING_PERMISSION)
  if (!hasPermission) {
    return NextResponse.json(
      { success: false, message: '当前账号没有 PDA 拣货权限' },
      { status: 403 },
    )
  }

  const warehouseId = resolveScopedWarehouseId(auth.user)
  if (!warehouseId) {
    return NextResponse.json(
      { success: false, message: '当前请求缺少仓库上下文' },
      { status: 400 },
    )
  }

  const pickerProfile = await prismaRead.pickerProfile.findFirst({
    where: {
      tenantId: auth.user.tenantId,
      warehouseId,
      userId: auth.user.id,
      isEnabled: true,
      allowPdaExecution: true,
    },
    select: {
      id: true,
    },
  })

  if (!pickerProfile) {
    return NextResponse.json(
      { success: false, message: '当前账号未启用 PDA 拣货权限，请联系管理员配置拣货员档案' },
      { status: 403 },
    )
  }

  return null
}

async function getPickTaskOwnership(taskId: string, auth: AuthContext): Promise<PickTaskOwnershipRecord | null> {
  const warehouseId = resolveScopedWarehouseId(auth.user)
  return prismaRead.pickOrder.findFirst({
    where: {
      id: taskId,
      tenantId: auth.user.tenantId,
      ...(warehouseId ? { warehouseId } : {}),
    },
    select: {
      id: true,
      assignedUserId: true,
    },
  })
}

async function ensureOwnedPickTask(taskId: string, auth: AuthContext): Promise<NextResponse | null> {
  const task = await getPickTaskOwnership(taskId, auth)

  if (!task) {
    return NextResponse.json(
      { success: false, message: '拣货任务不存在' },
      { status: 404 },
    )
  }

  if (!task.assignedUserId) {
    return NextResponse.json(
      { success: false, message: '当前拣货任务未分配给当前账号，禁止操作' },
      { status: 403 },
    )
  }

  if (task.assignedUserId !== auth.user.id) {
    return NextResponse.json(
      { success: false, message: '当前拣货任务已分配给其他拣货员，禁止操作' },
      { status: 403 },
    )
  }

  return null
}

async function getScopedPickingTask(
  taskId: string,
  auth: AuthContext
): Promise<PickTaskDetailRecord | null> {
  const warehouseId = resolveScopedWarehouseId(auth.user)
  const where = {
    id: taskId,
    tenantId: auth.user.tenantId,
    assignedUserId: auth.user.id,
    ...(warehouseId ? { warehouseId } : {}),
  }

  return prismaRead.pickOrder.findFirst({
    where,
    select: {
      id: true,
      taskNumber: true,
      taskType: true,
      status: true,
      totalLines: true,
      totalQty: true,
      pickedQty: true,
      targetContainer: true,
      downstreamMode: true,
      createdAt: true,
      lines: {
        orderBy: { lineNumber: 'asc' },
        select: {
          id: true,
          lineNumber: true,
          status: true,
          expectedQty: true,
          pickedQty: true,
          shortQty: true,
          skuId: true,
          skuCode: true,
          locationId: true,
          batchNumber: true,
          lpn: true,
          orderId: true,
          orderLineId: true,
          location: {
            select: {
              locationCode: true,
            },
          },
          sku: {
            select: {
              skuCode: true,
              skuName: true,
              barcode: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              clientId: true,
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
  }) as Promise<PickTaskDetailRecord | null>
}

export async function getPickingTasks(request: NextRequest, auth: AuthContext) {
  try {
    const accessResponse = await ensurePdaPickingAccess(auth)
    if (accessResponse) {
      return accessResponse
    }

    const warehouseId = resolveScopedWarehouseId(auth.user, request.nextUrl.searchParams.get('warehouseId'))
    const tasks = await prismaRead.pickOrder.findMany({
      where: {
        tenantId: auth.user.tenantId,
        assignedUserId: auth.user.id,
        ...(warehouseId ? { warehouseId } : {}),
        status: { in: ['IN_PROGRESS', 'PENDING'] },
      },
      select: {
        id: true,
        taskNumber: true,
        taskType: true,
        status: true,
        createdAt: true,
        targetContainer: true,
        totalLines: true,
        totalQty: true,
        pickedQty: true,
        lines: {
          select: {
            orderId: true,
            skuId: true,
            locationId: true,
            order: {
              select: {
                id: true,
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
      orderBy: { createdAt: 'asc' },
    }) as unknown as PickTaskSummaryRecord[]

    const data = tasks
      .sort((left, right) => {
        const statusDiff = getTaskStatusPriority(left.status) - getTaskStatusPriority(right.status)
        if (statusDiff !== 0) return statusDiff
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      })
      .map(buildTaskSummary)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('获取 PDA 拣货任务列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取拣货任务列表失败' },
      { status: 500 }
    )
  }
}

export async function getPickingTaskDetail(
  _request: NextRequest,
  auth: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessResponse = await ensurePdaPickingAccess(auth)
    if (accessResponse) {
      return accessResponse
    }

    const { id } = await params
    const ownershipResponse = await ensureOwnedPickTask(id, auth)
    if (ownershipResponse) {
      return ownershipResponse
    }

    const task = await getScopedPickingTask(id, auth)

    if (!task) {
      return NextResponse.json(
        { success: false, message: '拣货任务不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: buildTaskDetail(task),
    })
  } catch (error) {
    console.error('获取 PDA 拣货任务详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取拣货任务详情失败' },
      { status: 500 }
    )
  }
}

export async function postBindPickingContainer(
  request: NextRequest,
  auth: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessResponse = await ensurePdaPickingAccess(auth)
    if (accessResponse) {
      return accessResponse
    }

    const { id } = await params
    const ownershipResponse = await ensureOwnedPickTask(id, auth)
    if (ownershipResponse) {
      return ownershipResponse
    }

    const parsed = bindPickingContainerSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    const task = await prisma.pickOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        assignedUserId: auth.user.id,
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        id: true,
        taskNumber: true,
        status: true,
        targetContainer: true,
        lines: {
          select: {
            orderId: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { success: false, message: '拣货任务不存在' },
        { status: 404 }
      )
    }

    if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
      return NextResponse.json(
        { success: false, message: '当前拣货任务状态不允许绑定拣货框' },
        { status: 400 }
      )
    }

    const containerCode = parsed.data.containerCode

    if (task.targetContainer && task.targetContainer !== containerCode) {
      return NextResponse.json(
        {
          success: false,
          message: `当前任务已绑定拣货框 ${task.targetContainer}，不能重复绑定其他拣货框`,
        },
        { status: 409 }
      )
    }

    const container = await prisma.container.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        containerCode,
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        id: true,
        containerCode: true,
        containerType: true,
        enabledStatus: true,
        workStatus: true,
        warehouseId: true,
      },
    })

    if (!container) {
      return NextResponse.json(
        { success: false, message: '拣货框不存在' },
        { status: 404 }
      )
    }

    if (container.containerType !== 'SORTING_BOX') {
      return NextResponse.json(
        { success: false, message: '只允许绑定分拣箱类型的拣货框' },
        { status: 400 }
      )
    }

    if (container.enabledStatus !== 'ENABLED') {
      return NextResponse.json(
        { success: false, message: '拣货框已禁用，不可使用' },
        { status: 400 }
      )
    }

    const isSameContainer = task.targetContainer === containerCode
    if (!isSameContainer && container.workStatus !== 'IDLE') {
      return NextResponse.json(
        { success: false, message: '拣货框当前处于占用状态，不可使用' },
        { status: 400 }
      )
    }

    const orderIds = Array.from(new Set(task.lines.map((line) => line.orderId)))
    const ordersForLog = await prisma.outboundOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    })
    const ordersNeedStartPick = ordersForLog.filter((order) => order.status === 'PENDING_PICK')
    const now = new Date()

    await prisma.$transaction(async (tx) => {
      if (!isSameContainer) {
        await tx.container.update({
          where: { id: container.id },
          data: {
            workStatus: 'OCCUPIED',
            lastOccupiedTime: now,
          },
        })
      }

      await tx.pickOrder.update({
        where: { id: task.id },
        data: {
          status: 'IN_PROGRESS',
          targetContainer: containerCode,
          pickMethod: 'PDA',
          startedAt: task.status === 'PENDING' ? now : undefined,
          updatedBy: auth.user.id,
        },
      })

      if (ordersNeedStartPick.length > 0) {
        await tx.outboundOrder.updateMany({
          where: { id: { in: ordersNeedStartPick.map((order) => order.id) } },
          data: {
            status: 'PICKING',
            updatedBy: auth.user.id,
          },
        })

        await tx.orderTimeline.updateMany({
          where: { orderId: { in: ordersNeedStartPick.map((order) => order.id) } },
          data: {
            pickingStartAt: now,
          },
        })
      }

      if (task.status === 'PENDING') {
        await tx.operationLog.create({
          data: {
            tenantId: auth.user.tenantId,
            entityType: 'PICK_TASK',
            entityId: task.id,
            entityNumber: task.taskNumber,
            operationType: PICK_TASK_OPERATION_TYPES.START_PICK.type,
            operationName: PICK_TASK_OPERATION_TYPES.START_PICK.name,
            beforeStatus: 'PENDING',
            afterStatus: 'IN_PROGRESS',
            remark: `绑定拣货框 ${containerCode} 并开始拣货`,
            operatorId: auth.user.id,
            operatorName: auth.user.name || undefined,
          },
        })
      }
    }, PDA_PICKING_TRANSACTION_OPTIONS)

    await Promise.all(
      ordersNeedStartPick.map((order) =>
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: order.id,
          entityNumber: order.orderNumber,
          operationType: ORDER_OPERATION_TYPES.START_PICK.type,
          operationName: ORDER_OPERATION_TYPES.START_PICK.name,
          beforeStatus: order.status,
          afterStatus: 'PICKING',
          remark: `PDA 拣货任务 ${task.taskNumber} 绑定拣货框 ${containerCode}`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            pickOrderId: task.id,
            pickOrderNumber: task.taskNumber,
            targetContainer: containerCode,
          },
        })
      )
    )

    const refreshedTask = await getScopedPickingTask(id, auth)
    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        status: 'IN_PROGRESS',
        targetContainer: containerCode,
        detail: refreshedTask ? buildTaskDetail(refreshedTask) : null,
      },
      message: isSameContainer ? '拣货框已绑定，可继续拣货' : '拣货框绑定成功',
    })
  } catch (error) {
    console.error('绑定 PDA 拣货框失败:', error)
    if (isPdaPickingTransactionBusyError(error)) {
      return createPdaPickingBusyResponse()
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '绑定拣货框失败' },
      { status: 500 }
    )
  }
}

export async function postPickTaskLine(
  request: NextRequest,
  auth: AuthContext,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const accessResponse = await ensurePdaPickingAccess(auth)
    if (accessResponse) {
      return accessResponse
    }

    const { id, lineId } = await params
    const ownershipResponse = await ensureOwnedPickTask(id, auth)
    if (ownershipResponse) {
      return ownershipResponse
    }

    const parsed = submitPickingLineSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.pickOrder.findFirst({
        where: {
          id,
          tenantId: auth.user.tenantId,
          assignedUserId: auth.user.id,
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: {
          id: true,
          taskNumber: true,
          status: true,
          warehouseId: true,
          targetContainer: true,
        },
      })

      if (!task) {
        throw new Error('拣货任务不存在')
      }

      if (task.status !== 'IN_PROGRESS') {
        throw new Error('当前拣货任务未处于拣货中状态')
      }

      if (!task.targetContainer) {
        throw new Error('请先绑定拣货框后再执行拣货')
      }

      const line = await tx.pickOrderLine.findFirst({
        where: {
          id: lineId,
          pickOrderId: task.id,
          tenantId: auth.user.tenantId,
        },
        select: {
          id: true,
          lineNumber: true,
          status: true,
          expectedQty: true,
          pickedQty: true,
          shortQty: true,
          skuId: true,
          skuCode: true,
          locationId: true,
          batchNumber: true,
          lpn: true,
          orderId: true,
          orderLineId: true,
          location: {
            select: {
              locationCode: true,
            },
          },
          sku: {
            select: {
              skuCode: true,
              skuName: true,
              barcode: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              clientId: true,
            },
          },
        },
      })

      if (!line) {
        throw new Error('拣货明细不存在')
      }

      if (line.status !== 'PENDING') {
        throw new Error('当前拣货明细已处理，请切换到下一条')
      }

      if (parsed.data.locationCode !== line.location.locationCode) {
        throw new Error(`货位不一致，应扫描货位 ${line.location.locationCode}`)
      }

      const normalizedBarcode = parsed.data.skuBarcode.trim()
      const barcodeMatches = normalizedBarcode.toLowerCase() === (line.sku.barcode ?? '').toLowerCase()
      const skuCodeMatches =
        normalizedBarcode.toLowerCase() === line.sku.skuCode.toLowerCase() ||
        normalizedBarcode.toLowerCase() === line.skuCode.toLowerCase()

      if (!barcodeMatches && !skuCodeMatches) {
        throw new Error(`SKU 不一致，应扫描 ${line.sku.barcode || line.sku.skuCode}`)
      }

      const groupLines = await tx.pickOrderLine.findMany({
        where: {
          pickOrderId: task.id,
          tenantId: auth.user.tenantId,
          status: 'PENDING',
          locationId: line.locationId,
          skuId: line.skuId,
        },
        orderBy: { lineNumber: 'asc' },
        select: {
          id: true,
          lineNumber: true,
          expectedQty: true,
          pickedQty: true,
          shortQty: true,
          skuId: true,
          skuCode: true,
          locationId: true,
          bucketId: true,
          batchNumber: true,
          lpn: true,
          orderId: true,
          orderLineId: true,
          bucket: {
            select: {
              batchNumber: true,
              lpn: true,
              asnNumber: true,
              expiryDate: true,
            },
          },
          order: {
            select: {
              clientId: true,
            },
          },
        },
      })

      const groupedRemainingQty = groupLines.reduce((sum, item) => sum + getLineRemainingQty(item), 0)
      if (parsed.data.actualQty > groupedRemainingQty) {
        throw new Error(`实际拣货数量不能超过待拣货数量 ${groupedRemainingQty}`)
      }

      const shortageQty = groupedRemainingQty - parsed.data.actualQty
      if (shortageQty > 0 && !parsed.data.shortageConfirmed) {
        throw new Error(`实际拣货数量少于待拣数量 ${shortageQty}，请确认缺货后再提交`)
      }

      let remainingActualQty = parsed.data.actualQty
      const remainingGroupedQty = groupedRemainingQty - parsed.data.actualQty
      const pickedDeltas = new Map<string, number>()

      for (const groupLine of groupLines) {
        if (remainingActualQty <= 0) {
          break
        }

        const lineRemainingQty = getLineRemainingQty(groupLine)
        if (lineRemainingQty <= 0) {
          continue
        }

        const pickedQtyDelta = Math.min(remainingActualQty, lineRemainingQty)
        if (pickedQtyDelta <= 0) {
          continue
        }

        const newPickedQty = groupLine.pickedQty + pickedQtyDelta
        const remainingLineQty = lineRemainingQty - pickedQtyDelta
        const newStatus = remainingLineQty === 0 ? 'PICKED' : 'PENDING'

        if (pickedQtyDelta > 0) {
          await pickInventory(
            {
              tenantId: auth.user.tenantId,
              warehouseId: task.warehouseId,
              clientId: groupLine.order.clientId,
              locationId: groupLine.locationId,
              skuId: groupLine.skuId,
              skuCode: groupLine.skuCode,
              quantity: pickedQtyDelta,
              batchNumber: groupLine.bucket.batchNumber,
              lpn: groupLine.bucket.lpn,
              asnNumber: groupLine.bucket.asnNumber,
              expiryDate: groupLine.bucket.expiryDate,
              referenceType: 'PICK_TASK',
              referenceId: task.id,
              referenceNumber: task.taskNumber,
              operatorId: auth.user.id,
            },
            tx
          )
          await tx.outboundOrderLine.update({
            where: { id: groupLine.orderLineId },
            data: {
              pickedQty: { increment: pickedQtyDelta },
              status: newStatus === 'PICKED' ? 'PICKED' : 'PICKING',
              updatedBy: auth.user.id,
            },
          })
          await tx.allocationDetail.updateMany({
            where: {
              tenantId: auth.user.tenantId,
              referenceType: 'OUTBOUND_ORDER',
              referenceLineId: groupLine.orderLineId,
              locationId: groupLine.locationId,
              skuId: groupLine.skuId,
              batchNumber: groupLine.bucket.batchNumber || '',
              lpn: groupLine.bucket.lpn || '',
              asnNumber: groupLine.bucket.asnNumber || '',
              status: { in: ['ALLOCATED', 'PICKING'] },
            },
            data: {
              pickedQty: { increment: pickedQtyDelta },
              status: 'PICKING',
              pickedAt: now,
            },
          })
        }

        await tx.pickOrderLine.update({
          where: { id: groupLine.id },
          data: {
            pickedQty: newPickedQty,
            status: newStatus,
            pickedAt: now,
            pickedBy: auth.user.id,
            updatedBy: auth.user.id,
          },
        })

        pickedDeltas.set(groupLine.id, pickedQtyDelta)
        remainingActualQty -= pickedQtyDelta
      }

      if (shortageQty > 0) {
        for (const groupLine of groupLines) {
          const pickedQtyDelta = pickedDeltas.get(groupLine.id) || 0
          const lineRemainingQty = Math.max(
            0,
            groupLine.expectedQty - groupLine.pickedQty - pickedQtyDelta - groupLine.shortQty
          )
          if (lineRemainingQty <= 0) {
            continue
          }

          await adjust(
            {
              tenantId: auth.user.tenantId,
              clientId: groupLine.order.clientId,
              warehouseId: task.warehouseId,
              locationId: groupLine.locationId,
              skuId: groupLine.skuId,
              skuCode: groupLine.skuCode,
              bucketType: BucketType.ALLOCATED,
              quantityDelta: -lineRemainingQty,
              eventType: InventoryEventType.PICK_SHORTAGE,
              batchNumber: groupLine.bucket.batchNumber,
              lpn: groupLine.bucket.lpn,
              asnNumber: groupLine.bucket.asnNumber,
              expiryDate: groupLine.bucket.expiryDate,
              reasonCode: 'PICK_SHORTAGE_CONFIRM',
              reasonDescription: 'PDA确认拣货缺货，原库位占用库存转入异常库存',
              referenceType: 'PICK_TASK',
              referenceId: task.id,
              referenceNumber: task.taskNumber,
              operatorId: auth.user.id,
            },
            tx
          )
          await adjust(
            {
              tenantId: auth.user.tenantId,
              clientId: groupLine.order.clientId,
              warehouseId: task.warehouseId,
              locationId: groupLine.locationId,
              skuId: groupLine.skuId,
              skuCode: groupLine.skuCode,
              bucketType: BucketType.EXCEPTION,
              quantityDelta: lineRemainingQty,
              eventType: InventoryEventType.PICK_SHORTAGE,
              batchNumber: groupLine.bucket.batchNumber,
              lpn: groupLine.bucket.lpn,
              asnNumber: groupLine.bucket.asnNumber,
              expiryDate: groupLine.bucket.expiryDate,
              reasonCode: 'PICK_SHORTAGE_CONFIRM',
              reasonDescription: 'PDA确认拣货缺货，原库位占用库存转入异常库存',
              referenceType: 'PICK_TASK',
              referenceId: task.id,
              referenceNumber: task.taskNumber,
              operatorId: auth.user.id,
            },
            tx
          )
          await decrementShortageAllocation({
            tenantId: auth.user.tenantId,
            orderId: groupLine.orderId,
            orderLineId: groupLine.orderLineId,
            locationId: groupLine.locationId,
            skuId: groupLine.skuId,
            batchNumber: groupLine.bucket.batchNumber,
            lpn: groupLine.bucket.lpn,
            asnNumber: groupLine.bucket.asnNumber,
            quantity: lineRemainingQty,
            tx,
          })

          const newShortQty = groupLine.shortQty + lineRemainingQty
          await tx.pickOrderLine.update({
            where: { id: groupLine.id },
            data: {
              shortQty: newShortQty,
              status: 'SHORT',
              pickedAt: now,
              pickedBy: auth.user.id,
              notes: parsed.data.shortageReason || 'PDA确认缺货',
              updatedBy: auth.user.id,
            },
          })
          await tx.outboundOrderLine.update({
            where: { id: groupLine.orderLineId },
            data: {
              shortQty: { increment: lineRemainingQty },
              status: 'PICKING',
              updatedBy: auth.user.id,
            },
          })
        }
      }

      await tx.pickOrder.update({
        where: { id: task.id },
        data: {
          pickedQty: {
            increment: parsed.data.actualQty,
          },
          updatedBy: auth.user.id,
        },
      })

      const refreshedTask = await tx.pickOrder.findFirst({
        where: {
          id: task.id,
          tenantId: auth.user.tenantId,
        },
        select: {
          id: true,
          taskNumber: true,
          taskType: true,
          status: true,
          totalLines: true,
          totalQty: true,
          pickedQty: true,
          targetContainer: true,
          downstreamMode: true,
          createdAt: true,
          lines: {
            orderBy: { lineNumber: 'asc' },
            select: {
              id: true,
              lineNumber: true,
              status: true,
              expectedQty: true,
              pickedQty: true,
              shortQty: true,
              skuId: true,
              skuCode: true,
              locationId: true,
              batchNumber: true,
              lpn: true,
              orderId: true,
              orderLineId: true,
              location: {
                select: {
                  locationCode: true,
                },
              },
              sku: {
                select: {
                  skuCode: true,
                  skuName: true,
                  barcode: true,
                },
              },
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  clientId: true,
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
      }) as PickTaskDetailRecord | null

      if (!refreshedTask) {
        throw new Error('拣货任务不存在')
      }

      return {
        taskNumber: task.taskNumber,
        detail: buildTaskDetail(refreshedTask),
        lineNumber: line.lineNumber,
        actualQty: parsed.data.actualQty,
        shortageQty,
        hasShortage: shortageQty > 0,
        remainingGroupedQty,
        groupedLineCount: groupLines.length,
      }
    }, PDA_PICKING_TRANSACTION_OPTIONS)

    return NextResponse.json({
      success: true,
      data: {
        detail: result.detail,
        isLastPendingLine: result.detail.lines.filter((line) => line.status === 'PENDING').length == 0,
        hasShortage: result.hasShortage,
        shortageQty: result.shortageQty,
        totalShortQty: result.detail.totalShortQty,
      },
      message:
        result.hasShortage
          ? `已确认缺货 ${result.shortageQty}，请继续处理剩余拣货项`
          : result.groupedLineCount > 1
          ? result.remainingGroupedQty > 0
            ? `同货位同SKU共 ${result.groupedLineCount} 条明细已拣货 ${result.actualQty}，剩余待拣 ${result.remainingGroupedQty}`
            : `同货位同SKU共 ${result.groupedLineCount} 条明细拣货成功`
          : result.remainingGroupedQty > 0
            ? `第 ${result.lineNumber} 行已拣货 ${result.actualQty}，剩余待拣 ${result.remainingGroupedQty}`
            : `第 ${result.lineNumber} 行拣货成功`,
    })
  } catch (error) {
    console.error('提交 PDA 拣货明细失败:', error)
    if (isPdaPickingTransactionBusyError(error)) {
      return createPdaPickingBusyResponse()
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '提交拣货失败' },
      { status: 400 }
    )
  }
}


export async function postCompletePickingTask(
  _request: NextRequest,
  auth: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessResponse = await ensurePdaPickingAccess(auth)
    if (accessResponse) {
      return accessResponse
    }

    const { id } = await params
    const ownershipResponse = await ensureOwnedPickTask(id, auth)
    if (ownershipResponse) {
      return ownershipResponse
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    const task = await prisma.pickOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        assignedUserId: auth.user.id,
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        id: true,
        taskNumber: true,
        status: true,
        warehouseId: true,
        downstreamMode: true,
        lines: {
          orderBy: { lineNumber: 'asc' },
          select: {
            id: true,
            status: true,
            orderId: true,
            orderLineId: true,
            skuId: true,
            skuCode: true,
            locationId: true,
            bucketId: true,
            batchNumber: true,
            lpn: true,
            expectedQty: true,
            pickedQty: true,
            shortQty: true,
            bucket: {
              select: {
                asnNumber: true,
              },
            },
            location: {
              select: {
                locationCode: true,
              },
            },
            sku: {
              select: {
                skuName: true,
              },
            },
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { success: false, message: '拣货任务不存在' },
        { status: 404 }
      )
    }

    if (task.status === 'PICKED') {
      return NextResponse.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          downstreamArea: mapDownstreamArea(task.downstreamMode),
        },
        message: '拣货任务已完成',
      })
    }

    if (task.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, message: '当前拣货任务未处于拣货中状态' },
        { status: 400 }
      )
    }

    const pendingLines = task.lines.filter((line) => line.status === 'PENDING')
    if (pendingLines.length > 0) {
      return NextResponse.json(
        { success: false, message: '仍有未处理的拣货明细，不能完成拣货' },
        { status: 400 }
      )
    }

    const invalidLine = task.lines.find((line) => line.pickedQty + line.shortQty !== line.expectedQty)
    if (invalidLine) {
      return NextResponse.json(
        { success: false, message: '存在数量不平衡的拣货明细，不能完成拣货' },
        { status: 400 }
      )
    }

    const totalPickedQty = task.lines.reduce((sum, line) => sum + line.pickedQty, 0)
    const totalShortQty = task.lines.reduce((sum, line) => sum + line.shortQty, 0)
    const pickedQtyByOrder = new Map<string, number>()
    for (const line of task.lines) {
      pickedQtyByOrder.set(line.orderId, (pickedQtyByOrder.get(line.orderId) || 0) + line.pickedQty)
    }
    const orderIds = Array.from(new Set(task.lines.map((line) => line.orderId)))
    const ordersForLog = await prisma.outboundOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    })
    const shortOrderIds = new Set(task.lines.filter((line) => line.shortQty > 0).map((line) => line.orderId))
    const ordersNeedException = ordersForLog.filter((order) => shortOrderIds.has(order.id))
    const ordersNeedComplete = ordersForLog.filter(
      (order) => ['PENDING_PICK', 'PICKING'].includes(order.status) && !shortOrderIds.has(order.id)
    )
    const downstreamArea = mapDownstreamArea(task.downstreamMode)

    await prisma.$transaction(async (tx) => {
      await tx.pickOrder.update({
        where: { id: task.id },
        data: {
          status: 'PICKED',
          pickedQty: totalPickedQty,
          completedAt: new Date(),
          updatedBy: auth.user.id,
        },
      })

      if (ordersNeedComplete.length > 0) {
        for (const order of ordersNeedComplete) {
          await tx.outboundOrder.update({
            where: { id: order.id },
            data: {
              status: 'PICKED',
              totalPickedQty: pickedQtyByOrder.get(order.id) || 0,
              updatedBy: auth.user.id,
            },
          })
        }
      }

      if (ordersNeedException.length > 0) {
        for (const order of ordersNeedException) {
          await tx.outboundOrder.update({
            where: { id: order.id },
            data: {
              status: 'EXCEPTION',
              totalPickedQty: pickedQtyByOrder.get(order.id) || 0,
              updatedBy: auth.user.id,
            },
          })
        }

        await createOrUpdatePickingShortageCases(tx, {
          tenantId: auth.user.tenantId,
          warehouseId: task.warehouseId,
          pickOrderId: task.id,
          pickOrderNumber: task.taskNumber,
          operatorId: auth.user.id,
          lines: task.lines.filter((line) => line.shortQty > 0) as PickTaskShortageLineRecord[],
        })
      }

      await tx.operationLog.create({
        data: {
          tenantId: auth.user.tenantId,
          entityType: 'PICK_TASK',
          entityId: task.id,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.COMPLETE_PICK.type,
          operationName: PICK_TASK_OPERATION_TYPES.COMPLETE_PICK.name,
          beforeStatus: 'IN_PROGRESS',
          afterStatus: 'PICKED',
          remark: totalShortQty > 0
            ? `PDA 完成拣货，发现缺货 ${totalShortQty}，订单转异常`
            : `PDA 完成拣货，后续流转到${downstreamArea}`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
        },
      })
    }, PDA_PICKING_TRANSACTION_OPTIONS)

    await Promise.all(
      ordersNeedComplete.map((order) =>
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: order.id,
          entityNumber: order.orderNumber,
          operationType: ORDER_OPERATION_TYPES.COMPLETE_PICK.type,
        operationName: ORDER_OPERATION_TYPES.COMPLETE_PICK.name,
        beforeStatus: order.status,
        afterStatus: 'PICKED',
        remark: `PDA 拣货任务 ${task.taskNumber} 已完成`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            pickOrderId: task.id,
            pickOrderNumber: task.taskNumber,
          },
        })
      )
    )

    await Promise.all(
      ordersNeedException.map((order) =>
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: order.id,
          entityNumber: order.orderNumber,
          operationType: ORDER_OPERATION_TYPES.MARK_EXCEPTION.type,
          operationName: ORDER_OPERATION_TYPES.MARK_EXCEPTION.name,
          beforeStatus: order.status,
          afterStatus: 'EXCEPTION',
          remark: `PDA 拣货任务 ${task.taskNumber} 缺货，异常类型 PICK_SHORTAGE`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            pickOrderId: task.id,
            pickOrderNumber: task.taskNumber,
            exceptionType: 'PICK_SHORTAGE',
            totalShortQty,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        status: 'PICKED',
        totalPickedQty,
        totalShortQty,
        downstreamArea,
      },
      message: totalShortQty > 0
        ? `拣货完成，缺货 ${totalShortQty}，订单已转异常`
        : `拣货完成，请送到${downstreamArea}`,
    })
  } catch (error) {
    console.error('完成 PDA 拣货任务失败:', error)
    if (isPdaPickingTransactionBusyError(error)) {
      return createPdaPickingBusyResponse()
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '完成拣货失败' },
      { status: 500 }
    )
  }
}
