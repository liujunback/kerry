import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import {
  createOrderInterceptionCase,
  isDirectCancelableOrderStatus,
  OrderInterceptionError,
  shouldCancelOrderBecomeInterception,
} from '@/lib/services/order-interception-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { externalCancelOrderSchema } from '@/lib/validations/outbound-external'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { NextRequest,NextResponse } from 'next/server'

/**
 * POST /api/v1/outbound-orders/by-number/[externalNumber]/cancel
 * 通过外部单号取消订单（外部API专用）
 *
 * 请求body:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 * - reason: 取消原因（必填）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context!

  // 此接口仅供外部API调用
  if (authContext.type !== 'apiKey') {
    return NextResponse.json(
      { success: false, message: '此接口仅供外部API调用' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'order:write')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { externalNumber } = await params
      const body = await request.json()

      // 验证请求数据
      const parseResult = externalCancelOrderSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode, reason } = parseResult.data

      // 确定客户ID
      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        // 通过clientCode查找客户
        const client = await prisma.client.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientCode,
          },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在' },
            { status: 404 }
          )
        }
        clientId = client.id
      }

      // 查找订单（通过referenceNumber）
      const existingOrder = await prisma.outboundOrder.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          referenceNumber: externalNumber,
        },
      })

      if (!existingOrder) {
        return NextResponse.json(
          { success: false, message: '订单不存在' },
          { status: 404 }
        )
      }

      if (['CHECKED_OUT', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(existingOrder.status)) {
        return NextResponse.json(
          { success: false, message: `订单状态为${existingOrder.status}，不允许取消`, code: 'INT_002' },
          { status: 400 }
        )
      }

      if (isDirectCancelableOrderStatus(existingOrder.status)) {
        const cancelledOrder = await prisma.$transaction(async (tx) => {
          const order = await tx.outboundOrder.update({
            where: { id: existingOrder.id },
            data: {
              status: 'CANCELLED',
              notes: existingOrder.notes
                ? `${existingOrder.notes}\n[取消原因] ${reason}`
                : `[取消原因] ${reason}`,
              updatedAt: new Date(),
              updatedBy: authContext.userId,
            },
            select: {
              orderNumber: true,
              referenceNumber: true,
              status: true,
              notes: true,
              updatedAt: true,
              client: {
                select: { clientCode: true, clientName: true },
              },
              warehouse: {
                select: { warehouseCode: true, warehouseName: true },
              },
            },
          })

          await tx.outboundOrderLine.updateMany({
            where: { orderId: existingOrder.id },
            data: {
              status: 'CANCELLED',
              updatedAt: new Date(),
              updatedBy: authContext.userId,
            },
          })

          return order
        })

        operationLogService.logOperation({
          tenantId: authContext.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: existingOrder.id,
          entityNumber: existingOrder.orderNumber,
          operationType: ORDER_OPERATION_TYPES.CANCEL.type,
          operationName: ORDER_OPERATION_TYPES.CANCEL.name,
          beforeStatus: existingOrder.status,
          afterStatus: 'CANCELLED',
          remark: reason,
          operatorId: authContext.userId,
          operatorName: undefined,
        })

        return NextResponse.json({
          success: true,
          message: '订单取消成功',
          data: cancelledOrder,
        })
      }

      if (shouldCancelOrderBecomeInterception(existingOrder.status)) {
        try {
          const interceptionCase = await prisma.$transaction(async (tx) => {
            return createOrderInterceptionCase(tx, {
              tenantId: authContext.tenantId,
              orderId: existingOrder.id,
              source: 'FOMS_CANCEL',
              remark: reason,
              orderStatusAtMark: existingOrder.status,
              markedBy: authContext.userId,
            })
          })

          await operationLogService.logOperation({
            tenantId: authContext.tenantId,
            entityType: 'OUTBOUND_ORDER',
            entityId: existingOrder.id,
            entityNumber: existingOrder.orderNumber,
            operationType: ORDER_OPERATION_TYPES.INTERCEPT.type,
            operationName: ORDER_OPERATION_TYPES.INTERCEPT.name,
            beforeStatus: existingOrder.status,
            afterStatus: existingOrder.status,
            remark: reason,
            operatorId: authContext.userId,
            operatorName: undefined,
            metadata: {
              source: 'FOMS_CANCEL',
              remark: reason,
              orderStatusAtMark: existingOrder.status,
            },
          })

          return NextResponse.json({
            success: true,
            message: '订单已标记拦截',
            data: {
              id: interceptionCase.id,
              orderId: existingOrder.id,
              orderNo: existingOrder.orderNumber,
              externalOrderNo: existingOrder.referenceNumber,
              status: existingOrder.status,
              interceptionStatus: interceptionCase.status,
              interceptionSource: interceptionCase.source,
              interceptedRemark: interceptionCase.remark,
              interceptedAt: interceptionCase.markedAt,
            },
          })
        } catch (error) {
          if (error instanceof OrderInterceptionError) {
            return NextResponse.json(
              { success: false, message: error.message, code: error.code },
              { status: error.httpStatus }
            )
          }
          throw error
        }
      }

      return NextResponse.json(
        { success: false, message: `订单状态为${existingOrder.status}，不允许取消`, code: 'INT_006' },
        { status: 400 }
      )
    } catch (error) {
      console.error('取消订单失败:', error)
      return NextResponse.json(
        { success: false, message: '取消订单失败' },
        { status: 500 }
      )
    }
  })
}
