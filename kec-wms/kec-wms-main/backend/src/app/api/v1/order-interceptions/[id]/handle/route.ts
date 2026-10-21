import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { deallocateInventorySync } from '@/lib/services/inventory-allocation-service'
import {
  CANCEL_TO_INTERCEPT_ORDER_STATUSES,
  OrderInterceptionError,
} from '@/lib/services/order-interception-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { handleOrderInterceptionSchema } from '@/lib/validations/order-interception'
import { NextResponse } from 'next/server'

const ORDER_INTERCEPT_WRITE_PERMISSION = 'order-intercept:write'

export const POST = createAuthHandler(async (request, auth, context) => {
  const permissionResponse = await requirePermissionForUser(
    auth.user.id,
    ORDER_INTERCEPT_WRITE_PERMISSION
  )
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = handleOrderInterceptionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { action } = validationResult.data

    const interceptionCase = await prisma.orderInterceptionCase.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        isActive: true,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    })

    if (!interceptionCase) {
      return NextResponse.json(
        { success: false, message: '拦截案件不存在', code: 'INT_001' },
        { status: 404 }
      )
    }

    if (action === 'WAIT') {
      const handledCase = await prisma.orderInterceptionCase.update({
        where: { id: interceptionCase.id },
        data: {
          handlingAction: 'WAIT',
          handledBy: auth.user.id,
          handledAt: new Date(),
        },
      })

      await operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: interceptionCase.order.id,
        entityNumber: interceptionCase.order.orderNumber,
        operationType: ORDER_OPERATION_TYPES.HOLD.type,
        operationName: ORDER_OPERATION_TYPES.HOLD.name,
        beforeStatus: interceptionCase.order.status,
        afterStatus: interceptionCase.order.status,
        remark: '截单处理动作：等待',
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
        metadata: {
          interceptionCaseId: handledCase.id,
          handlingAction: 'WAIT',
        },
      })

      return NextResponse.json({
        success: true,
        message: '已标记为等待处理',
        data: {
          id: handledCase.id,
          handlingAction: handledCase.handlingAction,
          handledBy: handledCase.handledBy,
          handledAt: handledCase.handledAt,
        },
      })
    }

    if (!(CANCEL_TO_INTERCEPT_ORDER_STATUSES as readonly string[]).includes(interceptionCase.order.status)) {
      throw new OrderInterceptionError('当前订单状态不允许回库', 'INT_006', 400)
    }

    const deallocateResult = await deallocateInventorySync(
      interceptionCase.order.id,
      auth.user.tenantId,
      auth.user.id,
      {
        allowedStatuses: [...CANCEL_TO_INTERCEPT_ORDER_STATUSES],
        resetProgressQuantities: true,
        clearWaveContext: true,
        cancelShipments: true,
      }
    )

    if (!deallocateResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: deallocateResult.message || '回库失败',
          code: 'INT_006',
        },
        { status: 400 }
      )
    }

    const handledCase = await prisma.orderInterceptionCase.update({
      where: { id: interceptionCase.id },
      data: {
        handlingAction: 'RESTOCK',
        handledBy: auth.user.id,
        handledAt: new Date(),
        isActive: false,
      },
    })

    await operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'OUTBOUND_ORDER',
      entityId: interceptionCase.order.id,
      entityNumber: interceptionCase.order.orderNumber,
      operationType: ORDER_OPERATION_TYPES.ROLLBACK.type,
      operationName: ORDER_OPERATION_TYPES.ROLLBACK.name,
      beforeStatus: interceptionCase.order.status,
      afterStatus: 'PENDING',
      remark: '截单处理动作：回库',
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
      metadata: {
        interceptionCaseId: handledCase.id,
        handlingAction: 'RESTOCK',
        totalDeallocatedQty: deallocateResult.deallocatedQty || 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: '订单已回库到待处理',
      data: {
        id: handledCase.id,
        handlingAction: handledCase.handlingAction,
        handledBy: handledCase.handledBy,
        handledAt: handledCase.handledAt,
        orderStatus: 'PENDING',
      },
    })
  } catch (error) {
    if (error instanceof OrderInterceptionError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.httpStatus }
      )
    }

    console.error('处理拦截案件失败:', error)
    return NextResponse.json(
      { success: false, message: '处理拦截案件失败' },
      { status: 500 }
    )
  }
})
