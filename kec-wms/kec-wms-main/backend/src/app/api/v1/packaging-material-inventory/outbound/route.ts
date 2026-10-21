import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { packagingMaterialOutboundSchema } from '@/lib/validations/packaging-material-inventory'
import { NextRequest,NextResponse } from 'next/server'

// 计算库存状态
function calculateInventoryStatus(totalQuantity: number, safetyStock: number, minimumStock: number): string {
  if (totalQuantity === 0) return 'OUT_OF_STOCK'
  if (totalQuantity <= minimumStock) return 'LOW_STOCK'
  if (totalQuantity <= safetyStock) return 'WARNING'
  return 'NORMAL'
}

// POST /api/v1/packaging-material-inventory/outbound - 包材出库
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = packagingMaterialOutboundSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 获取包材信息
    const material = await prisma.packagingMaterial.findFirst({
      where: {
        id: data.materialId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!material) {
      return NextResponse.json(
        { success: false, message: '包材不存在', code: 'MATERIAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取库存记录
    const inventory = await prisma.packagingMaterialInventory.findFirst({
      where: {
        warehouseId: data.warehouseId,
        materialId: data.materialId,
      },
    })

    if (!inventory) {
      return NextResponse.json(
        { success: false, message: '该仓库没有此包材库存', code: 'INVENTORY_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (inventory.availableQuantity < data.quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `可用库存不足，当前可用: ${inventory.availableQuantity}`,
          code: 'INSUFFICIENT_STOCK'
        },
        { status: 400 }
      )
    }

    // 使用事务处理出库
    const result = await prisma.$transaction(async (tx) => {
      const quantityBefore = inventory.totalQuantity
      const quantityAfter = quantityBefore - data.quantity

      // 更新库存
      const newStatus = calculateInventoryStatus(
        quantityAfter,
        inventory.safetyStock,
        inventory.minimumStock
      )

      const updatedInventory = await tx.packagingMaterialInventory.update({
        where: { id: inventory.id },
        data: {
          totalQuantity: quantityAfter,
          availableQuantity: inventory.availableQuantity - data.quantity,
          status: newStatus,
          lastMovementAt: new Date(),
        },
      })

      // 创建流水记录
      const transaction = await tx.packagingMaterialTransaction.create({
        data: {
          tenantId: auth.user.tenantId,
          warehouseId: data.warehouseId,
          materialId: data.materialId,
          materialCode: material.materialCode,
          materialName: material.materialName,
          transactionType: 'ORDER_OUTBOUND',
          quantityChange: -data.quantity,
          quantityBefore: quantityBefore,
          quantityAfter: quantityAfter,
          referenceType: data.referenceType || null,
          referenceNumber: data.referenceNumber || null,
          unitCost: material.unitPrice ? Number(material.unitPrice) : null,
          totalCost: material.unitPrice ? Number(material.unitPrice) * data.quantity : null,
          operatorId: auth.user.id,
          operatorName: auth.user.name || auth.user.username || 'Unknown',
          notes: data.notes || null,
          auditStatus: 'UNAUDITED',
        },
      })

      return { inventory: updatedInventory, transaction }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '出库成功',
    })
  } catch (error) {
    console.error('包材出库失败:', error)
    return NextResponse.json(
      { success: false, message: '包材出库失败' },
      { status: 500 }
    )
  }
})
