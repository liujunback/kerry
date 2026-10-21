import { createAuthHandler } from '@/lib/api/create-handler'
import { ORDER_OPERATION_TYPES,PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

// POST /api/v1/print-url - 生成带 token 的打印 URL
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { documentType, ids } = body

    if (!documentType || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '参数错误' },
        { status: 400 }
      )
    }

    const { tenantId, id: userId } = auth.user

    // 如果是拣货单，先更新状态（从待拣货变为拣货中）
    if (documentType === 'pick-order') {
      await updatePickOrderStatus(tenantId, userId, ids)
    }

    // 生成 token（格式：base64(timestamp:tenantId:userId)，有效期 5 分钟）
    const timestamp = Date.now()
    const tokenData = `${timestamp}:${tenantId}:${userId}`
    const token = Buffer.from(tokenData).toString('base64')

    // 构建完整 URL - 优先使用 NEXTAUTH_URL，否则使用请求的 origin
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin
    const url = `${baseUrl}/api/v1/files/${documentType}/batch?ids=${ids.join(',')}&token=${token}`

    return NextResponse.json({
      success: true,
      data: { url },
    })
  } catch (error) {
    console.error('生成打印 URL 失败:', error)
    return NextResponse.json(
      { success: false, message: '生成打印 URL 失败' },
      { status: 500 }
    )
  }
})

// 更新拣货单状态（从待拣货变为拣货中），同时更新关联订单状态和时间线
async function updatePickOrderStatus(tenantId: string, userId: string, ids: string[]) {
  // 查找所有拣货单及其关联订单
  const pickOrders = await prisma.pickOrder.findMany({
    where: {
      id: { in: ids },
      tenantId,
    },
    select: {
      id: true,
      taskNumber: true,
      status: true,
      lines: {
        select: {
          orderId: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (pickOrders.length === 0) return

  // 分离待拣货和已开始拣货的拣货单
  const pendingTasks = pickOrders.filter(t => t.status === 'PENDING')
  const allTasks = pickOrders

  // 收集所有关联订单（去重）
  const orderMap = new Map<string, { id: string; orderNumber: string; status: string }>()
  for (const task of allTasks) {
    for (const line of task.lines) {
      if (line.order && !orderMap.has(line.orderId)) {
        orderMap.set(line.orderId, line.order)
      }
    }
  }
  const allOrderIds = Array.from(orderMap.keys())

  // 筛选需要更新状态的订单（状态为 ALLOCATED 或 PENDING_PICK 的订单）
  const ordersToUpdate = Array.from(orderMap.values()).filter(o =>
    o.status === 'ALLOCATED' || o.status === 'PENDING_PICK'
  )

  await prisma.$transaction(async (tx) => {
    // 1. 更新待拣货状态的拣货单为拣货中
    if (pendingTasks.length > 0) {
      await tx.pickOrder.updateMany({
        where: {
          id: { in: pendingTasks.map(t => t.id) },
          tenantId,
        },
        data: {
          status: 'IN_PROGRESS',
          pickMethod: 'PAPER',
          startedAt: new Date(),
          updatedBy: userId,
        },
      })

      // 创建拣货单操作日志
      await tx.operationLog.createMany({
        data: pendingTasks.map(task => ({
          tenantId,
          entityType: 'PICK_TASK',
          entityId: task.id,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.START_PICK.type,
          operationName: PICK_TASK_OPERATION_TYPES.START_PICK.name,
          beforeStatus: 'PENDING',
          afterStatus: 'IN_PROGRESS',
          remark: '打印拣货单，开始拣货',
          operatorId: userId,
        })),
      })
    }

    // 2. 更新关联订单状态为 PICKING
    if (ordersToUpdate.length > 0) {
      await tx.outboundOrder.updateMany({
        where: {
          id: { in: ordersToUpdate.map(o => o.id) },
          tenantId,
        },
        data: {
          status: 'PICKING',
          updatedBy: userId,
        },
      })

      // 创建订单操作日志
      await tx.operationLog.createMany({
        data: ordersToUpdate.map(order => ({
          tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: order.id,
          entityNumber: order.orderNumber,
          operationType: ORDER_OPERATION_TYPES.START_PICK.type,
          operationName: ORDER_OPERATION_TYPES.START_PICK.name,
          beforeStatus: order.status,
          afterStatus: 'PICKING',
          remark: '打印拣货单，开始拣货',
          operatorId: userId,
        })),
      })
    }

    // 3. 更新订单时间线的拣货开始时间（如果为空则更新）
    // 先查询现有的 timeline
    const existingTimelines = await tx.orderTimeline.findMany({
      where: { orderId: { in: allOrderIds } },
      select: { orderId: true, pickingStartAt: true },
    })
    const timelineMap = new Map(existingTimelines.map(t => [t.orderId, t]))

    for (const orderId of allOrderIds) {
      const existing = timelineMap.get(orderId)
      if (existing) {
        // 只在 pickingStartAt 为空时更新
        if (!existing.pickingStartAt) {
          await tx.orderTimeline.update({
            where: { orderId },
            data: { pickingStartAt: new Date() },
          })
        }
      } else {
        // 创建新的 timeline
        await tx.orderTimeline.create({
          data: {
            tenantId,
            orderId,
            pickingStartAt: new Date(),
          },
        })
      }
    }
  })
}
