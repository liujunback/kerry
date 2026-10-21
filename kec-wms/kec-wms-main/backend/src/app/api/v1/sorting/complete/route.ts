import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { operationLogService } from '@/lib/services/operation-log-service'
import { ORDER_OPERATION_TYPES, PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'

const completeSchema = z.object({
  sortingTaskId: z.string().min(1, '分拣任务ID不能为空'),
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validation = completeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { sortingTaskId } = validation.data

    // 获取分拣任务
    const sortingTask = await prisma.sortingTask.findFirst({
      where: {
        id: sortingTaskId,
        tenantId: auth.user.tenantId,
      },
      include: {
        sortingWall: true,
      },
    })

    if (!sortingTask) {
      return NextResponse.json(
        { success: false, message: '分拣任务不存在' },
        { status: 404 }
      )
    }

    if (sortingTask.status === 'COMPLETED') {
      // 任务已完成，检查拣货单状态是否需要更新
      const pickOrder = await prisma.pickOrder.findUnique({
        where: { id: sortingTask.pickOrderId },
        select: { id: true, taskNumber: true, status: true },
      })

      if (pickOrder && pickOrder.status !== 'COMPLETED') {
        await prisma.pickOrder.update({
          where: { id: sortingTask.pickOrderId },
          data: {
            status: 'COMPLETED',
            updatedBy: auth.user.id,
          },
        })

        // 记录拣货单状态变更操作日志
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'PICK_TASK',
          entityId: pickOrder.id,
          entityNumber: pickOrder.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.COMPLETE_PICK.type,
          operationName: PICK_TASK_OPERATION_TYPES.COMPLETE_PICK.name,
          beforeStatus: pickOrder.status,
          afterStatus: 'COMPLETED',
          remark: `分拣任务 ${sortingTask.taskNumber} 完成，拣货单完成`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            sortingTaskId,
            sortingTaskNumber: sortingTask.taskNumber,
          },
        })
      }

      // 确保播种墙状态也更新为 SORTED
      if (sortingTask.sortingWallId && sortingTask.sortingWall?.sortStatus !== 'SORTED') {
        await prisma.sortingWall.update({
          where: { id: sortingTask.sortingWallId },
          data: { sortStatus: 'SORTED' },
        })
      }

      // 注意：不重置格口状态，保留格口数据以便查看

      return NextResponse.json({
        success: true,
        data: {
          taskNumber: sortingTask.taskNumber,
          completedItems: sortingTask.completedItems,
          totalItems: sortingTask.totalItems,
          message: '分拣任务已完成',
        },
      })
    }

    // 检查是否所有格口都已完成
    const incompleteCells = await prisma.sortingCellAllocation.findMany({
      where: {
        sortingTaskId,
        status: { in: ['ALLOCATED', 'SORTING'] },
      },
      select: {
        cellCode: true,
        orderNumber: true,
        expectedQty: true,
        sortedQty: true,
      },
    })

    if (incompleteCells.length > 0) {
      const cellInfo = incompleteCells.map((c) =>
        `${c.cellCode}(${c.orderNumber}: ${c.sortedQty}/${c.expectedQty})`
      ).join(', ')
      return NextResponse.json(
        { success: false, message: `以下格口未完成分拣: ${cellInfo}` },
        { status: 400 }
      )
    }

    // 更新分拣任务状态
    await prisma.sortingTask.update({
      where: { id: sortingTaskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedBy: auth.user.id,
      },
    })

    // 更新拣货单状态为已完成
    const pickOrderBeforeUpdate = await prisma.pickOrder.findUnique({
      where: { id: sortingTask.pickOrderId },
      select: { id: true, taskNumber: true, status: true },
    })

    await prisma.pickOrder.update({
      where: { id: sortingTask.pickOrderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedBy: auth.user.id,
      },
    })

    // 记录拣货单状态变更操作日志
    if (pickOrderBeforeUpdate) {
      operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'PICK_TASK',
        entityId: pickOrderBeforeUpdate.id,
        entityNumber: pickOrderBeforeUpdate.taskNumber,
        operationType: PICK_TASK_OPERATION_TYPES.COMPLETE_PICK.type,
        operationName: PICK_TASK_OPERATION_TYPES.COMPLETE_PICK.name,
        beforeStatus: pickOrderBeforeUpdate.status,
        afterStatus: 'COMPLETED',
        remark: `分拣任务 ${sortingTask.taskNumber} 完成，拣货单完成`,
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
        metadata: {
          sortingTaskId,
          sortingTaskNumber: sortingTask.taskNumber,
        },
      })
    }

    // 获取分拣任务关联的订单ID列表
    const cellAllocations = await prisma.sortingCellAllocation.findMany({
      where: { sortingTaskId },
      select: { orderId: true },
    })
    const orderIds = [...new Set(cellAllocations.map(c => c.orderId))]

    // 更新出库订单状态为待打包
    if (orderIds.length > 0) {
      // 先查询订单信息用于记录日志
      const ordersForLog = await prisma.outboundOrder.findMany({
        where: { id: { in: orderIds }, status: 'SORTING' },
        select: { id: true, orderNumber: true, status: true },
      })

      await prisma.outboundOrder.updateMany({
        where: {
          id: { in: orderIds },
          status: 'SORTING',
        },
        data: {
          status: 'SORTED',
          updatedBy: auth.user.id,
        },
      })

      // 为每个订单记录操作日志
      for (const order of ordersForLog) {
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: order.id,
          entityNumber: order.orderNumber,
          operationType: ORDER_OPERATION_TYPES.COMPLETE_SORTING.type,
          operationName: ORDER_OPERATION_TYPES.COMPLETE_SORTING.name,
          beforeStatus: order.status,
          afterStatus: 'SORTED',
          remark: `分拣任务 ${sortingTask.taskNumber} 完成`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            sortingTaskId,
            sortingTaskNumber: sortingTask.taskNumber,
          },
        })
      }
    }

    // 更新播种墙状态为分拣完成（因为一个播种墙只能绑定一个拣货单）
    await prisma.sortingWall.update({
      where: { id: sortingTask.sortingWallId },
      data: { sortStatus: 'SORTED' },
    })

    // 注意：不在此处重置格口状态，保留格口数据以便查看最后一个SKU放在哪个格口
    // 格口状态会在开始新的分拣任务时自动清除（见 start/route.ts）

    return NextResponse.json({
      success: true,
      data: {
        taskNumber: sortingTask.taskNumber,
        completedItems: sortingTask.completedItems,
        totalItems: sortingTask.totalItems,
        message: '分拣任务已完成',
      },
    })
  } catch (error) {
    console.error('完成分拣任务失败:', error)
    return NextResponse.json(
      { success: false, message: '完成分拣任务失败' },
      { status: 500 }
    )
  }
})
