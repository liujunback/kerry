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
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const batchRollbackSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, '至少选择一个订单'),
  reason: z.string().min(1, '回退原因不能为空').max(500, '回退原因最大500个字符'),
})

// POST /api/v1/outbound-orders/batch-rollback - 批量回退订单
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = batchRollbackSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { orderIds, reason } = validationResult.data

    const orders = await prisma.outboundOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        waveId: true,
        clientId: true,
        warehouseId: true,
        notes: true,
      },
    })

    const invalidOrders = orders.filter(
      (order) => !['ALLOCATED', 'OUT_OF_STOCK'].includes(order.status) || order.waveId !== null
    )

    if (invalidOrders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${invalidOrders.length} 个订单不满足回退条件（需要是已分配或缺货状态且未加入波次）`,
          code: 'INVALID_ORDER_STATUS',
          data: { invalidOrders: invalidOrders.map((order) => order.orderNumber) },
        },
        { status: 400 }
      )
    }

    const activeWaveJobs = await findActiveWaveStrategyExecutionJobsByWarehouses(
      auth.user.tenantId,
      orders.map((order) => order.warehouseId)
    )
    if (activeWaveJobs.size > 0) {
      return NextResponse.json(
        {
          success: false,
          message: '存在仓库正在执行波次策略，请稍后再回退订单',
          code: 'WAREHOUSE_WAVE_EXECUTION_RUNNING',
          data: {
            blockedWarehouses: Array.from(activeWaveJobs.values()),
          },
        },
        { status: 409 }
      )
    }

    const activePickLines = await prisma.pickOrderLine.findMany({
      where: {
        tenantId: auth.user.tenantId,
        orderId: { in: orderIds },
        task: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      },
      select: {
        orderId: true,
        task: {
          select: {
            taskNumber: true,
          },
        },
      },
    })

    if (activePickLines.length > 0) {
      const blockedMap = new Map<string, string>()
      for (const line of activePickLines) {
        if (!blockedMap.has(line.orderId)) {
          blockedMap.set(line.orderId, line.task.taskNumber)
        }
      }

      const blockedOrders = orders
        .filter((order) => blockedMap.has(order.id))
        .map((order) => ({
          orderNumber: order.orderNumber,
          taskNumber: blockedMap.get(order.id),
        }))

      return NextResponse.json(
        {
          success: false,
          message: `${blockedOrders.length} 个订单存在进行中的拣货单，请先处理拣货任务`,
          code: 'ORDER_IN_ACTIVE_PICK_TASK',
          data: { blockedOrders },
        },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      details: [] as { orderNumber: string; status: string; message?: string }[],
    }

    try {
      await withOrderExecutionLocks(
        {
          tenantId: auth.user.tenantId,
          orderIds: orders.map((order) => order.id),
        },
        async () => {
          for (const order of orders) {
            try {
              const outcome = await deallocateInventorySync(order.id, auth.user.tenantId, auth.user.id)

              if (!outcome.success) {
                results.failed++
                results.details.push({
                  orderNumber: order.orderNumber,
                  status: 'FAILED',
                  message: outcome.message || '取消分配失败',
                })
                continue
              }

              await prisma.outboundOrder.update({
                where: { id: order.id },
                data: {
                  notes: order.notes
                    ? `${order.notes}\n回退原因: ${reason}`
                    : `回退原因: ${reason}`,
                  updatedBy: auth.user.id,
                },
              })

              results.success++
              results.details.push({ orderNumber: order.orderNumber, status: 'SUCCESS' })

              operationLogService.logOperation({
                tenantId: auth.user.tenantId,
                entityType: 'OUTBOUND_ORDER',
                entityId: order.id,
                entityNumber: order.orderNumber,
                operationType: ORDER_OPERATION_TYPES.ROLLBACK.type,
                operationName: ORDER_OPERATION_TYPES.ROLLBACK.name,
                beforeStatus: order.status,
                afterStatus: 'PENDING',
                remark: reason,
                operatorId: auth.user.id,
                operatorName: auth.user.name || undefined,
                metadata: {
                  totalDeallocatedQty: outcome.deallocatedQty,
                },
              })
            } catch (error) {
              results.failed++
              results.details.push({
                orderNumber: order.orderNumber,
                status: 'FAILED',
                message: error instanceof Error ? error.message : '未知错误',
              })
            }
          }
        }
      )
    } catch (error) {
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
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `成功回退 ${results.success} 个订单，失败 ${results.failed} 个`,
      data: results,
    })
  } catch (error) {
    console.error('批量回退订单失败:', error)
    return NextResponse.json({ success: false, message: '批量回退订单失败' }, { status: 500 })
  }
})
