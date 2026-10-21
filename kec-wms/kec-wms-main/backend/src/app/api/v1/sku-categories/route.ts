import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
  createSkuCategorySchema,
  skuCategoryListQuerySchema,
} from '@/lib/validations/sku'

// 构建树形结构的辅助函数
interface CategoryNode {
  id: string
  categoryCode: string
  categoryName: string
  parentId: string | null
  level: number
  path: string | null
  sortOrder: number
  isActive: boolean
  description: string | null
  _count: { skus: number }
  children: CategoryNode[]
}

function buildTree(categories: Omit<CategoryNode, 'children'>[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []

  // 创建所有节点
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] })
  })

  // 构建树
  categories.forEach((cat) => {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

// GET /api/v1/sku-categories - 获取SKU分类列表（树形结构）
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = skuCategoryListQuerySchema.safeParse({
      clientId: searchParams.get('clientId'),
      parentId: searchParams.get('parentId'),
      isActive: searchParams.get('isActive'),
      search: searchParams.get('search'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { clientId, isActive, search } = queryResult.data

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.OR = [
        { categoryCode: { contains: search } },
        { categoryName: { contains: search } },
      ]
    }

    const categories = await prisma.skuCategory.findMany({
      where,
      select: {
        id: true,
        categoryCode: true,
        categoryName: true,
        parentId: true,
        level: true,
        path: true,
        sortOrder: true,
        isActive: true,
        description: true,
        _count: {
          select: { skus: true },
        },
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { categoryCode: 'asc' }],
    })

    // 构建树形结构
    const tree = buildTree(categories)

    return NextResponse.json({
      success: true,
      data: tree,
    })
  } catch (error) {
    console.error('获取SKU分类列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取SKU分类列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/sku-categories - 创建SKU分类
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validationResult = createSkuCategorySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查分类编码是否已存在
    const existingCategory = await prisma.skuCategory.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          categoryCode: data.categoryCode,
      },
    })

    if (existingCategory) {
      return NextResponse.json(
        { success: false, message: '分类编码已存在', code: 'CATEGORY_CODE_EXISTS' },
        { status: 400 }
      )
    }

    // 计算层级和路径
    let level = 1
    let path = ''

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

      level = parentCategory.level + 1
      path = parentCategory.path
        ? `${parentCategory.path}/${data.categoryCode}`
        : `${parentCategory.categoryCode}/${data.categoryCode}`
    } else {
      path = data.categoryCode
    }

    const category = await prisma.skuCategory.create({
        data: {
          tenantId: auth.user.tenantId,
          clientId: data.clientId || null,
        categoryCode: data.categoryCode,
        categoryName: data.categoryName,
        parentId: data.parentId || null,
        level,
        path,
        sortOrder: data.sortOrder,
        description: data.description || null,
        isActive: true,
          createdBy: auth.user.id,
        },
      select: {
        id: true,
        categoryCode: true,
        categoryName: true,
        parentId: true,
        level: true,
        path: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: category,
      message: 'SKU分类创建成功',
    })
  } catch (error) {
    console.error('创建SKU分类失败:', error)
    return NextResponse.json(
      { success: false, message: '创建SKU分类失败' },
      { status: 500 }
    )
  }
})
