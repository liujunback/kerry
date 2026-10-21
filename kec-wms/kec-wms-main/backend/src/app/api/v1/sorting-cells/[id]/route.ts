import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateCellSchema = z.object({
  isActive: z.boolean().optional(),
  remarks: z.string().max(256).optional(),
})

// GET /api/v1/sorting-cells/[id] - 获取格口详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    const cell = await prisma.sortingCell.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        sortingWall: {
          select: {
            id: true,
            wallCode: true,
            wallName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    if (!cell) {
      return NextResponse.json(
        { success: false, message: '格口不存在' },
        { status: 404 }
      )
    }

    // 获取当前分配信息（如果有）
    const currentAllocation = await prisma.sortingCellAllocation.findFirst({
      where: {
        sortingCellId: id,
        status: { in: ['ALLOCATED', 'SORTING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        orderNumber: true,
        expectedQty: true,
        sortedQty: true,
        status: true,
        sortingTask: {
          select: {
            id: true,
            taskNumber: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...cell,
        currentAllocation,
      },
    })
  } catch (error) {
    console.error('获取格口详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取格口详情失败' },
      { status: 500 }
    )
  }
})

// PATCH /api/v1/sorting-cells/[id] - 更新格口信息
export const PATCH = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = updateCellSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查格口是否存在
    const existingCell = await prisma.sortingCell.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingCell) {
      return NextResponse.json(
        { success: false, message: '格口不存在' },
        { status: 404 }
      )
    }

    // 如果要禁用格口，检查是否正在使用
    if (data.isActive === false && existingCell.status !== 'EMPTY') {
      return NextResponse.json(
        { success: false, message: '格口正在使用中，无法禁用' },
        { status: 400 }
      )
    }

    const cell = await prisma.sortingCell.update({
      where: { id },
      data: {
        ...data,
        updatedBy: auth.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: cell,
      message: '格口更新成功',
    })
  } catch (error) {
    console.error('更新格口失败:', error)
    return NextResponse.json(
      { success: false, message: '更新格口失败' },
      { status: 500 }
    )
  }
})
