import { createAuthHandler } from '@/lib/api/create-handler'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { deallocateInventorySync } from '@/lib/services/inventory-allocation-service'
import {
  ORDER_EXECUTION_LOCK_CONFLICT_CODE,
  OrderExecutionLockConflictError,
  withOrderExecutionLocks,
} from '@/lib/services/order-execution-lock-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { findActiveWaveStrategyExecutionJobsByWarehouses } from '@/lib/services/wave-strategy-execution-job-service'
import { rollbackOrderSchema } from '@/lib/validations/outbound'
import { NextResponse } from 'next/server'

// POST /api/v1/outbound-orders/[id]/rollback - 回退订单到创建状态
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = rollbackOrderSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { reason } = validationResult.data

    // 1. 检查订单是否存在
    const existingOrder = await prisma.outboundOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        lines: true,
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: '订单不存在', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 2. 检查是否可以回退，只有 ALLOCATED 状态可回退
    if (existingOrder.status !== 'ALLOCATED') {
      return NextResponse.json(
        {
          success: false,
          message: '只有已分配状态的订单才可以回退到创建状态',
          code: 'ORDER_CANNOT_ROLLBACK',
        },
        { status: 400 }
      )
    }

    // 3. 检查订单是否已加入波次
    if (existingOrder.waveId) {
      return NextResponse.json(
        {
          success: false,
          message: '订单已加入波次，请先从波次中移除',
          code: 'ORDER_IN_WAVE',
        },
        { status: 400 }
      )
    }

    const activeWaveJobs = await findActiveWaveStrategyExecutionJobsByWarehouses(
      auth.user.tenantId,
      [existingOrder.warehouseId]
    )
    const activeWaveJob = activeWaveJobs.get(existingOrder.warehouseId)
    if (activeWaveJob) {
      return NextResponse.json(
        {
          success: false,
          message: `仓库正在执行波次策略（任务 ${activeWaveJob.jobNumber}），请稍后再回退订单`,
          code: 'WAREHOUSE_WAVE_EXECUTION_RUNNING',
          data: activeWaveJob,
        },
        { status: 409 }
      )
    }

    const activePickLine = await prisma.pickOrderLine.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        orderId: id,
        task: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
      select: {
        task: {
          select: {
            taskNumber: true,
          },
        },
      },
    })

    if (activePickLine?.task) {
      return NextResponse.json(
        {
          success: false,
          message: `订单存在进行中的拣货单 ${activePickLine.task.taskNumber}，请先处理拣货任务`,
          code: 'ORDER_IN_ACTIVE_PICK_TASK',
        },
        { status: 400 }
      )
    }

    // 4. 使用事件溯源系统取消分配
    const response = await withOrderExecutionLocks(
      {
        tenantId: auth.user.tenantId,
        orderIds: [id],
      },
      async () => {
        const result = await deallocateInventorySync(
          id,
          auth.user.tenantId,
          auth.user.id
        )

        if (!result.success) {
          return NextResponse.json(
            { success: false, message: result.message || '取消分配失败' },
            { status: 400 }
          )
        }

        // 5. 更新订单备注
        const order = await prisma.outboundOrder.update({
          where: { id },
          data: {
            notes: existingOrder.notes
              ? `${existingOrder.notes}\n回退原因: ${reason}`
              : `回退原因: ${reason}`,
            updatedBy: auth.user.id,
          },
          include: {
            client: {
              select: {
                id: true,
                clientCode: true,
                clientName: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                warehouseCode: true,
                warehouseName: true,
              },
            },
          },
        })

        // 6. 记录操作日志
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: id,
          entityNumber: existingOrder.orderNumber,
          operationType: ORDER_OPERATION_TYPES.ROLLBACK.type,
          operationName: ORDER_OPERATION_TYPES.ROLLBACK.name,
          beforeStatus: existingOrder.status,
          afterStatus: 'PENDING',
          remark: reason,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            totalDeallocatedQty: result.deallocatedQty,
          },
        })

        return NextResponse.json({
          success: true,
          data: order,
          message: '订单回退成功',
        })
      }
    )

    return response
  } catch (error) {
    console.error('回退订单失败:', error)
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
    return NextResponse.json(
      { success: false, message: '回退订单失败' },
      { status: 500 }
    )
  }
})
