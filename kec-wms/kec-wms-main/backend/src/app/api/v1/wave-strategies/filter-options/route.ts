import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedWarehouseId = searchParams.get('warehouseId') || undefined
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    if (!warehouseId) {
      return NextResponse.json({
        success: true,
        data: {
          platforms: [],
          shippingMethods: [],
        },
      })
    }

    const startedAt = new Date()
    startedAt.setDate(startedAt.getDate() - 6)
    startedAt.setHours(0, 0, 0, 0)

    const [platformRows, shippingMethodRows] = await Promise.all([
      prisma.outboundOrder.findMany({
        where: {
          tenantId: auth.user.tenantId,
          warehouseId,
          createdAt: { gte: startedAt },
        },
        select: {
          platform: true,
        },
        distinct: ['platform'],
      }),
      prisma.outboundOrder.findMany({
        where: {
          tenantId: auth.user.tenantId,
          warehouseId,
          createdAt: { gte: startedAt },
          shippingMethod: {
            not: null,
          },
        },
        select: {
          shippingMethod: true,
        },
        distinct: ['shippingMethod'],
      }),
    ])

    const platforms = platformRows
      .map((item) => item.platform?.trim())
      .filter((item): item is string => Boolean(item))
      .sort((left, right) => left.localeCompare(right))

    const shippingMethods = shippingMethodRows
      .map((item) => item.shippingMethod?.trim())
      .filter((item): item is string => Boolean(item))
      .sort((left, right) => left.localeCompare(right))

    return NextResponse.json({
      success: true,
      data: {
        platforms,
        shippingMethods,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取筛选选项失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})
