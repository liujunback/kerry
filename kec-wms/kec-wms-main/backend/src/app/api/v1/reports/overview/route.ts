import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prismaRead } from '@/lib/db/prisma'
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from '@/lib/utils/date-formatter'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId

    // 获取时间范围
    const today = new Date()
    const yesterday = subDays(today, 1)
    const lastMonth = subMonths(today, 1)

    // 库存统计
    const inventoryStats = await prismaRead.skuInventorySummary.aggregate({
      where: { tenantId },
      _count: { skuId: true },
      _sum: {
        totalOnHand: true,
        qtyAvailable: true,
      },
    })

    const lastMonthInventory = await prismaRead.skuInventorySummary.aggregate({
      where: {
        tenantId,
        updatedAt: {
          gte: startOfMonth(lastMonth),
          lte: endOfMonth(lastMonth),
        },
      },
      _count: { skuId: true },
    })

    const inventoryTrend = lastMonthInventory._count.skuId > 0
      ? Math.round(((inventoryStats._count.skuId - lastMonthInventory._count.skuId) / lastMonthInventory._count.skuId) * 100)
      : 0

    // 入库统计
    const todayAsn = await prismaRead.asn.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    })

    const yesterdayAsn = await prismaRead.asn.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay(yesterday),
          lte: endOfDay(yesterday),
        },
      },
    })

    const weekAsn = await prismaRead.asn.count({
      where: {
        tenantId,
        createdAt: {
          gte: subDays(today, 7),
        },
      },
    })

    const monthAsn = await prismaRead.asn.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth(today),
        },
      },
    })

    const inboundTrend = yesterdayAsn > 0
      ? Math.round(((todayAsn - yesterdayAsn) / yesterdayAsn) * 100)
      : 0

    // 出库统计
    const todayOrders = await prismaRead.outboundOrder.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    })

    const yesterdayOrders = await prismaRead.outboundOrder.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay(yesterday),
          lte: endOfDay(yesterday),
        },
      },
    })

    const weekOrders = await prismaRead.outboundOrder.count({
      where: {
        tenantId,
        createdAt: {
          gte: subDays(today, 7),
        },
      },
    })

    const monthOrders = await prismaRead.outboundOrder.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth(today),
        },
      },
    })

    const outboundTrend = yesterdayOrders > 0
      ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        inventory: {
          totalSku: inventoryStats._count.skuId,
          totalQuantity: inventoryStats._sum.totalOnHand || 0,
          available: inventoryStats._sum.qtyAvailable || 0,
          trend: inventoryTrend,
        },
        inbound: {
          todayAsn,
          weekAsn,
          monthAsn,
          trend: inboundTrend,
        },
        outbound: {
          todayOrders,
          weekOrders,
          monthOrders,
          trend: outboundTrend,
        },
      },
    })
  } catch (error) {
    console.error('Overview stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overview stats' },
      { status: 500 }
    )
  }
})
