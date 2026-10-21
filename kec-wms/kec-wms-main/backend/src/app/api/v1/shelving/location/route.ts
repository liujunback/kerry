import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { createHandler } from '@/lib/api/create-handler'

// GET /api/v1/shelving/location
export const GET = createHandler(async (request) => {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams
  const locationCode = searchParams.get('locationCode')
  const warehouseId = resolveScopedWarehouseId(user, searchParams.get('warehouseId'))

  if (!locationCode) {
    return NextResponse.json(
      { success: false, message: '货位编码不能为空' },
      { status: 400 }
    )
  }

  const location = await prisma.binLocation.findFirst({
    where: {
      tenantId: user.tenantId,
      locationCode,
      ...(warehouseId ? { warehouseId } : {}),
    },
    include: {
      zone: {
        select: {
          id: true,
          zoneName: true,
          zoneCode: true,
          qualityType: true,
        },
      },
    },
  })

  if (!location) {
    return NextResponse.json(
      { success: false, message: '货位不存在', code: 'LOCATION_NOT_FOUND' },
      { status: 404 }
    )
  }

  if (location.status !== 'ACTIVE') {
    return NextResponse.json(
      { success: false, message: '货位未启用', code: 'LOCATION_INACTIVE' },
      { status: 400 }
    )
  }

  if (!location.isReceivable) {
    return NextResponse.json(
      { success: false, message: '该货位不允许上架', code: 'LOCATION_NOT_RECEIVABLE' },
      { status: 400 }
    )
  }

  if (location.lockStatus === 'LOCKED') {
    return NextResponse.json(
      { success: false, message: '货位已锁定', code: 'LOCATION_LOCKED' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: location.id,
      locationCode: location.locationCode,
      zoneId: location.zoneId,
      zoneName: location.zone?.zoneName || null,
      zoneCode: location.zone?.zoneCode || null,
      zoneQualityType: location.zone?.qualityType || 'GOOD',
      locationType: location.locationType,
      isReceivable: location.isReceivable,
      status: location.status,
      warehouseId: location.warehouseId,
    },
  })
})
