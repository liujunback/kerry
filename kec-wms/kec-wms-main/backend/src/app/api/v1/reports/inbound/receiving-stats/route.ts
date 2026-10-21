import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { subDays, format, startOfDay, endOfDay, startOfWeek } from '@/lib/utils/date-formatter'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const granularity = searchParams.get('granularity') || 'day'

    const tenantId = auth.user.tenantId

    const where: Record<string, unknown> = { tenantId }
    if (warehouseId) where.warehouseId = warehouseId
    if (clientId) where.clientId = clientId

    // Default to last 30 days
    const start = startDate ? startOfDay(new Date(startDate)) : subDays(new Date(), 29)
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())

    where.createdAt = {
      gte: start,
      lte: end,
    }

    // Get ASN summary
    const asnStats = await prismaRead.asn.aggregate({
      where,
      _count: { id: true },
      _sum: {
        totalReceivedQty: true,
        totalExpectedQty: true,
      },
    })

    // Get yesterday's data for comparison
    const yesterdayWhere = {
      ...where,
      createdAt: {
        gte: startOfDay(subDays(new Date(), 1)),
        lte: endOfDay(subDays(new Date(), 1)),
      },
    }
    const yesterdayStats = await prismaRead.asn.aggregate({
      where: yesterdayWhere,
      _count: { id: true },
      _sum: { totalReceivedQty: true },
    })

    // Calculate trends
    const totalAsnTrend = yesterdayStats._count.id > 0
      ? Math.round(((asnStats._count.id - yesterdayStats._count.id) / yesterdayStats._count.id) * 100)
      : 0
    const totalReceivedTrend = yesterdayStats._sum.totalReceivedQty && yesterdayStats._sum.totalReceivedQty > 0
      ? Math.round(((asnStats._sum.totalReceivedQty || 0) - yesterdayStats._sum.totalReceivedQty) / yesterdayStats._sum.totalReceivedQty * 100)
      : 0

    // Get completed ASNs for on-time calculation
    const completedAsns = await prismaRead.asn.findMany({
      where: {
        ...where,
        status: { in: ['COMPLETED', 'CLOSED'] },
      },
      select: {
        expectedArrivalDate: true,
        actualArrivalAt: true,
      },
    })

    let onTimeCount = 0
    completedAsns.forEach((asn) => {
      if (asn.expectedArrivalDate && asn.actualArrivalAt) {
        if (new Date(asn.actualArrivalAt) <= new Date(asn.expectedArrivalDate)) {
          onTimeCount++
        }
      }
    })
    const onTimeRate = completedAsns.length > 0
      ? Math.round((onTimeCount / completedAsns.length) * 100)
      : 0

    // Get daily trend with granularity support
    const dailyData = await prismaRead.asn.groupBy({
      by: ['createdAt'],
      where,
      _count: { id: true },
      _sum: { totalReceivedQty: true },
    })

    // Format date based on granularity
    const formatDate = (date: Date) => {
      switch (granularity) {
        case 'hour': return format(date, 'MM-dd HH:00')
        case 'day': return format(date, 'MM-dd')
        case 'week': return format(startOfWeek(date), 'MM-dd')
        case 'month': return format(date, 'yyyy-MM')
        case 'quarter': return `${format(date, 'yyyy')}-Q${Math.floor(date.getMonth() / 3) + 1}`
        case 'year': return format(date, 'yyyy')
        default: return format(date, 'MM-dd')
      }
    }

    // Aggregate by date with granularity
    const trendMap = new Map<string, { count: number; quantity: number }>()
    dailyData.forEach((d) => {
      const dateKey = formatDate(d.createdAt)
      const existing = trendMap.get(dateKey) || { count: 0, quantity: 0 }
      trendMap.set(dateKey, {
        count: existing.count + d._count.id,
        quantity: existing.quantity + (d._sum.totalReceivedQty || 0),
      })
    })

    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        asnCount: data.count,
        quantity: data.quantity,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get by warehouse data
    const byWarehouse = await prismaRead.asn.groupBy({
      by: ['warehouseId'],
      where,
      _count: { id: true },
      _sum: { totalReceivedQty: true, totalExpectedQty: true },
    })

    const warehouseData = await Promise.all(
      byWarehouse.map(async (item) => {
        const warehouse = await prismaRead.warehouse.findUnique({
          where: { id: item.warehouseId },
          select: { warehouseName: true },
        })
        return {
          warehouse: warehouse?.warehouseName || 'Unknown',
          warehouseId: item.warehouseId,
          asnCount: item._count.id,
          receivedQty: item._sum.totalReceivedQty || 0,
          expectedQty: item._sum.totalExpectedQty || 0,
        }
      })
    )

    // Get by client data
    const byClient = await prismaRead.asn.groupBy({
      by: ['clientId'],
      where,
      _count: { id: true },
      _sum: { totalReceivedQty: true, totalExpectedQty: true },
    })

    const clientData = await Promise.all(
      byClient.map(async (item) => {
        const client = await prismaRead.client.findUnique({
          where: { id: item.clientId },
          select: { clientName: true },
        })
        return {
          client: client?.clientName || 'Unknown',
          clientId: item.clientId,
          asnCount: item._count.id,
          receivedQty: item._sum.totalReceivedQty || 0,
          expectedQty: item._sum.totalExpectedQty || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalAsn: asnStats._count.id,
          totalAsnTrend,
          totalReceived: asnStats._sum.totalReceivedQty || 0,
          totalReceivedTrend,
          totalExpected: asnStats._sum.totalExpectedQty || 0,
          onTimeRate,
        },
        trend,
        byWarehouse: warehouseData,
        byClient: clientData,
      },
    })
  } catch (error) {
    console.error('Receiving stats report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch receiving stats report' },
      { status: 500 }
    )
  }
})
