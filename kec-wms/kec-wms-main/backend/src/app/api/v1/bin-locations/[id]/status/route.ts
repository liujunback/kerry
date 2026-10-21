import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeBinLocationStatusSchema } from '@/lib/validations/bin-location'
import { NextRequest, NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/v1/bin-locations/[id]/status - 修改库位状态
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const body = await request.json()
    const validationResult = changeBinLocationStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingBin = await prisma.binLocation.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!existingBin) {
      return NextResponse.json({ success: false, message: '库位不存在' }, { status: 404 })
    }

    const { status } = validationResult.data

    if (status === 'INACTIVE') {
      const inventoryCount = await prisma.inventoryBucket.aggregate({
        where: {
          locationId: id,
          tenantId: auth.user.tenantId,
          ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        },
        _sum: {
          quantity: true,
        },
      })

      const totalQty = inventoryCount._sum.quantity || 0

      if (totalQty > 0) {
        return NextResponse.json(
          { success: false, message: '该库位存在库存，无法停用', code: 'HAS_INVENTORY' },
          { status: 400 }
        )
      }
    }

    const binLocation = await prisma.binLocation.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        locationCode: true,
        status: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: binLocation,
      message: '状态更新成功',
    })
  } catch (error) {
    console.error('更新库位状态失败:', error)
    return NextResponse.json({ success: false, message: '更新库位状态失败' }, { status: 500 })
  }
})
