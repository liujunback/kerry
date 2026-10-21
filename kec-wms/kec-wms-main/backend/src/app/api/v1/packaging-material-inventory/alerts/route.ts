import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-material-inventory/alerts - 获取库存预警
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      status: {
        in: ['WARNING', 'LOW_STOCK', 'OUT_OF_STOCK'],
      },
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    const alerts = await prisma.packagingMaterialInventory.findMany({
      where,
      select: {
        id: true,
        warehouseId: true,
        materialId: true,
        materialCode: true,
        materialName: true,
        totalQuantity: true,
        availableQuantity: true,
        safetyStock: true,
        minimumStock: true,
        unit: true,
        status: true,
        lastMovementAt: true,
        material: {
          select: {
            materialType: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // OUT_OF_STOCK first
        { totalQuantity: 'asc' },
      ],
    })

    // 按状态分组统计
    const summary = {
      outOfStock: alerts.filter(a => a.status === 'OUT_OF_STOCK').length,
      lowStock: alerts.filter(a => a.status === 'LOW_STOCK').length,
      warning: alerts.filter(a => a.status === 'WARNING').length,
      total: alerts.length,
    }

    return NextResponse.json({
      success: true,
      data: alerts,
      summary,
    })
  } catch (error) {
    console.error('获取库存预警失败:', error)
    return NextResponse.json(
      { success: false, message: '获取库存预警失败' },
      { status: 500 }
    )
  }
})
