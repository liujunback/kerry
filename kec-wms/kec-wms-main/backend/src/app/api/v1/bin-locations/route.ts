import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { BucketType, type BucketTypeValue, getAllowedZoneQualityTypes } from '@/lib/utils/quality-mapping'
import {
  binLocationListQuerySchema,
  createBinLocationSchema,
} from '@/lib/validations/bin-location'
import { NextRequest, NextResponse } from 'next/server'

function isBucketTypeValue(value: string): value is BucketTypeValue {
  return Object.values(BucketType).includes(value as BucketTypeValue)
}

// GET /api/v1/bin-locations - 获取库位列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = binLocationListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      zoneId: searchParams.get('zoneId'),
      search: searchParams.get('search'),
      locationType: searchParams.get('locationType'),
      status: searchParams.get('status'),
      lockStatus: searchParams.get('lockStatus'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, warehouseId: requestedWarehouseId, zoneId, search, locationType, status, lockStatus, sortBy, sortOrder } = queryResult.data
    const targetBucketType = searchParams.get('targetBucketType')
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (zoneId) where.zoneId = zoneId

    if (targetBucketType && isBucketTypeValue(targetBucketType)) {
      const allowedZoneQualityTypes = getAllowedZoneQualityTypes(targetBucketType)
      if (allowedZoneQualityTypes.length > 0) {
        where.zone = { qualityType: { in: allowedZoneQualityTypes } }
      }
    }

    if (search) {
      where.OR = [
        { locationCode: { contains: search } },
        { aisle: { contains: search } },
      ]
    }

    if (locationType) where.locationType = locationType
    if (status) where.status = status
    if (lockStatus) where.lockStatus = lockStatus

    const total = await prisma.binLocation.count({ where })

    const binLocations = await prisma.binLocation.findMany({
      where,
      select: {
        id: true,
        locationCode: true,
        aisle: true,
        rack: true,
        shelf: true,
        bin: true,
        locationType: true,
        lockStatus: true,
        isPickable: true,
        isReceivable: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        putawayPriority: true,
        pickPriority: true,
        pickSequence: true,
        maxSkuCount: true,
        status: true,
        lastCountedAt: true,
        createdAt: true,
        zone: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
            qualityType: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: binLocations,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('获取库位列表失败:', error)
    return NextResponse.json({ success: false, message: '获取库位列表失败' }, { status: 500 })
  }
})

// POST /api/v1/bin-locations - 创建库位
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = createBinLocationSchema.safeParse(body)

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

    const zone = await prisma.zone.findFirst({
      where: { id: data.zoneId, warehouseId: data.warehouseId },
    })

    if (!zone) {
      return NextResponse.json(
        { success: false, message: '库区不存在或不属于该仓库' },
        { status: 404 }
      )
    }

    if (['PICKING', 'STORAGE'].includes(zone.zoneType) && !data.isPickable && !data.isReceivable) {
      return NextResponse.json(
        {
          success: false,
          message: '拣货区或存储区的库位必须至少选择可拣货或可收货',
          code: 'PICKABLE_OR_RECEIVABLE_REQUIRED',
        },
        { status: 400 }
      )
    }

    const existingBin = await prisma.binLocation.findFirst({
      where: { warehouseId: data.warehouseId, locationCode: data.locationCode },
    })

    if (existingBin) {
      return NextResponse.json(
        { success: false, message: '库位编码已存在', code: 'BIN_CODE_EXISTS' },
        { status: 400 }
      )
    }

    const binLocation = await prisma.binLocation.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseId: data.warehouseId,
        zoneId: data.zoneId,
        locationCode: data.locationCode,
        aisle: data.aisle || null,
        rack: data.rack || null,
        shelf: data.shelf || null,
        bin: data.bin || null,
        locationType: data.locationType,
        isPickable: data.isPickable,
        isReceivable: data.isReceivable,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        putawayPriority: data.putawayPriority,
        pickPriority: data.pickPriority,
        pickSequence: data.pickSequence,
        maxSkuCount: data.maxSkuCount,
        lockStatus: 'UNLOCKED',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        locationCode: true,
        aisle: true,
        rack: true,
        shelf: true,
        bin: true,
        locationType: true,
        lockStatus: true,
        isPickable: true,
        isReceivable: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        putawayPriority: true,
        pickPriority: true,
        pickSequence: true,
        maxSkuCount: true,
        status: true,
        createdAt: true,
        zone: {
          select: {
            id: true,
            zoneCode: true,
            zoneName: true,
            qualityType: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: binLocation,
      message: '库位创建成功',
    })
  } catch (error) {
    console.error('创建库位失败:', error)
    return NextResponse.json({ success: false, message: '创建库位失败' }, { status: 500 })
  }
})
