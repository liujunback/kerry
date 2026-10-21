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

    // Get order summary
    const orderStats = await prismaRead.outboundOrder.aggregate({
      where,
      _count: { id: true },
    })

    // Get completed orders
    const completedOrders = await prismaRead.outboundOrder.count({
      where: {
        ...where,
        status: { in: ['CHECKED_OUT'] },
      },
    })

    const fulfillmentRate = orderStats._count.id > 0
      ? Math.round((completedOrders / orderStats._count.id) * 100)
      : 0

    // Get yesterday's data for comparison
    const yesterdayWhere = {
      ...where,
      createdAt: {
        gte: startOfDay(subDays(new Date(), 1)),
        lte: endOfDay(subDays(new Date(), 1)),
      },
    }
    const yesterdayStats = await prismaRead.outboundOrder.aggregate({
      where: yesterdayWhere,
      _count: { id: true },
    })
    const yesterdayCompleted = await prismaRead.outboundOrder.count({
      where: { ...yesterdayWhere, status: { in: ['CHECKED_OUT'] } },
    })

    const totalOrdersTrend = yesterdayStats._count.id > 0
      ? Math.round(((orderStats._count.id - yesterdayStats._count.id) / yesterdayStats._count.id) * 100)
      : 0
    const completedOrdersTrend = yesterdayCompleted > 0
      ? Math.round(((completedOrders - yesterdayCompleted) / yesterdayCompleted) * 100)
      : 0

    // Get status distribution
    const byStatus = await prismaRead.outboundOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    })

    const statusData = byStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }))

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
    const dailyData = await prismaRead.outboundOrder.groupBy({
      by: ['createdAt'],
      where,
      _count: { id: true },
    })

    // Aggregate by date
    const trendMap = new Map<string, { total: number; completed: number }>()

    // Get completed orders by date
    const completedByDate = await prismaRead.outboundOrder.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        status: { in: ['CHECKED_OUT'] },
      },
      _count: { id: true },
    })

    dailyData.forEach((d) => {
      const dateKey = formatDate(d.createdAt)
      const existing = trendMap.get(dateKey) || { total: 0, completed: 0 }
      trendMap.set(dateKey, {
        total: existing.total + d._count.id,
        completed: existing.completed,
      })
    })

    completedByDate.forEach((d) => {
      const dateKey = formatDate(d.createdAt)
      const existing = trendMap.get(dateKey) || { total: 0, completed: 0 }
      trendMap.set(dateKey, {
        total: existing.total,
        completed: existing.completed + d._count.id,
      })
    })

    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        total: data.total,
        completed: data.completed,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get by warehouse data
    const byWarehouse = await prismaRead.outboundOrder.groupBy({
      by: ['warehouseId'],
      where,
      _count: { id: true },
    })

    const warehouseData = await Promise.all(
      byWarehouse.map(async (item) => {
        const warehouse = await prismaRead.warehouse.findUnique({
          where: { id: item.warehouseId },
          select: { warehouseName: true },
        })
        const completed = await prismaRead.outboundOrder.count({
          where: {
            ...where,
            warehouseId: item.warehouseId,
            status: { in: ['CHECKED_OUT'] },
          },
        })
        return {
          warehouse: warehouse?.warehouseName || 'Unknown',
          warehouseId: item.warehouseId,
          total: item._count.id,
          completed,
          rate: item._count.id > 0 ? Math.round((completed / item._count.id) * 100) : 0,
        }
      })
    )

    // Get by client data
    const byClient = await prismaRead.outboundOrder.groupBy({
      by: ['clientId'],
      where,
      _count: { id: true },
    })

    const clientData = await Promise.all(
      byClient.map(async (item) => {
        const client = await prismaRead.client.findUnique({
          where: { id: item.clientId },
          select: { clientName: true },
        })
        const completed = await prismaRead.outboundOrder.count({
          where: {
            ...where,
            clientId: item.clientId,
            status: { in: ['CHECKED_OUT'] },
          },
        })
        return {
          client: client?.clientName || 'Unknown',
          clientId: item.clientId,
          total: item._count.id,
          completed,
          rate: item._count.id > 0 ? Math.round((completed / item._count.id) * 100) : 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders: orderStats._count.id,
          totalOrdersTrend,
          completedOrders,
          completedOrdersTrend,
          fulfillmentRate,
        },
        byStatus: statusData,
        byWarehouse: warehouseData,
        byClient: clientData,
        trend,
      },
    })
  } catch (error) {
    console.error('Fulfillment rate report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fulfillment rate report' },
      { status: 500 }
    )
  }
})
