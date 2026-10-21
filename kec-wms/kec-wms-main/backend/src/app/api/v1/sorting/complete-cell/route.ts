import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { createAuthHandler } from '@/lib/api/create-handler'

const completeCellSchema = z.object({
  sortingTaskId: z.string().min(1, '分拣任务ID不能为空'),
  cellCode: z.string().min(1, '格口编码不能为空'),
})

export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validation = completeCellSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { sortingTaskId, cellCode } = validation.data

    // 获取格口分配记录
    const cellAllocation = await prisma.sortingCellAllocation.findFirst({
      where: {
        sortingTaskId,
        cellCode,
        tenantId: auth.user.tenantId,
      },
    })

    if (!cellAllocation) {
      return NextResponse.json(
        { success: false, message: '格口分配记录不存在' },
        { status: 404 }
      )
    }

    if (cellAllocation.status === 'COMPLETED' || cellAllocation.status === 'RELEASED') {
      return NextResponse.json(
        { success: false, message: '该格口已完成或已释放' },
        { status: 400 }
      )
    }

    // 检查是否所有商品都已分拣
    if (cellAllocation.sortedQty < cellAllocation.expectedQty) {
      return NextResponse.json(
        { success: false, message: `该格口还有 ${cellAllocation.expectedQty - cellAllocation.sortedQty} 件商品未分拣` },
        { status: 400 }
      )
    }

    // 更新格口状态为已释放（可以推送到打包）
    await prisma.sortingCellAllocation.update({
      where: { id: cellAllocation.id },
      data: {
        status: 'RELEASED',
        completedAt: new Date(),
      },
    })

    // 更新订单状态为待打包
    await prisma.outboundOrder.update({
      where: { id: cellAllocation.orderId },
      data: { status: 'SORTED' },
    })

    // 检查分拣任务是否全部完成
    const remainingCells = await prisma.sortingCellAllocation.count({
      where: {
        sortingTaskId,
        status: { in: ['ALLOCATED', 'SORTING', 'COMPLETED'] },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        cellCode,
        orderNumber: cellAllocation.orderNumber,
        orderId: cellAllocation.orderId,
        remainingCells,
        message: `格口 ${cellCode} 已完成，订单 ${cellAllocation.orderNumber} 可以打包`,
      },
    })
  } catch (error) {
    console.error('完成格口失败:', error)
    return NextResponse.json(
      { success: false, message: '完成格口失败' },
      { status: 500 }
    )
  }
})
