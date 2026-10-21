import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { packagingMaterialInventoryListQuerySchema } from '@/lib/validations/packaging-material-inventory'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-material-inventory - 获取包材库存列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = packagingMaterialInventoryListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      warehouseId: searchParams.get('warehouseId'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, warehouseId: requestedWarehouseId, status, sortBy, sortOrder } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { materialCode: { contains: search } },
        { materialName: { contains: search } },
      ]
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (status) {
      where.status = status
    }

    const total = await prisma.packagingMaterialInventory.count({ where })

    const inventories = await prisma.packagingMaterialInventory.findMany({
      where,
      select: {
        id: true,
        warehouseId: true,
        materialId: true,
        materialCode: true,
        materialName: true,
        totalQuantity: true,
        availableQuantity: true,
        allocatedQuantity: true,
        onOrderQuantity: true,
        safetyStock: true,
        minimumStock: true,
        maximumStock: true,
        unit: true,
        status: true,
        lastMovementAt: true,
        updatedAt: true,
        material: {
          select: {
            materialType: true,
            unitPrice: true,
            currency: true,
          },
        },
      },
      orderBy: { [sortBy!]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 统计各状态数量
    const statusCounts = await prisma.packagingMaterialInventory.groupBy({
      by: ['status'],
      where: { tenantId: auth.user.tenantId, ...(warehouseId ? { warehouseId } : {}) },
      _count: { status: true },
    })

    const summary = {
      total: total,
      normal: statusCounts.find(s => s.status === 'NORMAL')?._count.status || 0,
      warning: statusCounts.find(s => s.status === 'WARNING')?._count.status || 0,
      lowStock: statusCounts.find(s => s.status === 'LOW_STOCK')?._count.status || 0,
      outOfStock: statusCounts.find(s => s.status === 'OUT_OF_STOCK')?._count.status || 0,
    }

    return NextResponse.json({
      success: true,
      data: inventories,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary,
    })
  } catch (error) {
    console.error('获取包材库存列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取包材库存列表失败' },
      { status: 500 }
    )
  }
})
