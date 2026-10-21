import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/outbound-orders/[id]/serial-numbers - 获取订单序列号信息
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 验证订单存在
    const order = await prisma.outboundOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: '订单不存在', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 查询该订单关联的序列号
    const serialNumbers = await prisma.serialNumber.findMany({
        where: {
          tenantId: auth.user.tenantId,
          shippedOrderId: id,
      },
      select: {
        id: true,
        serialNumber: true,
        skuId: true,
        shippedAt: true,
        createdBy: true,
        sku: {
          select: {
            skuCode: true,
            skuName: true,
          },
        },
      },
      orderBy: { shippedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: serialNumbers,
    })
  } catch (error) {
    console.error('获取订单序列号失败:', error)
    return NextResponse.json(
      { success: false, message: '获取订单序列号失败' },
      { status: 500 }
    )
  }
})
