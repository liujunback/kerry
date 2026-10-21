import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import {
createPackagingMaterialSchema,
packagingMaterialListQuerySchema,
} from '@/lib/validations/packaging-material'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-materials - 获取包材列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = packagingMaterialListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      materialType: searchParams.get('materialType'),
      source: searchParams.get('source'),
      isActive: searchParams.get('isActive'),
      warehouseId: searchParams.get('warehouseId'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, materialType, source, isActive, warehouseId: requestedWarehouseId, sortBy, sortOrder } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { materialCode: { contains: search } },
        { materialName: { contains: search } },
        { barcode: { contains: search } },
        { specification: { contains: search } },
      ]
    }

    if (materialType) {
      where.materialType = materialType
    }

    if (source) {
      where.source = source
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    const total = await prisma.packagingMaterial.count({ where })

    const materials = await prisma.packagingMaterial.findMany({
      where,
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        materialType: true,
        specification: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        weightKg: true,
        unit: true,
        unitPrice: true,
        currency: true,
        barcode: true,
        source: true,
        isReusable: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { [sortBy!]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: materials,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取包材列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取包材列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/packaging-materials - 创建包材
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validationResult = createPackagingMaterialSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const existingMaterial = await prisma.packagingMaterial.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        materialCode: data.materialCode,
      },
    })

    if (existingMaterial) {
      return NextResponse.json(
        { success: false, message: '包材编码已存在', code: 'MATERIAL_CODE_EXISTS' },
        { status: 400 }
      )
    }

    // 计算体积
    let volumeCbm: Prisma.Decimal | null = null
    if (data.lengthCm && data.widthCm && data.heightCm) {
      volumeCbm = new Prisma.Decimal((data.lengthCm * data.widthCm * data.heightCm) / 1000000)
    }

    const material = await prisma.packagingMaterial.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseId: data.warehouseId || null,
        materialCode: data.materialCode,
        materialName: data.materialName,
        materialType: data.materialType,
        specification: data.specification || null,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        volumeCbm: volumeCbm,
        weightKg: data.weightKg,
        maxLoadWeightKg: data.maxLoadWeightKg,
        unit: data.unit,
        unitPrice: data.unitPrice,
        currency: data.currency,
        supplierName: data.supplierName || null,
        barcode: data.barcode || null,
        imageUrl: data.imageUrl || null,
        source: data.source,
        isReusable: data.isReusable,
        notes: data.notes || null,
        isActive: true,
        createdBy: auth.user.id,
      },
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        materialType: true,
        specification: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: material,
      message: '包材创建成功',
    })
  } catch (error) {
    console.error('创建包材失败:', error)
    return NextResponse.json(
      { success: false, message: '创建包材失败' },
      { status: 500 }
    )
  }
})
