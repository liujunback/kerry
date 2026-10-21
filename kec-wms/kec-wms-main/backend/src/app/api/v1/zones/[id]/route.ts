import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { updateZoneSchema } from '@/lib/validations/zone'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/zones/[id] - 获取库区详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const zone = await prisma.zone.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        warehouse: {
          select: { id: true, warehouseCode: true, warehouseName: true },
        },
        binLocations: {
          select: {
            id: true,
            locationCode: true,
            locationType: true,
            lockStatus: true,
            isPickable: true,
            isReceivable: true,
            status: true,
          },
          take: 50,
        },
        _count: {
          select: { binLocations: true },
        },
      },
    })

    if (!zone) {
      return NextResponse.json({ success: false, message: '库区不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: zone })
  } catch (error) {
    console.error('获取库区详情失败:', error)
    return NextResponse.json({ success: false, message: '获取库区详情失败' }, { status: 500 })
  }
})

// PUT /api/v1/zones/[id] - 更新库区
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const body = await request.json()
    const validationResult = updateZoneSchema.safeParse(body)

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

    const data = validationResult.data

    if (data.zoneCode && data.zoneCode !== existingZone.zoneCode) {
      const duplicateCode = await prisma.zone.findFirst({
        where: {
          warehouseId: existingZone.warehouseId,
          zoneCode: data.zoneCode,
          id: { not: id },
        },
      })

      if (duplicateCode) {
        return NextResponse.json(
          { success: false, message: '库区编码已存在', code: 'ZONE_CODE_EXISTS' },
          { status: 400 }
        )
      }
    }

    const zone = await prisma.zone.update({
      where: { id },
      data: {
        ...(data.zoneCode && { zoneCode: data.zoneCode }),
        ...(data.zoneName !== undefined && { zoneName: data.zoneName || null }),
        ...(data.zoneType && { zoneType: data.zoneType }),
        ...(data.qualityType && { qualityType: data.qualityType }),
        ...(data.capacityUnits !== undefined && { capacityUnits: data.capacityUnits }),
      },
      select: {
        id: true,
        zoneCode: true,
        zoneName: true,
        zoneType: true,
        qualityType: true,
        capacityUnits: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        warehouse: {
          select: { id: true, warehouseCode: true, warehouseName: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: zone,
      message: '库区更新成功',
    })
  } catch (error) {
    console.error('更新库区失败:', error)
    return NextResponse.json({ success: false, message: '更新库区失败' }, { status: 500 })
  }
})

// DELETE /api/v1/zones/[id] - 删除库区
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const zone = await prisma.zone.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        _count: {
          select: { binLocations: true },
        },
      },
    })

    if (!zone) {
      return NextResponse.json({ success: false, message: '库区不存在' }, { status: 404 })
    }

    if (zone._count.binLocations > 0) {
      return NextResponse.json(
        { success: false, message: '库区下存在库位，无法删除', code: 'ZONE_HAS_BINS' },
        { status: 400 }
      )
    }

    await prisma.zone.delete({ where: { id } })

    return NextResponse.json({ success: true, message: '库区删除成功' })
  } catch (error) {
    console.error('删除库区失败:', error)
    return NextResponse.json({ success: false, message: '删除库区失败' }, { status: 500 })
  }
})
