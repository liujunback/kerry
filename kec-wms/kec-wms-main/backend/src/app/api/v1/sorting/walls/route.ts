import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'

// 获取可用播种墙列表
export const GET = createAuthHandler(async (_request, auth) => {
  try {
    const walls = await prisma.sortingWall.findMany({
      where: {
        tenantId: auth.user.tenantId,
        isActive: true,
      },
      select: {
        id: true,
        wallCode: true,
        wallName: true,
        horizontalCells: true,
        verticalCells: true,
        totalCells: true,
        sortStatus: true,
        warehouseId: true,
        warehouse: {
          select: {
            warehouseName: true,
          },
        },
      },
      orderBy: { wallCode: 'asc' },
    })

    const response = walls.map((wall) => ({
      id: wall.id,
      wallCode: wall.wallCode,
      wallName: wall.wallName,
      horizontalCells: wall.horizontalCells,
      verticalCells: wall.verticalCells,
      totalCells: wall.totalCells,
      sortStatus: wall.sortStatus,
      warehouseId: wall.warehouseId,
      warehouseName: wall.warehouse?.warehouseName || '',
    }))

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('获取播种墙列表失败', error)
    return NextResponse.json(
      { success: false, message: '获取播种墙列表失败' },
      { status: 500 }
    )
  }
})
