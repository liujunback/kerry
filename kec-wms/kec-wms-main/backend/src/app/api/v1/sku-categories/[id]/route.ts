import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateSkuCategorySchema } from '@/lib/validations/sku'

// GET /api/v1/sku-categories/[id] - 获取单个SKU分类
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const category = await prisma.skuCategory.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        parent: {
          select: {
            id: true,
            categoryCode: true,
            categoryName: true,
          },
        },
        children: {
          select: {
            id: true,
            categoryCode: true,
            categoryName: true,
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        _count: {
          select: { skus: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'SKU分类不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: category,
    })
  } catch (error) {
    console.error('获取SKU分类失败:', error)
    return NextResponse.json(
      { success: false, message: '获取SKU分类失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/sku-categories/[id] - 更新SKU分类
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updateSkuCategorySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查分类是否存在
    const existingCategory = await prisma.skuCategory.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: 'SKU分类不存在' },
        { status: 404 }
      )
    }

    // 如果更新分类编码，检查是否重复
    if (data.categoryCode && data.categoryCode !== existingCategory.categoryCode) {
      const duplicateCategory = await prisma.skuCategory.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          categoryCode: data.categoryCode,
          id: { not: id },
        },
      })

      if (duplicateCategory) {
        return NextResponse.json(
          { success: false, message: '分类编码已存在', code: 'CATEGORY_CODE_EXISTS' },
          { status: 400 }
        )
      }
    }

    // 如果更新父分类，重新计算层级和路径
    const updateData: Record<string, unknown> = {
        ...data,
        updatedBy: auth.user.id,
      }

    if (data.parentId !== undefined && data.parentId !== existingCategory.parentId) {
      if (data.parentId === id) {
        return NextResponse.json(
          { success: false, message: '不能将分类设为自己的子分类' },
          { status: 400 }
        )
      }

      if (data.parentId) {
        const parentCategory = await prisma.skuCategory.findUnique({
          where: { id: data.parentId },
          select: { level: true, path: true, categoryCode: true },
        })

        if (!parentCategory) {
          return NextResponse.json(
            { success: false, message: '父分类不存在' },
            { status: 400 }
          )
        }

        const categoryCode = data.categoryCode || existingCategory.categoryCode
        updateData.level = parentCategory.level + 1
        updateData.path = parentCategory.path
          ? `${parentCategory.path}/${categoryCode}`
          : `${parentCategory.categoryCode}/${categoryCode}`
      } else {
        const categoryCode = data.categoryCode || existingCategory.categoryCode
        updateData.level = 1
        updateData.path = categoryCode
      }
    }

    const category = await prisma.skuCategory.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        categoryCode: true,
        categoryName: true,
        parentId: true,
        level: true,
        path: true,
        sortOrder: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: category,
      message: 'SKU分类更新成功',
    })
  } catch (error) {
    console.error('更新SKU分类失败:', error)
    return NextResponse.json(
      { success: false, message: '更新SKU分类失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/sku-categories/[id] - 删除SKU分类
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 检查分类是否存在
    const category = await prisma.skuCategory.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        _count: {
          select: {
            children: true,
            skus: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'SKU分类不存在' },
        { status: 404 }
      )
    }

    // 检查是否有子分类
    if (category._count.children > 0) {
      return NextResponse.json(
        { success: false, message: '该分类下有子分类，无法删除', code: 'HAS_CHILDREN' },
        { status: 400 }
      )
    }

    // 检查是否有关联的SKU
    if (category._count.skus > 0) {
      return NextResponse.json(
        { success: false, message: '该分类下有SKU，无法删除', code: 'HAS_SKUS' },
        { status: 400 }
      )
    }

    await prisma.skuCategory.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'SKU分类删除成功',
    })
  } catch (error) {
    console.error('删除SKU分类失败:', error)
    return NextResponse.json(
      { success: false, message: '删除SKU分类失败' },
      { status: 500 }
    )
  }
})
