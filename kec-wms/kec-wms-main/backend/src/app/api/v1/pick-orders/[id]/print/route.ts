import { createAuthHandler } from '@/lib/api/create-handler'
import { ORDER_OPERATION_TYPES,PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextRequest,NextResponse } from 'next/server'

// POST /api/v1/pick-orders/[id]/print - 打印拣货单
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const tenantId = auth.user.tenantId
    const userId = auth.user.id

    const task = await prisma.pickOrder.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        taskNumber: true,
        status: true,
        lines: {
          select: { orderId: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { success: false, message: '拣货单不存在' },
        { status: 404 }
      )
    }

    if (task.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: '只能打印待执行状态的拣货单' },
        { status: 400 }
      )
    }

    // 获取关联的订单ID
    const orderIds = [...new Set(task.lines.map(l => l.orderId))]

    // 先查询订单信息用于记录日志
    const ordersForLog = await prisma.outboundOrder.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, orderNumber: true, status: true },
    })

    // 筛选出状态为 PENDING_PICK 的订单，只有这些订单需要更新为 PICKING
    const pendingPickOrders = ordersForLog.filter(o => o.status === 'PENDING_PICK')
    const pendingPickOrderIds = pendingPickOrders.map(o => o.id)

    await prisma.$transaction(async (tx) => {
      // 更新拣货单状态为执行中
      await tx.pickOrder.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          updatedBy: userId,
        },
      })

      // 仅更新状态为 PENDING_PICK 的订单为 PICKING
      if (pendingPickOrderIds.length > 0) {
        await tx.outboundOrder.updateMany({
          where: { id: { in: pendingPickOrderIds } },
          data: {
            status: 'PICKING',
            updatedBy: userId,
          },
        })

        // 更新订单时间节点
        await tx.orderTimeline.updateMany({
          where: { orderId: { in: pendingPickOrderIds } },
          data: { pickingStartAt: new Date() },
        })
      }

      // 记录拣货单打印操作日志
      await tx.operationLog.create({
        data: {
          tenantId,
          entityType: 'PICK_TASK',
          entityId: id,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.PRINT.type,
          operationName: PICK_TASK_OPERATION_TYPES.PRINT.name,
          beforeStatus: 'PENDING',
          afterStatus: 'IN_PROGRESS',
          remark: '打印拣货单并开始执行',
          operatorId: userId,
          operatorName: auth.user.name || undefined,
        },
      })

      // 记录拣货单状态变更操作日志
      await tx.operationLog.create({
        data: {
          tenantId,
          entityType: 'PICK_TASK',
          entityId: id,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.START_PICK.type,
          operationName: PICK_TASK_OPERATION_TYPES.START_PICK.name,
          beforeStatus: 'PENDING',
          afterStatus: 'IN_PROGRESS',
          remark: '拣货单开始执行',
          operatorId: userId,
          operatorName: auth.user.name || undefined,
        },
      })
    })

    // 仅为状态变更的订单记录操作日志
    for (const order of pendingPickOrders) {
      operationLogService.logOperation({
        tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: order.id,
        entityNumber: order.orderNumber,
        operationType: ORDER_OPERATION_TYPES.START_PICK.type,
        operationName: ORDER_OPERATION_TYPES.START_PICK.name,
        beforeStatus: order.status,
        afterStatus: 'PICKING',
        remark: `拣货单 ${task.taskNumber} 开始执行`,
        operatorId: userId,
        operatorName: auth.user.name || undefined,
        metadata: {
          pickOrderId: id,
          pickOrderNumber: task.taskNumber,
        },
      })
    }

    // 获取打印数据
    const printData = await prisma.pickOrder.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            warehouseCode: true,
            warehouseName: true,
          },
        },
        lines: {
          select: {
            lineNumber: true,
            skuCode: true,
            expectedQty: true,
            batchNumber: true,
            lpn: true,
            order: {
              select: {
                orderNumber: true,
                referenceNumber: true,
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
                barcode: true,
              },
            },
          },
          orderBy: [
            { location: { locationCode: 'asc' } },
            { lineNumber: 'asc' },
          ],
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: printData,
      message: '拣货单已开始执行',
    })
  } catch (error) {
    console.error('打印拣货单失败:', error)
    return NextResponse.json(
      { success: false, message: '打印拣货单失败' },
      { status: 500 }
    )
  }
})
