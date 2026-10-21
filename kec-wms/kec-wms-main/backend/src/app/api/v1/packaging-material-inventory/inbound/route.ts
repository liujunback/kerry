import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { packagingMaterialInboundSchema } from '@/lib/validations/packaging-material-inventory'
import { NextRequest,NextResponse } from 'next/server'

// 计算库存状态
function calculateInventoryStatus(totalQuantity: number, safetyStock: number, minimumStock: number): string {
  if (totalQuantity === 0) return 'OUT_OF_STOCK'
  if (totalQuantity <= minimumStock) return 'LOW_STOCK'
  if (totalQuantity <= safetyStock) return 'WARNING'
  return 'NORMAL'
}

// POST /api/v1/packaging-material-inventory/inbound - 包材入库
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = packagingMaterialInboundSchema.safeParse(body)

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

    if (!material.isActive) {
      return NextResponse.json(
        { success: false, message: '包材已禁用，无法入库', code: 'MATERIAL_INACTIVE' },
        { status: 400 }
      )
    }

    // 使用事务处理入库
    const result = await prisma.$transaction(async (tx) => {
      // 查找或创建库存记录
      let inventory = await tx.packagingMaterialInventory.findFirst({
        where: {
          warehouseId: data.warehouseId,
          materialId: data.materialId,
        },
      })

      const quantityBefore = inventory?.totalQuantity || 0
      const quantityAfter = quantityBefore + data.quantity

      if (inventory) {
        // 更新库存
        const newStatus = calculateInventoryStatus(
          quantityAfter,
          inventory.safetyStock,
          inventory.minimumStock
        )

        inventory = await tx.packagingMaterialInventory.update({
          where: { id: inventory.id },
          data: {
            totalQuantity: quantityAfter,
            availableQuantity: inventory.availableQuantity + data.quantity,
            status: newStatus,
            lastMovementAt: new Date(),
          },
        })
      } else {
        // 创建库存记录
        inventory = await tx.packagingMaterialInventory.create({
            data: {
            tenantId: auth.user.tenantId,
            warehouseId: data.warehouseId,
            materialId: data.materialId,
            materialCode: material.materialCode,
            materialName: material.materialName,
            totalQuantity: data.quantity,
            availableQuantity: data.quantity,
            unit: material.unit,
            status: 'NORMAL',
            lastMovementAt: new Date(),
          },
        })
      }

      // 创建流水记录
      const transaction = await tx.packagingMaterialTransaction.create({
        data: {
          tenantId: auth.user.tenantId,
          warehouseId: data.warehouseId,
          materialId: data.materialId,
          materialCode: material.materialCode,
          materialName: material.materialName,
          transactionType: 'PURCHASE_INBOUND',
          quantityChange: data.quantity,
          quantityBefore: quantityBefore,
          quantityAfter: quantityAfter,
          referenceType: data.referenceType || undefined,
          referenceNumber: data.referenceNumber || undefined,
          batchNumber: data.batchNumber || undefined,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
          unitCost: data.unitCost,
          totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
          operatorId: auth.user.id,
          operatorName: auth.user.name || auth.user.username || 'Unknown',
          notes: data.notes || undefined,
          auditStatus: 'UNAUDITED',
        },
      })

      return { inventory, transaction }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '入库成功',
    })
  } catch (error) {
    console.error('包材入库失败:', error)
    return NextResponse.json(
      { success: false, message: '包材入库失败' },
      { status: 500 }
    )
  }
})
