import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { bulkCreateBinLocationSchema } from '@/lib/validations/bin-location'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// 生成范围数组
function generateRange(start: string, end: string): string[] {
  const startNum = parseInt(start, 10)
  const endNum = parseInt(end, 10)

  if (!isNaN(startNum) && !isNaN(endNum)) {
    const result: string[] = []
    const padLength = Math.max(start.length, end.length)
    for (let i = startNum; i <= endNum; i++) {
      result.push(i.toString().padStart(padLength, '0'))
    }
    return result
  }

  // 字母范围
  if (start.length === 1 && end.length === 1) {
    const result: string[] = []
    const startCode = start.charCodeAt(0)
    const endCode = end.charCodeAt(0)
    for (let i = startCode; i <= endCode; i++) {
      result.push(String.fromCharCode(i))
    }
    return result
  }

  return [start]
}

// POST /api/v1/bin-locations/bulk - 批量创建库位
export const POST = createAuthHandler(async (request, auth) => {
  const body = await request.json()
  const validationResult = bulkCreateBinLocationSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const data = validationResult.data
  const warehouseId = resolveScopedWarehouseId(auth.user, data.warehouseId) || data.warehouseId

  // 验证仓库存在
  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      tenantId: auth.user.tenantId,
    },
  })

  if (!warehouse) {
    return NextResponse.json(
      { success: false, message: '仓库不存在' },
      { status: 404 }
    )
  }

  // 验证库区存在且属于该仓库
  const zone = await prisma.zone.findFirst({
    where: {
      id: data.zoneId,
      warehouseId,
    },
  })

  if (!zone) {
    return NextResponse.json(
      { success: false, message: '库区不存在或不属于该仓库' },
      { status: 404 }
    )
  }

  // 生成库位数据
  const aisles = generateRange(data.aisleStart, data.aisleEnd)
  const racks = generateRange(data.rackStart, data.rackEnd)
  const shelves = generateRange(data.shelfStart, data.shelfEnd)
  const bins = data.binStart && data.binEnd
    ? generateRange(data.binStart, data.binEnd)
    : [null]

  const binLocationsToCreate: {
    tenantId: string
    warehouseId: string
    zoneId: string
    locationCode: string
    aisle: string
    rack: string
    shelf: string
    bin: string | null
    locationType: string
    isPickable: boolean
    isReceivable: boolean
    lockStatus: string
    status: string
  }[] = []

  for (const aisle of aisles) {
    for (const rack of racks) {
      for (const shelf of shelves) {
        for (const bin of bins) {
          const locationCode = bin
            ? `${data.prefix}-${aisle}-${rack}-${shelf}-${bin}`
            : `${data.prefix}-${aisle}-${rack}-${shelf}`

          binLocationsToCreate.push({
            tenantId: auth.user.tenantId,
            warehouseId,
            zoneId: data.zoneId,
            locationCode,
            aisle,
            rack,
            shelf,
            bin,
            locationType: data.locationType,
            isPickable: data.isPickable,
            isReceivable: data.isReceivable,
            lockStatus: 'UNLOCKED',
            status: 'ACTIVE',
          })
        }
      }
    }
  }

  // 检查数量限制
  if (binLocationsToCreate.length > 1000) {
    return NextResponse.json(
      { success: false, message: '单次批量创建不能超过1000个库位', code: 'TOO_MANY_BINS' },
      { status: 400 }
    )
  }

  // 检查是否有重复的库位编码
  const existingCodes = await prisma.binLocation.findMany({
    where: {
      warehouseId,
      locationCode: { in: binLocationsToCreate.map(b => b.locationCode) },
    },
    select: { locationCode: true },
  })

  if (existingCodes.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: `以下库位编码已存在: ${existingCodes.slice(0, 5).map(e => e.locationCode).join(', ')}${existingCodes.length > 5 ? '...' : ''}`,
        code: 'BIN_CODES_EXIST',
      },
      { status: 400 }
    )
  }

  // 批量创建
  const result = await prisma.binLocation.createMany({
    data: binLocationsToCreate,
  })

  return NextResponse.json({
    success: true,
    data: { count: result.count },
    message: `成功创建 ${result.count} 个库位`,
  })
})
