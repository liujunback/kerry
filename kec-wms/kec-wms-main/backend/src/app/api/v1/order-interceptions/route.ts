import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import {
  createOrderInterceptionCase,
  isManualInterceptionAllowedStatus,
  OrderInterceptionError,
} from '@/lib/services/order-interception-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import {
  createOrderInterceptionSchema,
  orderInterceptionListQuerySchema,
} from '@/lib/validations/order-interception'
import { NextRequest, NextResponse } from 'next/server'

const ORDER_INTERCEPT_READ_PERMISSION = 'order-intercept:read'
const ORDER_INTERCEPT_WRITE_PERMISSION = 'order-intercept:write'

function resolveManualInterceptionError(status: string) {
  if (['CHECKED_OUT', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
    return new OrderInterceptionError('订单已签出或已完结，不能再拦截', 'INT_002', 400)
  }

  if (['CREATED', 'PENDING', 'ALLOCATED', 'PENDING_WAVE', 'OUT_OF_STOCK'].includes(status)) {
    return new OrderInterceptionError('订单未进入波次，不能人工拦截', 'INT_005', 400)
  }

  return new OrderInterceptionError('订单当前状态不允许人工拦截', 'INT_006', 400)
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(
    auth.user.id,
    ORDER_INTERCEPT_READ_PERMISSION
  )
  if (permissionResponse) {
    return permissionResponse
  }

  const queryResult = orderInterceptionListQuerySchema.safeParse({
    page: request.nextUrl.searchParams.get('page'),
    pageSize: request.nextUrl.searchParams.get('pageSize'),
    orderNumber: request.nextUrl.searchParams.get('orderNumber'),
    source: request.nextUrl.searchParams.get('source'),
    status: request.nextUrl.searchParams.get('status'),
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: queryResult.error.errors },
      { status: 400 }
    )
  }

  const { page, pageSize, orderNumber, source, status } = queryResult.data

  const where: Record<string, unknown> = {
    tenantId: auth.user.tenantId,
    isActive: true,
  }

  if (source) where.source = source
  if (status) where.status = status
  if (orderNumber) {
    where.order = {
      is: {
        orderNumber: { contains: orderNumber },
      },
    }
  }

  const [total, records] = await Promise.all([
    prisma.orderInterceptionCase.count({ where }),
    prisma.orderInterceptionCase.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            client: {
              select: {
                clientCode: true,
                clientName: true,
              },
            },
            warehouse: {
              select: {
                warehouseCode: true,
                warehouseName: true,
              },
            },
          },
        },
      },
      orderBy: { markedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const markedByIds = [...new Set(records.map((item) => item.markedBy).filter(Boolean))] as string[]
  const users = markedByIds.length > 0
    ? await prisma.user.findMany({
        where: {
          id: { in: markedByIds },
        },
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      })
    : []
  const userMap = new Map(users.map((user) => [user.id, user.fullName || user.username]))

  return NextResponse.json({
    success: true,
    data: records.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      orderStatus: item.order.status,
      source: item.source,
      remark: item.remark,
      orderStatusAtMark: item.orderStatusAtMark,
      status: item.status,
      markedBy: item.markedBy,
      markedByName: item.markedBy ? userMap.get(item.markedBy) || item.markedBy : '系统',
      markedAt: item.markedAt,
      blockedAtCheckout: item.blockedAtCheckout,
      handlingAction: item.handlingAction,
      handledBy: item.handledBy,
      handledAt: item.handledAt,
      client: item.order.client,
      warehouse: item.order.warehouse,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(
    auth.user.id,
    ORDER_INTERCEPT_WRITE_PERMISSION
  )
  if (permissionResponse) {
    return permissionResponse
  }

  const body = await request.json()
  const validationResult = createOrderInterceptionSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const { orderNumber, remark } = validationResult.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          orderNumber,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      })

      if (!order) {
        throw new OrderInterceptionError('订单不存在', 'INT_001', 404)
      }

      if (!isManualInterceptionAllowedStatus(order.status)) {
        throw resolveManualInterceptionError(order.status)
      }

      const interceptionCase = await createOrderInterceptionCase(tx, {
        tenantId: auth.user.tenantId,
        orderId: order.id,
        source: 'MANUAL',
        remark,
        orderStatusAtMark: order.status,
        markedBy: auth.user.id,
      })

      return {
        order,
        interceptionCase,
      }
    })

    await operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'OUTBOUND_ORDER',
      entityId: result.order.id,
      entityNumber: result.order.orderNumber,
      operationType: ORDER_OPERATION_TYPES.INTERCEPT.type,
      operationName: ORDER_OPERATION_TYPES.INTERCEPT.name,
      beforeStatus: result.order.status,
      afterStatus: result.order.status,
      remark,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
      metadata: {
        source: 'MANUAL',
        remark,
        orderStatusAtMark: result.order.status,
      },
    })

    return NextResponse.json({
      success: true,
      message: '订单拦截成功',
      data: {
        id: result.interceptionCase.id,
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.interceptionCase.status,
        source: result.interceptionCase.source,
        remark: result.interceptionCase.remark,
        markedAt: result.interceptionCase.markedAt,
        markedBy: result.interceptionCase.markedBy,
      },
    })
  } catch (error) {
    if (error instanceof OrderInterceptionError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.httpStatus }
      )
    }

    console.error('创建订单拦截失败:', error)
    return NextResponse.json(
      { success: false, message: '创建订单拦截失败' },
      { status: 500 }
    )
  }
})
