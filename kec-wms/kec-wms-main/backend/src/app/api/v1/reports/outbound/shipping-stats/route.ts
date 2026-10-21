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
    if (clientId) {
      where.order = {
        clientId,
      }
    }

    // Default to last 30 days
    const start = startDate ? startOfDay(new Date(startDate)) : subDays(new Date(), 29)
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())

    where.createdAt = {
      gte: start,
      lte: end,
    }

    // Get shipment summary
    const shipmentStats = await prismaRead.shipment.aggregate({
      where,
      _count: { id: true },
      _sum: {
        packageCount: true,
        totalWeightKg: true,
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
    const yesterdayStats = await prismaRead.shipment.aggregate({
      where: yesterdayWhere,
      _count: { id: true },
      _sum: { packageCount: true },
    })

    const totalShipmentsTrend = yesterdayStats._count.id > 0
      ? Math.round(((shipmentStats._count.id - yesterdayStats._count.id) / yesterdayStats._count.id) * 100)
      : 0
    const totalPackagesTrend = yesterdayStats._sum.packageCount && yesterdayStats._sum.packageCount > 0
      ? Math.round(((shipmentStats._sum.packageCount || 0) - yesterdayStats._sum.packageCount) / yesterdayStats._sum.packageCount * 100)
      : 0

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

    // Get daily trend
    const dailyData = await prismaRead.shipment.groupBy({
      by: ['createdAt'],
      where,
      _count: { id: true },
      _sum: { packageCount: true },
    })

    // Aggregate by date
    const trendMap = new Map<string, { shipments: number; packages: number }>()
    dailyData.forEach((d) => {
      const dateKey = formatDate(d.createdAt)
      const existing = trendMap.get(dateKey) || { shipments: 0, packages: 0 }
      trendMap.set(dateKey, {
        shipments: existing.shipments + d._count.id,
        packages: existing.packages + (d._sum.packageCount || 0),
      })
    })

    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        shipments: data.shipments,
        packages: data.packages,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get by carrier
    const byCarrier = await prismaRead.shipment.groupBy({
      by: ['carrierName'],
      where: {
        ...where,
        carrierName: { not: null },
      },
      _count: { id: true },
      _sum: { packageCount: true },
    })

    const carrierData = byCarrier
      .filter((c) => c.carrierName)
      .map((c) => ({
        carrier: c.carrierName || 'Unknown',
        shipments: c._count.id,
        packages: c._sum.packageCount || 0,
      }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 10)

    // Get by warehouse data
    const byWarehouse = await prismaRead.shipment.groupBy({
      by: ['warehouseId'],
      where,
      _count: { id: true },
      _sum: { packageCount: true, totalWeightKg: true },
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
          shipments: item._count.id,
          packages: item._sum.packageCount || 0,
          weight: Math.round(Number(item._sum.totalWeightKg || 0) * 100) / 100,
        }
      })
    )

    // Get by client data - fetch with order relation since Shipment doesn't have clientId
    const shipmentsWithOrder = await prismaRead.shipment.findMany({
      where,
      select: {
        id: true,
        packageCount: true,
        totalWeightKg: true,
        order: {
          select: {
            clientId: true,
          },
        },
      },
    })

    // Group by clientId in JavaScript
    const clientMap = new Map<string, { shipments: number; packages: number; weight: number }>()
    shipmentsWithOrder.forEach((shipment) => {
      const clientId = shipment.order.clientId
      const existing = clientMap.get(clientId) || { shipments: 0, packages: 0, weight: 0 }
      clientMap.set(clientId, {
        shipments: existing.shipments + 1,
        packages: existing.packages + shipment.packageCount,
        weight: existing.weight + Number(shipment.totalWeightKg || 0),
      })
    })

    const clientData = await Promise.all(
      Array.from(clientMap.entries()).map(async ([clientId, stats]) => {
        const client = await prismaRead.client.findUnique({
          where: { id: clientId },
          select: { clientName: true },
        })
        return {
          client: client?.clientName || 'Unknown',
          clientId,
          shipments: stats.shipments,
          packages: stats.packages,
          weight: Math.round(stats.weight * 100) / 100,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalShipments: shipmentStats._count.id,
          totalShipmentsTrend,
          totalPackages: shipmentStats._sum.packageCount || 0,
          totalPackagesTrend,
          totalWeight: Math.round(Number(shipmentStats._sum.totalWeightKg || 0) * 100) / 100,
        },
        trend,
        byCarrier: carrierData,
        byWarehouse: warehouseData,
        byClient: clientData,
      },
    })
  } catch (error) {
    console.error('Shipping stats report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shipping stats report' },
      { status: 500 }
    )
  }
})
