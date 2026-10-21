import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  createZoneSchema,
  zoneListQuerySchema,
} from '@/lib/validations/zone'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/zones - 获取库区列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = zoneListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      search: searchParams.get('search'),
      zoneType: searchParams.get('zoneType'),
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

    const { page, pageSize, warehouseId: requestedWarehouseId, search, zoneType, status, sortBy, sortOrder } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (search) where.OR = [{ zoneCode: { contains: search } }, { zoneName: { contains: search } }]
    if (zoneType) where.zoneType = zoneType
    if (status) where.status = status

    const total = await prisma.zone.count({ where })

    const zones = await prisma.zone.findMany({
      where,
      select: {
        id: true,
        zoneCode: true,
        zoneName: true,
        zoneType: true,
        qualityType: true,
        capacityUnits: true,
        currentUnits: true,
        status: true,
        createdAt: true,
        warehouse: {
          select: { id: true, warehouseCode: true, warehouseName: true },
        },
        _count: { select: { binLocations: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: zones,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('获取库区列表失败:', error)
    return NextResponse.json({ success: false, message: '获取库区列表失败' }, { status: 500 })
  }
})

// POST /api/v1/zones - 创建库区
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validationResult = createZoneSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, tenantId: auth.user.tenantId },
    })

    if (!warehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 })
    }

    const existingZone = await prisma.zone.findFirst({
      where: { warehouseId: data.warehouseId, zoneCode: data.zoneCode },
    })

    if (existingZone) {
      return NextResponse.json(
        { success: false, message: '库区编码已存在', code: 'ZONE_CODE_EXISTS' },
        { status: 400 }
      )
    }

    const zone = await prisma.zone.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseId: data.warehouseId,
        zoneCode: data.zoneCode,
        zoneName: data.zoneName || null,
        zoneType: data.zoneType,
        qualityType: data.qualityType,
        capacityUnits: data.capacityUnits,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        zoneCode: true,
        zoneName: true,
        zoneType: true,
        qualityType: true,
        capacityUnits: true,
        status: true,
        createdAt: true,
        warehouse: {
          select: { id: true, warehouseCode: true, warehouseName: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: zone, message: '库区创建成功' })
  } catch (error) {
    console.error('创建库区失败:', error)
    return NextResponse.json({ success: false, message: '创建库区失败' }, { status: 500 })
  }
})
