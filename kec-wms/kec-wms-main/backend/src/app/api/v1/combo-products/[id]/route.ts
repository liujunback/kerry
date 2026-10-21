import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateComboProductSchema } from '@/lib/validations/sku'
import { NextResponse } from 'next/server'

// GET /api/v1/combo-products/[id] - 获取单个组合商品详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const comboProduct = await prisma.comboProduct.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        components: {
          select: {
            id: true,
            quantity: true,
            unit: true,
            sortOrder: true,
            sku: {
              select: {
                id: true,
                skuCode: true,
                skuName: true,
                barcode: true,
                unit: true,
                imageUrl: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!comboProduct) {
      return NextResponse.json(
        { success: false, message: '组合商品不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: comboProduct,
    })
  } catch (error) {
    console.error('获取组合商品详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取组合商品详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/combo-products/[id] - 更新组合商品
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updateComboProductSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查组合商品是否存在
    const existingCombo = await prisma.comboProduct.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingCombo) {
      return NextResponse.json(
        { success: false, message: '组合商品不存在' },
        { status: 404 }
      )
    }

    // 如果更新编码，检查是否重复
    if (data.comboCode && data.comboCode !== existingCombo.comboCode) {
      const duplicateCombo = await prisma.comboProduct.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          comboCode: data.comboCode,
          id: { not: id },
        },
      })

      if (duplicateCombo) {
        return NextResponse.json(
          { success: false, message: '组合商品编码已存在', code: 'COMBO_CODE_EXISTS' },
          { status: 400 }
        )
      }
    }

    // 如果更新组件，验证所有SKU是否存在
    if (data.components) {
      const skuIds = data.components.map((c) => c.skuId)
      const skus = await prisma.sku.findMany({
        where: {
          id: { in: skuIds },
          tenantId: auth.user.tenantId,
        },
        select: { id: true },
      })

      if (skus.length !== skuIds.length) {
        return NextResponse.json(
          { success: false, message: '部分组件SKU不存在' },
          { status: 400 }
        )
      }
    }

    // 更新组合商品
    const { components, ...updateData } = data

    const comboProduct = await prisma.$transaction(async (tx) => {
      // 更新基本信息
      const updated = await tx.comboProduct.update({
        where: { id },
        data: {
          ...updateData,
          updatedBy: auth.user.id,
        },
      })

      // 如果有组件更新，先删除旧组件再创建新组件
      if (components) {
        await tx.comboComponent.deleteMany({
          where: { comboProductId: id },
        })

        await tx.comboComponent.createMany({
          data: components.map((component, index) => ({
            tenantId: auth.user.tenantId,
            comboProductId: id,
            skuId: component.skuId,
            quantity: component.quantity,
            unit: component.unit,
            sortOrder: component.sortOrder || index,
          })),
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      data: comboProduct,
      message: '组合商品更新成功',
    })
  } catch (error) {
    console.error('更新组合商品失败:', error)
    return NextResponse.json(
      { success: false, message: '更新组合商品失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/combo-products/[id] - 删除组合商品
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 检查组合商品是否存在
    const comboProduct = await prisma.comboProduct.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!comboProduct) {
      return NextResponse.json(
        { success: false, message: '组合商品不存在' },
        { status: 404 }
      )
    }

    // 删除组合商品（级联删除组件）
    await prisma.comboProduct.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '组合商品删除成功',
    })
  } catch (error) {
    console.error('删除组合商品失败:', error)
    return NextResponse.json(
      { success: false, message: '删除组合商品失败' },
      { status: 500 }
    )
  }
})
