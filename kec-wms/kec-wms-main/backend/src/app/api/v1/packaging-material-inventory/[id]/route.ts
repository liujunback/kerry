import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateInventorySettingsSchema } from '@/lib/validations/packaging-material-inventory'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-material-inventory/[id] - 获取包材库存详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const inventory = await prisma.packagingMaterialInventory.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        material: true,
      },
    })

    if (!inventory) {
      return NextResponse.json(
        { success: false, message: '库存记录不存在', code: 'INVENTORY_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取最近10条流水
    const recentTransactions = await prisma.packagingMaterialTransaction.findMany({
      where: {
        materialId: inventory.materialId,
        warehouseId: inventory.warehouseId,
      },
      orderBy: { operationTime: 'desc' },
      take: 10,
      select: {
        id: true,
        transactionType: true,
        quantityChange: true,
        quantityAfter: true,
        referenceNumber: true,
        operatorName: true,
        operationTime: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...inventory,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('获取包材库存详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取包材库存详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/packaging-material-inventory/[id] - 更新库存设置
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updateInventorySettingsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingInventory = await prisma.packagingMaterialInventory.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingInventory) {
      return NextResponse.json(
        { success: false, message: '库存记录不存在', code: 'INVENTORY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const data = validationResult.data

    const inventory = await prisma.packagingMaterialInventory.update({
      where: { id },
      data: {
        ...(data.safetyStock !== undefined && { safetyStock: data.safetyStock }),
        ...(data.minimumStock !== undefined && { minimumStock: data.minimumStock }),
        ...(data.maximumStock !== undefined && { maximumStock: data.maximumStock }),
      },
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        safetyStock: true,
        minimumStock: true,
        maximumStock: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: inventory,
      message: '库存设置更新成功',
    })
  } catch (error) {
    console.error('更新库存设置失败:', error)
    return NextResponse.json(
      { success: false, message: '更新库存设置失败' },
      { status: 500 }
    )
  }
})
