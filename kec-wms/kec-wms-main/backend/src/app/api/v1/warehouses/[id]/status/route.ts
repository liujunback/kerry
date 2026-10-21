import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeWarehouseStatusSchema } from '@/lib/validations/warehouse'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/v1/warehouses/[id]/status - 修改仓库状态
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = changeWarehouseStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingWarehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      )
    }

    const { status } = validationResult.data

    // 停用仓库时，检查是否有在库库存
    if (status === 'INACTIVE') {
      const inventoryCount = await prisma.inventoryBucket.count({
        where: {
          tenantId: auth.user.tenantId,
          warehouseId: id,
          quantity: { gt: 0 },
        },
      })

      if (inventoryCount > 0) {
        return NextResponse.json(
          { success: false, message: '该仓库存在在库库存，无法停用' },
          { status: 400 }
        )
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        warehouseCode: true,
        warehouseName: true,
        status: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: warehouse,
      message: '状态更新成功',
    })
  } catch (error) {
    console.error('更新仓库状态失败:', error)
    return NextResponse.json(
      { success: false, message: '更新仓库状态失败' },
      { status: 500 }
    )
  }
})
