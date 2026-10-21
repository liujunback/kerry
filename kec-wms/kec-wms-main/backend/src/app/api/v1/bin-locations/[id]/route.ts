import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateBinLocationSchema } from '@/lib/validations/bin-location'
import { NextRequest, NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/bin-locations/[id] - 获取库位详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const binLocation = await prisma.binLocation.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        zone: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
            zoneType: true,
          },
        },
      },
    })

    if (!binLocation) {
      return NextResponse.json({ success: false, message: '库位不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: binLocation,
    })
  } catch (error) {
    console.error('获取库位详情失败:', error)
    return NextResponse.json({ success: false, message: '获取库位详情失败' }, { status: 500 })
  }
})

// PUT /api/v1/bin-locations/[id] - 更新库位
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const body = await request.json()
    const validationResult = updateBinLocationSchema.safeParse(body)

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

    const data = validationResult.data

    if (data.status === 'INACTIVE' && existingBin.status === 'ACTIVE') {
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
      data: {
        ...(data.aisle !== undefined && { aisle: data.aisle || null }),
        ...(data.rack !== undefined && { rack: data.rack || null }),
        ...(data.shelf !== undefined && { shelf: data.shelf || null }),
        ...(data.bin !== undefined && { bin: data.bin || null }),
        ...(data.locationType !== undefined && { locationType: data.locationType }),
        ...(data.isPickable !== undefined && { isPickable: data.isPickable }),
        ...(data.isReceivable !== undefined && { isReceivable: data.isReceivable }),
        ...(data.lengthCm !== undefined && { lengthCm: data.lengthCm }),
        ...(data.widthCm !== undefined && { widthCm: data.widthCm }),
        ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
        ...(data.putawayPriority !== undefined && { putawayPriority: data.putawayPriority }),
        ...(data.pickPriority !== undefined && { pickPriority: data.pickPriority }),
        ...(data.pickSequence !== undefined && { pickSequence: data.pickSequence }),
        ...(data.maxSkuCount !== undefined && { maxSkuCount: data.maxSkuCount }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        locationCode: true,
        aisle: true,
        rack: true,
        shelf: true,
        bin: true,
        locationType: true,
        lockStatus: true,
        isPickable: true,
        isReceivable: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        putawayPriority: true,
        pickPriority: true,
        pickSequence: true,
        maxSkuCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        zone: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
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

    return NextResponse.json({
      success: true,
      data: binLocation,
      message: '库位更新成功',
    })
  } catch (error) {
    console.error('更新库位失败:', error)
    return NextResponse.json({ success: false, message: '更新库位失败' }, { status: 500 })
  }
})

// DELETE /api/v1/bin-locations/[id] - 删除库位
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const binLocation = await prisma.binLocation.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!binLocation) {
      return NextResponse.json({ success: false, message: '库位不存在' }, { status: 404 })
    }

    await prisma.binLocation.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '库位删除成功',
    })
  } catch (error) {
    console.error('删除库位失败:', error)
    return NextResponse.json({ success: false, message: '删除库位失败' }, { status: 500 })
  }
})
