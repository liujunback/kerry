import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import {
  createWarehouseSchema,
  warehouseListQuerySchema,
} from '@/lib/validations/warehouse'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/warehouses - 获取仓库列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = warehouseListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      warehouseType: searchParams.get('warehouseType'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, status, warehouseType, sortBy, sortOrder } = queryResult.data

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { warehouseCode: { contains: search } },
        { warehouseName: { contains: search } },
        { address: { contains: search } },
        { city: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (warehouseType) {
      where.warehouseType = warehouseType
    }

    const total = await prisma.warehouse.count({ where })

    const warehouses = await prisma.warehouse.findMany({
      where,
      select: {
        id: true,
        warehouseCode: true,
        warehouseName: true,
        warehouseType: true,
        address: true,
        city: true,
        country: true,
        region: true,
        warehouseArea: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            zones: true,
            binLocations: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: warehouses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取仓库列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取仓库列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/warehouses - 创建仓库
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validationResult = createWarehouseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        warehouseCode: data.warehouseCode,
      },
    })

    if (existingWarehouse) {
      return NextResponse.json(
        { success: false, message: '仓库编码已存在', code: 'WAREHOUSE_CODE_EXISTS' },
        { status: 400 }
      )
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseCode: data.warehouseCode,
        warehouseName: data.warehouseName,
        warehouseType: data.warehouseType,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        zipCode: data.zipCode || null,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        latitude: data.latitude,
        longitude: data.longitude,
        region: data.region || null,
        warehouseArea: data.warehouseArea,
        status: 'ACTIVE',
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
      },
    })

    return NextResponse.json({
      success: true,
      data: warehouse,
      message: '仓库创建成功',
    })
  } catch (error) {
    console.error('创建仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '创建仓库失败' },
      { status: 500 }
    )
  }
})
