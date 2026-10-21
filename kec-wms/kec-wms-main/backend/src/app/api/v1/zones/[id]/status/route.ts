import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeZoneStatusSchema } from '@/lib/validations/zone'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/v1/zones/[id]/status - 修改库区状态
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const body = await request.json()
    const validationResult = changeZoneStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingZone = await prisma.zone.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!existingZone) {
      return NextResponse.json({ success: false, message: '库区不存在' }, { status: 404 })
    }

    const { status } = validationResult.data

    if (status === 'INACTIVE') {
      const inventoryCount = await prisma.inventoryBucket.count({
        where: {
          zoneId: id,
          ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
          quantity: { gt: 0 },
        },
      })

      if (inventoryCount > 0) {
        return NextResponse.json(
          { success: false, message: '该库区下存在库存，无法停用' },
          { status: 400 }
        )
      }
    }

    const zone = await prisma.zone.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        zoneCode: true,
        zoneName: true,
        status: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: zone,
      message: '状态更新成功',
    })
  } catch (error) {
    console.error('更新库区状态失败:', error)
    return NextResponse.json({ success: false, message: '更新库区状态失败' }, { status: 500 })
  }
})
