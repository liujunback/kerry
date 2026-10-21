import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'

function uniqSorted(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => !!value))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedWarehouseId = searchParams.get('warehouseId') || undefined
    const zoneId = searchParams.get('zoneId') || undefined
    const aisle = searchParams.get('aisle') || undefined
    const rack = searchParams.get('rack') || undefined
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where = {
      tenantId: auth.user.tenantId,
      ...(warehouseId ? { warehouseId } : {}),
      ...(zoneId ? { zoneId } : {}),
      status: 'ACTIVE',
    }

    const [aisleRows, rackRows, shelfRows] = await Promise.all([
      prisma.binLocation.findMany({
        where,
        distinct: ['aisle'],
        select: { aisle: true },
      }),
      prisma.binLocation.findMany({
        where: {
          ...where,
          ...(aisle ? { aisle } : {}),
        },
        distinct: ['rack'],
        select: { rack: true },
      }),
      prisma.binLocation.findMany({
        where: {
          ...where,
          ...(aisle ? { aisle } : {}),
          ...(rack ? { rack } : {}),
        },
        distinct: ['shelf'],
        select: { shelf: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        aisles: uniqSorted(aisleRows.map((item) => item.aisle)),
        racks: uniqSorted(rackRows.map((item) => item.rack)),
        shelves: uniqSorted(shelfRows.map((item) => item.shelf)),
      },
    })
  } catch (error) {
    console.error('获取库位范围选项失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '获取库位范围选项失败' },
      { status: 400 }
    )
  }
})
