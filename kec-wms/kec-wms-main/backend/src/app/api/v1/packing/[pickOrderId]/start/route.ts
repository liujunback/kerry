import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ pickOrderId: string }> }
) => {
  try {
    const { pickOrderId } = await params

    // 查询拣货单
    const pickOrder = await prisma.pickOrder.findFirst({
      where: {
        id: pickOrderId,
        tenantId: auth.user.tenantId,
      },
      include: {
        lines: {
          select: { orderId: true },
        },
      },
    })

    if (!pickOrder) {
      return NextResponse.json(
        { message: '拣货单不存在' },
        { status: 404 }
      )
    }

    // 验证状态 - 支持 IN_PROGRESS、PICKED、COMPLETED 状态开始打包（二次分拣后可能是 COMPLETED）
    if (!['IN_PROGRESS', 'PICKED', 'COMPLETED'].includes(pickOrder.status)) {
      return NextResponse.json(
        { message: `拣货单状态不正确，当前状态：${pickOrder.status}` },
        { status: 400 }
      )
    }

    // 获取关联的订单ID列表
    const orderIds = [...new Set(pickOrder.lines.map(line => line.orderId))]

    // 使用事务更新状态
    await prisma.$transaction(async (tx) => {
      // 更新拣货单状态为 PACKING
      await tx.pickOrder.update({
        where: { id: pickOrderId },
        data: {
          status: 'PACKING',
          updatedBy: auth.user.id,
        },
      })

      // 更新关联出库单状态为 PACKING
      await tx.outboundOrder.updateMany({
        where: {
          id: { in: orderIds },
          tenantId: auth.user.tenantId,
        },
        data: {
          status: 'PACKING',
          updatedBy: auth.user.id,
        },
      })

      // 更新订单时间节点 - 打包开始时间
      for (const orderId of orderIds) {
        await tx.orderTimeline.upsert({
          where: { orderId },
          create: {
            tenantId: auth.user.tenantId,
            orderId,
            packingStartAt: new Date(),
          },
          update: {
            packingStartAt: new Date(),
          },
        })
      }
    })

    return NextResponse.json({
      data: { message: '已开始打包' },
    })
  } catch (error) {
    console.error('开始打包失败:', error)
    return NextResponse.json(
      { message: '开始打包失败' },
      { status: 500 }
    )
  }
})
