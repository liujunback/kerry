import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { updateWarehouseSchema } from '@/lib/validations/warehouse'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/warehouses/[id] - 获取仓库详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        zones: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
            zoneType: true,
            status: true,
            _count: {
              select: { binLocations: true },
            },
          },
        },
        _count: {
          select: {
            zones: true,
            binLocations: true,
          },
        },
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: warehouse,
    })
  } catch (error) {
    console.error('获取仓库详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取仓库详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/warehouses/[id] - 更新仓库
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updateWarehouseSchema.safeParse(body)

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

    const data = validationResult.data

    if (data.warehouseCode && data.warehouseCode !== existingWarehouse.warehouseCode) {
      const duplicateCode = await prisma.warehouse.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          warehouseCode: data.warehouseCode,
          id: { not: id },
        },
      })

      if (duplicateCode) {
        return NextResponse.json(
          { success: false, message: '仓库编码已存在', code: 'WAREHOUSE_CODE_EXISTS' },
          { status: 400 }
        )
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(data.warehouseCode && { warehouseCode: data.warehouseCode }),
        ...(data.warehouseName && { warehouseName: data.warehouseName }),
        ...(data.warehouseType && { warehouseType: data.warehouseType }),
        ...(data.contactName !== undefined && { contactName: data.contactName || null }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.country !== undefined && { country: data.country || null }),
        ...(data.zipCode !== undefined && { zipCode: data.zipCode || null }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.region !== undefined && { region: data.region || null }),
        ...(data.warehouseArea !== undefined && { warehouseArea: data.warehouseArea }),
      },
      select: {
        id: true,
        warehouseCode: true,
        warehouseName: true,
        warehouseType: true,
        address: true,
        city: true,
        country: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        region: true,
        warehouseArea: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: warehouse,
      message: '仓库更新成功',
    })
  } catch (error) {
    console.error('更新仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '更新仓库失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/warehouses/[id] - 删除仓库
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        _count: {
          select: {
            zones: true,
            binLocations: true,
          },
        },
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      )
    }

    if (warehouse._count.zones > 0 || warehouse._count.binLocations > 0) {
      return NextResponse.json(
        { success: false, message: '仓库下存在库区或库位，无法删除', code: 'WAREHOUSE_HAS_CHILDREN' },
        { status: 400 }
      )
    }

    await prisma.warehouse.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '仓库删除成功',
    })
  } catch (error) {
    console.error('删除仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '删除仓库失败' },
      { status: 500 }
    )
  }
})
