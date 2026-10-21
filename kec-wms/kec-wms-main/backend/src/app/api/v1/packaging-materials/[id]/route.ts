import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updatePackagingMaterialSchema } from '@/lib/validations/packaging-material'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-materials/[id] - 获取包材详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const material = await prisma.packagingMaterial.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        inventories: {
          select: {
            id: true,
            warehouseId: true,
            totalQuantity: true,
            availableQuantity: true,
            status: true,
          },
        },
      },
    })

    if (!material) {
      return NextResponse.json(
        { success: false, message: '包材不存在', code: 'MATERIAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: material,
    })
  } catch (error) {
    console.error('获取包材详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取包材详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/packaging-materials/[id] - 更新包材
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updatePackagingMaterialSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingMaterial = await prisma.packagingMaterial.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, message: '包材不存在', code: 'MATERIAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    const data = validationResult.data

    // 检查编码是否重复
    if (data.materialCode && data.materialCode !== existingMaterial.materialCode) {
      const duplicateMaterial = await prisma.packagingMaterial.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          materialCode: data.materialCode,
          id: { not: id },
        },
      })

      if (duplicateMaterial) {
        return NextResponse.json(
          { success: false, message: '包材编码已存在', code: 'MATERIAL_CODE_EXISTS' },
          { status: 400 }
        )
      }
    }

    // 计算体积
    const lengthCm = data.lengthCm ?? existingMaterial.lengthCm
    const widthCm = data.widthCm ?? existingMaterial.widthCm
    const heightCm = data.heightCm ?? existingMaterial.heightCm
    let volumeCbm: Prisma.Decimal | null = existingMaterial.volumeCbm
    if (lengthCm && widthCm && heightCm) {
      volumeCbm = new Prisma.Decimal((Number(lengthCm) * Number(widthCm) * Number(heightCm)) / 1000000)
    }

    const material = await prisma.packagingMaterial.update({
      where: { id },
      data: {
        ...(data.materialCode && { materialCode: data.materialCode }),
        ...(data.materialName && { materialName: data.materialName }),
        ...(data.materialType && { materialType: data.materialType }),
        ...(data.specification !== undefined && { specification: data.specification || null }),
        ...(data.lengthCm !== undefined && { lengthCm: data.lengthCm }),
        ...(data.widthCm !== undefined && { widthCm: data.widthCm }),
        ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
        volumeCbm: volumeCbm,
        ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
        ...(data.maxLoadWeightKg !== undefined && { maxLoadWeightKg: data.maxLoadWeightKg }),
        ...(data.unit && { unit: data.unit }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.currency && { currency: data.currency }),
        ...(data.supplierName !== undefined && { supplierName: data.supplierName || null }),
        ...(data.barcode !== undefined && { barcode: data.barcode || null }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
        ...(data.source && { source: data.source }),
        ...(data.isReusable !== undefined && { isReusable: data.isReusable }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.warehouseId !== undefined && { warehouseId: data.warehouseId || null }),
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        materialType: true,
        specification: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: material,
      message: '包材更新成功',
    })
  } catch (error) {
    console.error('更新包材失败:', error)
    return NextResponse.json(
      { success: false, message: '更新包材失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/packaging-materials/[id] - 删除包材
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const existingMaterial = await prisma.packagingMaterial.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        inventories: {
          where: {
            totalQuantity: { gt: 0 },
          },
        },
        transactions: {
          take: 1,
        },
      },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, message: '包材不存在', code: 'MATERIAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查是否有库存
    if (existingMaterial.inventories.length > 0) {
      return NextResponse.json(
        { success: false, message: '该包材还有库存，无法删除', code: 'MATERIAL_HAS_INVENTORY' },
        { status: 400 }
      )
    }

    // 检查是否有流水记录
    if (existingMaterial.transactions.length > 0) {
      return NextResponse.json(
        { success: false, message: '该包材有流水记录，无法删除', code: 'MATERIAL_HAS_TRANSACTIONS' },
        { status: 400 }
      )
    }

    await prisma.packagingMaterial.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '包材删除成功',
    })
  } catch (error) {
    console.error('删除包材失败:', error)
    return NextResponse.json(
      { success: false, message: '删除包材失败' },
      { status: 500 }
    )
  }
})
