import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/sorting-walls/[id]/release - 手动释放播种墙所有格口
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 查询播种墙
    const wall = await prisma.sortingWall.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!wall) {
      return NextResponse.json(
        { success: false, message: '播种墙不存在' },
        { status: 404 }
      )
    }

    // 只允许释放 SORTED 状态的播种墙
    if (wall.sortStatus !== 'SORTED') {
      return NextResponse.json(
        { success: false, message: '只能释放"分拣完成"状态的播种墙' },
        { status: 400 }
      )
    }

    // 查询未释放的格口分配记录数量
    const unreleasedCount = await prisma.sortingCellAllocation.count({
      where: {
        sortingWallId: id,
        status: { not: 'RELEASED' },
      },
    })

    // 在事务中执行释放操作
    await prisma.$transaction(async (tx) => {
      // 将所有未释放的格口分配记录更新为 RELEASED
      await tx.sortingCellAllocation.updateMany({
        where: {
          sortingWallId: id,
          status: { not: 'RELEASED' },
        },
        data: { status: 'RELEASED' },
      })

      // 重置所有物理格口状态为 EMPTY
      await tx.sortingCell.updateMany({
        where: { sortingWallId: id },
        data: { status: 'EMPTY' },
      })

      // 播种墙恢复为空闲
      await tx.sortingWall.update({
        where: { id },
        data: { sortStatus: 'IDLE' },
      })
    })

    // 记录操作日志
    operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'SORTING_WALL',
      entityId: wall.id,
      entityNumber: wall.wallCode,
      operationType: 'RELEASE_WALL',
      operationName: '手动释放播种墙',
      beforeStatus: 'SORTED',
      afterStatus: 'IDLE',
      remark: `手动释放播种墙 ${wall.wallCode}，共释放 ${unreleasedCount} 个格口`,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
    })

    return NextResponse.json({
      success: true,
      data: { releasedCount: unreleasedCount },
      message: '播种墙已释放',
    })
  } catch (error) {
    console.error('释放播种墙失败:', error)
    return NextResponse.json(
      { success: false, message: '释放播种墙失败' },
      { status: 500 }
    )
  }
})
