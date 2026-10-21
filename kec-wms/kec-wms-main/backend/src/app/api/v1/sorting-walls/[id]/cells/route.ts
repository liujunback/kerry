import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/sorting-walls/[id]/cells - 获取播种墙的所有格口列表
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 检查播种墙是否存在
    const sortingWall = await prisma.sortingWall.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        wallCode: true,
        wallName: true,
        horizontalCells: true,
        verticalCells: true,
        totalCells: true,
      },
    })

    if (!sortingWall) {
      return NextResponse.json(
        { success: false, message: '播种墙不存在' },
        { status: 404 }
      )
    }

    // 获取所有格口
    const cells = await prisma.sortingCell.findMany({
      where: {
        sortingWallId: id,
      },
      select: {
        id: true,
        cellCode: true,
        cellPosition: true,
        rowNumber: true,
        columnNumber: true,
        isActive: true,
        status: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { rowNumber: 'asc' },
        { columnNumber: 'asc' },
      ],
    })

    // 统计格口状态
    const statusCount = {
      EMPTY: 0,
      ALLOCATED: 0,
      SORTING: 0,
      COMPLETED: 0,
    }

    cells.forEach((cell) => {
      if (cell.status in statusCount) {
        statusCount[cell.status as keyof typeof statusCount]++
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sortingWall,
        cells,
        statistics: {
          total: cells.length,
          active: cells.filter((c) => c.isActive).length,
          statusCount,
        },
      },
    })
  } catch (error) {
    console.error('获取格口列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取格口列表失败' },
      { status: 500 }
    )
  }
})
