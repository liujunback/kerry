import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const printSchema = z.object({
  cellIds: z.array(z.string()).min(1, '请选择要打印的格口').optional(),
  printAll: z.boolean().optional(),
})

// POST /api/v1/sorting-walls/[id]/cells/print - 批量打印格口条码
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = printSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { cellIds, printAll } = validationResult.data

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
      },
    })

    if (!sortingWall) {
      return NextResponse.json(
        { success: false, message: '播种墙不存在' },
        { status: 404 }
      )
    }

    // 构建查询条件
    const where: Record<string, unknown> = {
      sortingWallId: id,
      isActive: true,
    }

    if (!printAll && cellIds && cellIds.length > 0) {
      where.id = { in: cellIds }
    }

    // 获取要打印的格口
    const cells = await prisma.sortingCell.findMany({
      where,
      select: {
        id: true,
        cellCode: true,
        cellPosition: true,
        rowNumber: true,
        columnNumber: true,
      },
      orderBy: [
        { rowNumber: 'asc' },
        { columnNumber: 'asc' },
      ],
    })

    if (cells.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有可打印的格口' },
        { status: 400 }
      )
    }

    // 返回打印数据
    return NextResponse.json({
      success: true,
      data: {
        sortingWall: {
          wallCode: sortingWall.wallCode,
          wallName: sortingWall.wallName,
        },
        cells: cells.map((cell) => ({
          id: cell.id,
          cellCode: cell.cellCode,
          cellPosition: cell.cellPosition,
          rowNumber: cell.rowNumber,
          columnNumber: cell.columnNumber,
          // 条码数据（格口编码）
          barcode: cell.cellCode,
        })),
        printCount: cells.length,
      },
    })
  } catch (error) {
    console.error('生成打印数据失败:', error)
    return NextResponse.json(
      { success: false, message: '生成打印数据失败' },
      { status: 500 }
    )
  }
})
