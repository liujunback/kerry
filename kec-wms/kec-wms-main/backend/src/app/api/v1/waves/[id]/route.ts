import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/waves/[id] - 获取波次详情
export const GET = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const wave = await prisma.wave.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        waveOrders: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalOrderedQty: true,
            totalPickedQty: true,
            outbound_order_address: {
              select: {
                id: true,
                shippingName: true,
              },
            },
            lines: {
              select: {
                id: true,
                skuId: true,
                skuCode: true,
                skuName: true,
                orderedQty: true,
                allocatedQty: true,
                pickedQty: true,
              },
            },
          },
        },
        pickOrders: {
          select: {
            id: true,
            taskNumber: true,
            status: true,
            totalQty: true,
            pickedQty: true,
          },
        },
      },
    })

    if (!wave) {
      return NextResponse.json(
        { success: false, message: '波次不存在', code: 'WAVE_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: wave,
    })
  } catch (error) {
    console.error('获取波次详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取波次详情失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/waves/[id] - 取消波次
export const DELETE = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const wave = await prisma.wave.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!wave) {
      return NextResponse.json(
        { success: false, message: '波次不存在', code: 'WAVE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 只允许取消 CREATED 状态的波次
    if (wave.status !== 'CREATED') {
      return NextResponse.json(
        { success: false, message: '只能取消已创建状态的波次', code: 'WAVE_NOT_CANCELLABLE' },
        { status: 400 }
      )
    }

    // 先查询要释放的订单
    const ordersToRelease = await prisma.outboundOrder.findMany({
      where: {
        waveId: id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      select: { id: true, orderNumber: true, status: true },
    })

    // 释放订单
    await prisma.outboundOrder.updateMany({
      where: {
        waveId: id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      data: {
        waveId: null,
        waveStrategyId: null,
        waveStrategyVersionId: null,
        waveTypeCode: null,
        downstreamMode: null,
        status: 'PENDING_WAVE',
        updatedBy: auth.user.id,
      },
    })

    for (const order of ordersToRelease) {
      await prisma.outboundOrderWaveContext.updateMany({
        where: { orderId: order.id },
        data: {
          releaseStatus: null,
          lastWaveEvaluatedAt: new Date(),
        },
      })
    }

    // 更新波次状态
    await prisma.wave.update({
      where: { id },
        data: {
          status: 'CANCELLED',
          updatedBy: auth.user.id,
        },
    })

    // 为每个订单记录操作日志
    for (const order of ordersToRelease) {
      operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: order.id,
        entityNumber: order.orderNumber,
        operationType: ORDER_OPERATION_TYPES.RELEASE_WAVE.type,
        operationName: ORDER_OPERATION_TYPES.RELEASE_WAVE.name,
        beforeStatus: order.status,
        afterStatus: 'PENDING_WAVE',
        remark: `从波次 ${wave.waveNumber} 释放`,
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
        metadata: {
          waveId: wave.id,
          waveNumber: wave.waveNumber,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: '波次已取消',
    })
  } catch (error) {
    console.error('取消波次失败:', error)
    return NextResponse.json(
      { success: false, message: '取消波次失败' },
      { status: 500 }
    )
  }
})
