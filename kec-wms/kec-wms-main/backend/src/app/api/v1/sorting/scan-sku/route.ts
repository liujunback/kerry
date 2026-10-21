import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { operationLogService } from '@/lib/services/operation-log-service'
import { PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { updateCellStatus, resetCellsStatus } from '@/lib/services/sorting-cell-service'

const scanSkuSchema = z.object({
  sortingTaskId: z.string().min(1, '分拣任务ID不能为空'),
  barcode: z.string().min(1, '条码不能为空'),
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validation = scanSkuSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { sortingTaskId, barcode } = validation.data

    // 获取分拣任务
    const sortingTask = await prisma.sortingTask.findFirst({
      where: {
        id: sortingTaskId,
        tenantId: auth.user.tenantId,
        status: 'IN_PROGRESS',
      },
    })

    if (!sortingTask) {
      return NextResponse.json(
        { success: false, message: '分拣任务不存在或已完成' },
        { status: 404 }
      )
    }

    // 根据条码查找SKU
    const sku = await prisma.sku.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        OR: [
          { barcode },
          { skuCode: barcode },
          { barcodes: { some: { barcode } } },
        ],
      },
      select: {
        id: true,
        skuCode: true,
        skuName: true,
        barcode: true,
      },
    })

    if (!sku) {
      return NextResponse.json(
        { success: false, message: '未找到该商品' },
        { status: 404 }
      )
    }

    // 查找该SKU在分拣任务中的待分拣明细
    const taskLine = await prisma.sortingTaskLine.findFirst({
      where: {
        sortingTaskId,
        skuId: sku.id,
        status: 'PENDING',
        sortedQty: { lt: prisma.sortingTaskLine.fields.expectedQty },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!taskLine) {
      // 检查是否已全部分拣完成
      const completedLine = await prisma.sortingTaskLine.findFirst({
        where: {
          sortingTaskId,
          skuId: sku.id,
        },
      })

      if (completedLine) {
        return NextResponse.json(
          { success: false, message: '该商品已全部分拣完成' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, message: '该商品不在分拣任务中' },
        { status: 404 }
      )
    }

    // 更新分拣明细
    const newSortedQty = taskLine.sortedQty + 1
    const isLineComplete = newSortedQty >= taskLine.expectedQty

    await prisma.sortingTaskLine.update({
      where: { id: taskLine.id },
      data: {
        sortedQty: newSortedQty,
        status: isLineComplete ? 'SORTED' : 'PENDING',
        sortedAt: isLineComplete ? new Date() : null,
      },
    })

    // 更新格口分配记录
    const cellAllocation = await prisma.sortingCellAllocation.findFirst({
      where: {
        sortingTaskId,
        orderId: taskLine.orderId,
      },
    })

    if (cellAllocation) {
      const newCellSortedQty = cellAllocation.sortedQty + 1
      const isCellComplete = newCellSortedQty >= cellAllocation.expectedQty

      await prisma.sortingCellAllocation.update({
        where: { id: cellAllocation.id },
        data: {
          sortedQty: newCellSortedQty,
          status: isCellComplete ? 'COMPLETED' : 'SORTING',
          completedAt: isCellComplete ? new Date() : null,
        },
      })

      // 更新格口状态
      if (cellAllocation.sortingCellId) {
        const cellStatus = isCellComplete ? 'COMPLETED' : 'SORTING'
        await updateCellStatus(cellAllocation.sortingCellId, cellStatus)
      }
    }

    // 更新分拣任务进度
    const newCompletedItems = sortingTask.completedItems + 1
    const isTaskComplete = newCompletedItems >= sortingTask.totalItems

    await prisma.sortingTask.update({
      where: { id: sortingTaskId },
      data: {
        completedItems: newCompletedItems,
        status: isTaskComplete ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isTaskComplete ? new Date() : null,
      },
    })

    // 如果任务完成，更新拣货单状态
    if (isTaskComplete) {
      const pickOrderBeforeUpdate = await prisma.pickOrder.findUnique({
        where: { id: sortingTask.pickOrderId },
        select: { id: true, taskNumber: true, status: true },
      })

      await prisma.pickOrder.update({
        where: { id: sortingTask.pickOrderId },
        data: {
          status: 'COMPLETED',
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
    }

    // 如果格口完成，更新订单状态
    if (cellAllocation && cellAllocation.sortedQty + 1 >= cellAllocation.expectedQty) {
      await prisma.outboundOrder.update({
        where: { id: taskLine.orderId },
        data: { status: 'SORTED' },
      })
    }

    // 如果任务完成，同步更新播种墙状态和重置格口（不依赖前端二次调用）
    if (isTaskComplete && sortingTask.sortingWallId) {
      await prisma.sortingWall.update({
        where: { id: sortingTask.sortingWallId },
        data: { sortStatus: 'SORTED' },
      })
      await resetCellsStatus(sortingTask.sortingWallId)
    }

    return NextResponse.json({
      success: true,
      data: {
        cellCode: taskLine.cellCode,
        orderNumber: taskLine.orderNumber,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        sortedQty: cellAllocation ? cellAllocation.sortedQty + 1 : newSortedQty,
        expectedQty: cellAllocation?.expectedQty || taskLine.expectedQty,
        isComplete: cellAllocation ? (cellAllocation.sortedQty + 1 >= cellAllocation.expectedQty) : isLineComplete,
        taskProgress: {
          completedItems: newCompletedItems,
          totalItems: sortingTask.totalItems,
          isTaskComplete,
        },
      },
    })
  } catch (error) {
    console.error('扫描商品失败:', error)
    return NextResponse.json(
      { success: false, message: '扫描商品失败' },
      { status: 500 }
    )
  }
})
