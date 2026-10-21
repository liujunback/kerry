import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
comboProductListQuerySchema,
createComboProductSchema,
} from '@/lib/validations/sku'
import { NextResponse } from 'next/server'

// GET /api/v1/combo-products - 获取组合商品列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = comboProductListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      clientId: searchParams.get('clientId'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, clientId, status, sortBy, sortOrder } =
      queryResult.data

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { comboCode: { contains: search } },
        { comboName: { contains: search } },
        { comboBarcode: { contains: search } },
      ]
    }

    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const total = await prisma.comboProduct.count({ where })

    const comboProducts = await prisma.comboProduct.findMany({
      where,
      select: {
        id: true,
        comboCode: true,
        comboName: true,
        comboBarcode: true,
        description: true,
        status: true,
        effectiveDate: true,
        expiryDate: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        _count: {
          select: { components: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: comboProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取组合商品列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取组合商品列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/combo-products - 创建组合商品
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validationResult = createComboProductSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查客户是否存在
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, message: '客户不存在' },
        { status: 400 }
      )
    }

    // 检查组合商品编码是否已存在
    const existingCombo = await prisma.comboProduct.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          comboCode: data.comboCode,
      },
    })

    if (existingCombo) {
      return NextResponse.json(
        { success: false, message: '组合商品编码已存在', code: 'COMBO_CODE_EXISTS' },
        { status: 400 }
      )
    }

    // 验证所有组件SKU是否存在
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

    // 创建组合商品和组件
    const comboProduct = await prisma.comboProduct.create({
      data: {
        tenantId: auth.user.tenantId,
        clientId: data.clientId,
        comboCode: data.comboCode,
        comboName: data.comboName,
        comboBarcode: data.comboBarcode || null,
        description: data.description || null,
        categoryId: data.categoryId || null,
        effectiveDate: data.effectiveDate,
        expiryDate: data.expiryDate,
        status: 'ACTIVE',
        createdBy: auth.user.id,
        components: {
          create: data.components.map((component, index) => ({
            tenantId: auth.user.tenantId,
            skuId: component.skuId,
            quantity: component.quantity,
            unit: component.unit,
            sortOrder: component.sortOrder || index,
          })),
        },
      },
      select: {
        id: true,
        comboCode: true,
        comboName: true,
        status: true,
        createdAt: true,
        _count: {
          select: { components: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: comboProduct,
      message: '组合商品创建成功',
    })
  } catch (error) {
    console.error('创建组合商品失败:', error)
    return NextResponse.json(
      { success: false, message: '创建组合商品失败' },
      { status: 500 }
    )
  }
})
