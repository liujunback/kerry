import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const sortingWallId = searchParams.get('wallId')

    if (!sortingWallId) {
      return NextResponse.json(
        { success: false, message: '播种墙ID不能为空' },
        { status: 400 }
      )
    }

    // 先查询播种墙状态
    const sortingWall = await prisma.sortingWall.findFirst({
      where: {
        id: sortingWallId,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        sortStatus: true,
      },
    })

    if (!sortingWall) {
      return NextResponse.json(
        { success: false, message: '播种墙不存在' },
        { status: 404 }
      )
    }

    // 查询该播种墙上进行中的分拣任务
    let activeTask = await prisma.sortingTask.findFirst({
      where: {
        sortingWallId,
        tenantId: auth.user.tenantId,
        status: 'IN_PROGRESS',
      },
      include: {
        pickOrder: {
          select: {
            taskNumber: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    // 如果没有进行中的任务，但播种墙状态是 SORTED（分拣完成），则返回最近完成的任务
    if (!activeTask && sortingWall.sortStatus === 'SORTED') {
      activeTask = await prisma.sortingTask.findFirst({
        where: {
          sortingWallId,
          tenantId: auth.user.tenantId,
          status: 'COMPLETED',
        },
        include: {
          pickOrder: {
            select: {
              taskNumber: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      })
    }

    // 如果播种墙是 SORTING 但无进行中任务（异常中断），视为空闲状态
    if (!activeTask && sortingWall.sortStatus === 'SORTING') {
      return NextResponse.json({ success: true, data: null })
    }

    if (!activeTask) {
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

    // 获取格口分配信息
    const cellAllocations = await prisma.sortingCellAllocation.findMany({
      where: {
        sortingTaskId: activeTask.id,
        tenantId: auth.user.tenantId,
      },
      select: {
        cellCode: true,
        orderId: true,
        orderNumber: true,
        expectedQty: true,
        sortedQty: true,
        status: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        task: {
          id: activeTask.id,
          taskNumber: activeTask.taskNumber,
          pickOrderId: activeTask.pickOrderId,
          pickOrderNumber: activeTask.pickOrder?.taskNumber || '',
          sortingWallId: activeTask.sortingWallId,
          status: activeTask.status,
          totalItems: activeTask.totalItems,
          completedItems: activeTask.completedItems,
          totalOrders: cellAllocations.length,
          completedOrders: cellAllocations.filter((c) => c.status === 'COMPLETED').length,
        },
        cellAllocations,
      },
    })
  } catch (error) {
    console.error('查询进行中的分拣任务失败:', error)
    return NextResponse.json(
      { success: false, message: '查询进行中的分拣任务失败' },
      { status: 500 }
    )
  }
})
