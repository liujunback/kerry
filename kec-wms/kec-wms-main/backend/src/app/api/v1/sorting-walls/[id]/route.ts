import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateSortingWallSchema } from '@/lib/validations/sorting-wall'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/sorting-walls/[id] - 获取分拣墙详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    const sortingWall = await prisma.sortingWall.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        wallCode: true,
        wallName: true,
        workstationCode: true,
        horizontalCells: true,
        verticalCells: true,
        totalCells: true,
        isActive: true,
        sortStatus: true,
        locationCode: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    if (!sortingWall) {
      return NextResponse.json(
        { success: false, message: '分拣墙不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sortingWall,
    })
  } catch (error) {
    console.error('获取分拣墙详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取分拣墙详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/sorting-walls/[id] - 更新分拣墙
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = updateSortingWallSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

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

    // 创建后不允许修改格口配置，直接忽略这两个字段
    const updateData = { ...data }
    delete updateData.horizontalCells
    delete updateData.verticalCells

    const totalCells = existingWall.horizontalCells * existingWall.verticalCells

    const sortingWall = await prisma.sortingWall.update({
      where: { id },
      data: {
        ...updateData,
        totalCells,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        wallCode: true,
        wallName: true,
        workstationCode: true,
        horizontalCells: true,
        verticalCells: true,
        totalCells: true,
        isActive: true,
        sortStatus: true,
        locationCode: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: sortingWall,
      message: '分拣墙更新成功',
    })
  } catch (error) {
    console.error('更新分拣墙失败:', error)
    return NextResponse.json(
      { success: false, message: '更新分拣墙失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/sorting-walls/[id] - 删除分拣墙
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

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

    // 如果正在分拣中，不允许删除
    if (existingWall.sortStatus === 'SORTING') {
      return NextResponse.json(
        { success: false, message: '分拣中的分拣墙无法删除', code: 'WALL_IN_USE' },
        { status: 400 }
      )
    }

    await prisma.sortingWall.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '分拣墙删除成功',
    })
  } catch (error) {
    console.error('删除分拣墙失败:', error)
    return NextResponse.json(
      { success: false, message: '删除分拣墙失败' },
      { status: 500 }
    )
  }
})
