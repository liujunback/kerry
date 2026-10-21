import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import {
  createSortingWallSchema,
  sortingWallListQuerySchema,
} from '@/lib/validations/sorting-wall'
import { createCellsForWall } from '@/lib/services/sorting-cell-service'

// GET /api/v1/sorting-walls - 获取分拣墙列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = sortingWallListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      warehouseId: searchParams.get('warehouseId'),
      workstationCode: searchParams.get('workstationCode'),
      isActive: searchParams.get('isActive'),
      sortStatus: searchParams.get('sortStatus'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const {
      page,
      pageSize,
      search,
      warehouseId: requestedWarehouseId,
      workstationCode,
      isActive,
      sortStatus,
      sortBy,
      sortOrder,
    } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (search) {
      where.OR = [
        { wallCode: { contains: search } },
        { wallName: { contains: search } },
      ]
    }

    if (workstationCode) {
      where.workstationCode = { contains: workstationCode }
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (sortStatus) {
      where.sortStatus = sortStatus
    }

    const total = await prisma.sortingWall.count({ where })

    const sortingWalls = await prisma.sortingWall.findMany({
      where,
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
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: sortingWalls,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取分拣墙列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取分拣墙列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/sorting-walls - 创建分拣墙
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = createSortingWallSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data
    const warehouseId = data.warehouseId || auth.user.warehouseId

    // 验证仓库存在
    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: '当前仓库未设置' },
        { status: 400 }
      )
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      )
    }

    // 验证分拣墙编码在仓库内唯一
    const existingWall = await prisma.sortingWall.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId,
        wallCode: data.wallCode,
      },
    })

    if (existingWall) {
      return NextResponse.json(
        { success: false, message: '该仓库下已存在相同的分拣墙编码' },
        { status: 400 }
      )
    }

    // 计算总格口数
    const totalCells = data.horizontalCells * data.verticalCells

    const sortingWall = await prisma.sortingWall.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseId,
        wallCode: data.wallCode,
        wallName: data.wallName,
        workstationCode: data.workstationCode,
        horizontalCells: data.horizontalCells,
        verticalCells: data.verticalCells,
        totalCells,
        locationCode: data.locationCode || '999.99.99',
        remarks: data.remarks || null,
        isActive: true,
        sortStatus: 'IDLE',
        createdBy: auth.user.id,
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
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    // 自动生成格口
    await createCellsForWall(
      sortingWall.id,
      data.wallCode,
      warehouseId,
      auth.user.tenantId,
      data.horizontalCells,
      data.verticalCells,
      auth.user.id
    )

    return NextResponse.json({
      success: true,
      data: sortingWall,
      message: '分拣墙创建成功',
    })
  } catch (error) {
    console.error('创建分拣墙失败:', error)
    return NextResponse.json(
      { success: false, message: '创建分拣墙失败' },
      { status: 500 }
    )
  }
})
