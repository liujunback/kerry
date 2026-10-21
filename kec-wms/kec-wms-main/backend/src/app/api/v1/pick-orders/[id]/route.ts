import { createAuthHandler } from '@/lib/api/create-handler'
import { ORDER_OPERATION_TYPES,PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma,prismaRead } from '@/lib/db/prisma'
import {
  ORDER_EXECUTION_LOCK_CONFLICT_CODE,
  OrderExecutionLockConflictError,
  withOrderExecutionLocks,
} from '@/lib/services/order-execution-lock-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { findActiveWaveStrategyExecutionJobsByWarehouses } from '@/lib/services/wave-strategy-execution-job-service'
import { NextRequest,NextResponse } from 'next/server'

// GET /api/v1/pick-orders/[id] - 获取拣货单详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const task = await prismaRead.pickOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
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
            status: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            skuId: true,
            skuCode: true,
            batchNumber: true,
            lpn: true,
            expectedQty: true,
            pickedQty: true,
            shortQty: true,
            status: true,
            pickedAt: true,
            pickedBy: true,
            notes: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                referenceNumber: true,
                orderType: true,
                platform: true,
                status: true,
                client: {
                  select: {
                    id: true,
                    clientCode: true,
                    clientName: true,
                  },
                },
              },
            },
            orderLine: {
              select: {
                id: true,
                lineNumber: true,
                skuName: true,
              },
            },
            location: {
              select: {
                id: true,
                locationCode: true,
                zone: {
                  select: {
                    id: true,
                    zoneCode: true,
                    zoneName: true,
                    zoneType: true,
                  },
                },
              },
            },
            sku: {
              select: {
                id: true,
                skuCode: true,
                skuName: true,
                barcode: true,
              },
            },
            bucket: {
              select: {
                id: true,
                expiryDate: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    })

    // 获取操作日志
    const logs = await prismaRead.operationLog.findMany({
      where: {
        tenantId: auth.user.tenantId,
        entityType: 'PICK_TASK',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!task) {
      return NextResponse.json(
        { success: false, message: '拣货单不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        logs,
      },
    })
  } catch (error) {
    console.error('获取拣货单详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取拣货单详情失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/pick-orders/[id] - 取消拣货单
export const DELETE = createAuthHandler(async (
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
        waveId: true,
        warehouseId: true,
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
        { success: false, message: '只能取消待执行状态的拣货单' },
        { status: 400 }
      )
    }

    const activeWaveJobs = await findActiveWaveStrategyExecutionJobsByWarehouses(tenantId, [task.warehouseId])
    const activeWaveJob = activeWaveJobs.get(task.warehouseId)
    if (activeWaveJob) {
      return NextResponse.json(
        {
          success: false,
          message: `仓库正在执行波次策略（任务 ${activeWaveJob.jobNumber}），请稍后再取消拣货单`,
          code: 'WAREHOUSE_WAVE_EXECUTION_RUNNING',
          data: activeWaveJob,
        },
        { status: 409 }
      )
    }

    if (task.waveId) {
      return NextResponse.json(
        { success: false, message: '波次来源拣货单暂不允许直接取消，请先处理所属波次' },
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

    await withOrderExecutionLocks(
      {
        tenantId,
        orderIds,
      },
      async () => {
        await prisma.$transaction(async (tx) => {
          // 更新拣货单状态为已取消
          await tx.pickOrder.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              updatedBy: userId,
            },
          })

          // 将订单状态恢复为 ALLOCATED
          await tx.outboundOrder.updateMany({
            where: { id: { in: orderIds } },
            data: {
              status: 'ALLOCATED',
              updatedBy: userId,
            },
          })

          // 创建操作日志
          await tx.operationLog.create({
            data: {
              tenantId,
              entityType: 'PICK_TASK',
              entityId: id,
              entityNumber: task.taskNumber,
              operationType: PICK_TASK_OPERATION_TYPES.CANCEL.type,
              operationName: PICK_TASK_OPERATION_TYPES.CANCEL.name,
              beforeStatus: 'PENDING',
              afterStatus: 'CANCELLED',
              remark: `取消拣货单，${orderIds.length} 个订单恢复为已分配状态`,
              operatorId: userId,
            },
          })
        })
      },
    )

    // 为每个订单记录操作日志
    for (const order of ordersForLog) {
      operationLogService.logOperation({
        tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: order.id,
        entityNumber: order.orderNumber,
        operationType: ORDER_OPERATION_TYPES.ROLLBACK.type,
        operationName: ORDER_OPERATION_TYPES.ROLLBACK.name,
        beforeStatus: order.status,
        afterStatus: 'ALLOCATED',
        remark: `拣货单 ${task.taskNumber} 取消，订单恢复为已分配状态`,
        operatorId: userId,
        operatorName: auth.user.name || undefined,
        metadata: {
          pickOrderId: id,
          pickOrderNumber: task.taskNumber,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: '拣货单已取消',
    })
  } catch (error) {
    console.error('取消拣货单失败:', error)
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
    const message = error instanceof Error ? error.message : '取消拣货单失败'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
})
