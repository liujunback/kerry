import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeActiveStatusSchema } from '@/lib/validations/sorting-wall'

// PUT /api/v1/sorting-walls/[id]/status - 切换分拣墙启用状态
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = changeActiveStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { isActive } = validationResult.data

    // 检查分拣墙是否存在
    const existingWall = await prisma.sortingWall.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingWall) {
      return NextResponse.json(
        { success: false, message: '分拣墙不存在' },
        { status: 404 }
      )
    }

    // 如果正在分拣中，不允许停用
    if (!isActive && existingWall.sortStatus === 'SORTING') {
      return NextResponse.json(
        { success: false, message: '分拣中的分拣墙无法停用', code: 'WALL_IN_USE' },
        { status: 400 }
      )
    }

    const sortingWall = await prisma.sortingWall.update({
      where: { id },
      data: {
        isActive,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        wallCode: true,
        wallName: true,
        isActive: true,
        sortStatus: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: sortingWall,
      message: isActive ? '分拣墙已启用' : '分拣墙已停用',
    })
  } catch (error) {
    console.error('更新分拣墙状态失败:', error)
    return NextResponse.json(
      { success: false, message: '更新分拣墙状态失败' },
      { status: 500 }
    )
  }
})
