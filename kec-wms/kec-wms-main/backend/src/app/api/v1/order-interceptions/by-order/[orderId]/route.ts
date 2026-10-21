import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

const ORDER_INTERCEPT_READ_PERMISSION = 'order-intercept:read'

export const GET = createAuthHandler(async (request, auth, context) => {
  const permissionResponse = await requirePermissionForUser(
    auth.user.id,
    ORDER_INTERCEPT_READ_PERMISSION
  )
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { orderId } = await context!.params

    const interceptionCase = await prisma.orderInterceptionCase.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        orderId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!interceptionCase) {
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

    const markedByUser = interceptionCase.markedBy
      ? await prisma.user.findUnique({
          where: { id: interceptionCase.markedBy },
          select: {
            fullName: true,
            username: true,
          },
        })
      : null

    return NextResponse.json({
      success: true,
      data: {
        id: interceptionCase.id,
        orderId: interceptionCase.orderId,
        source: interceptionCase.source,
        remark: interceptionCase.remark,
        orderStatusAtMark: interceptionCase.orderStatusAtMark,
        status: interceptionCase.status,
        markedBy: interceptionCase.markedBy,
        markedByName: markedByUser?.fullName || markedByUser?.username || '系统',
        markedAt: interceptionCase.markedAt,
        blockedAtCheckout: interceptionCase.blockedAtCheckout,
        handlingAction: interceptionCase.handlingAction,
        handledBy: interceptionCase.handledBy,
        handledAt: interceptionCase.handledAt,
      },
    })
  } catch (error) {
    console.error('获取订单拦截详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取订单拦截详情失败' },
      { status: 500 }
    )
  }
})
