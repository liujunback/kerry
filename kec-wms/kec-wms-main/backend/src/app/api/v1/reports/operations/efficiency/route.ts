import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { format, startOfWeek, subDays } from '@/lib/utils/date-formatter'

type EfficiencyAggregate = {
  warehouseId: string
  inboundEfficiency: number
  outboundEfficiency: number
  inboundCount: number
  outboundCount: number
}

type TimeAggregate = {
  time: string
  inboundEfficiency: number
  outboundEfficiency: number
  inboundCount: number
  outboundCount: number
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const granularity = searchParams.get('granularity') || 'day'

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const tenantId = auth.user.tenantId

    // 计算昨天的日期范围用于趋势对比
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const yesterdayStart = subDays(start, daysDiff)
    const yesterdayEnd = subDays(end, daysDiff)

    // 入库作业效率（ASN接收）
    const asnWhere: Record<string, unknown> = {
      tenantId,
      status: 'RECEIVED',
      receivingEndAt: { gte: start, lte: end },
    }
    if (warehouseId) asnWhere.warehouseId = warehouseId

    const asns = await prismaRead.asn.findMany({
      where: asnWhere,
      select: {
        id: true,
        createdAt: true,
        receivingEndAt: true,
        warehouseId: true,
        asnLines: {
          select: {
            receivedQty: true,
          },
        },
      },
    })

    // 计算入库效率（件/小时）
    const inboundStats = asns.map((asn) => {
      const totalQty = asn.asnLines.reduce((sum, item) => sum + item.receivedQty, 0)
      const hours = asn.receivingEndAt && asn.createdAt
        ? (asn.receivingEndAt.getTime() - asn.createdAt.getTime()) / (1000 * 60 * 60)
        : 0
      return {
        warehouseId: asn.warehouseId,
        totalQty,
        hours,
        efficiency: hours > 0 ? totalQty / hours : 0,
        receivingEndAt: asn.receivingEndAt,
      }
    })

    const avgInboundEfficiency = inboundStats.length > 0
      ? inboundStats.reduce((sum, s) => sum + s.efficiency, 0) / inboundStats.length
      : 0

    // 出库作业效率（出库订单拣货）
    const outboundWhere: Record<string, unknown> = {
      tenantId,
      status: 'SHIPPED',
      updatedAt: { gte: start, lte: end },
    }
    if (warehouseId) outboundWhere.warehouseId = warehouseId

    const outboundOrders = await prismaRead.outboundOrder.findMany({
      where: outboundWhere,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        warehouseId: true,
        lines: {
          select: {
            shippedQty: true,
          },
        },
      },
    })

    // 计算出库效率（件/小时）
    const outboundStats = outboundOrders.map((order) => {
      const totalQty = order.lines.reduce((sum, item) => sum + item.shippedQty, 0)
      const hours = order.updatedAt && order.createdAt
        ? (order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60)
        : 0
      return {
        warehouseId: order.warehouseId,
        totalQty,
        hours,
        efficiency: hours > 0 ? totalQty / hours : 0,
        updatedAt: order.updatedAt,
      }
    })

    const avgOutboundEfficiency = outboundStats.length > 0
      ? outboundStats.reduce((sum, s) => sum + s.efficiency, 0) / outboundStats.length
      : 0

    // 获取昨天的数据用于趋势对比
    const yesterdayAsnWhere = { ...asnWhere, receivingEndAt: { gte: yesterdayStart, lte: yesterdayEnd } }
    const yesterdayAsns = await prismaRead.asn.findMany({
      where: yesterdayAsnWhere,
      select: {
        createdAt: true,
        receivingEndAt: true,
        asnLines: { select: { receivedQty: true } },
      },
    })

    const yesterdayInboundStats = yesterdayAsns.map((asn) => {
      const totalQty = asn.asnLines.reduce((sum, item) => sum + item.receivedQty, 0)
      const hours = asn.receivingEndAt && asn.createdAt
        ? (asn.receivingEndAt.getTime() - asn.createdAt.getTime()) / (1000 * 60 * 60)
        : 0
      return hours > 0 ? totalQty / hours : 0
    })

    const yesterdayAvgInboundEfficiency = yesterdayInboundStats.length > 0
      ? yesterdayInboundStats.reduce((sum, e) => sum + e, 0) / yesterdayInboundStats.length
      : 0

    const yesterdayOutboundWhere = { ...outboundWhere, updatedAt: { gte: yesterdayStart, lte: yesterdayEnd } }
    const yesterdayOutboundOrders = await prismaRead.outboundOrder.findMany({
      where: yesterdayOutboundWhere,
      select: {
        createdAt: true,
        updatedAt: true,
        lines: { select: { shippedQty: true } },
      },
    })

    const yesterdayOutboundStats = yesterdayOutboundOrders.map((order) => {
      const totalQty = order.lines.reduce((sum, item) => sum + item.shippedQty, 0)
      const hours = order.updatedAt && order.createdAt
        ? (order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60)
        : 0
      return hours > 0 ? totalQty / hours : 0
    })

    const yesterdayAvgOutboundEfficiency = yesterdayOutboundStats.length > 0
      ? yesterdayOutboundStats.reduce((sum, e) => sum + e, 0) / yesterdayOutboundStats.length
      : 0

    // 计算趋势
    const inboundEfficiencyTrend = yesterdayAvgInboundEfficiency > 0
      ? Math.round(((avgInboundEfficiency - yesterdayAvgInboundEfficiency) / yesterdayAvgInboundEfficiency) * 100)
      : 0

    const outboundEfficiencyTrend = yesterdayAvgOutboundEfficiency > 0
      ? Math.round(((avgOutboundEfficiency - yesterdayAvgOutboundEfficiency) / yesterdayAvgOutboundEfficiency) * 100)
      : 0

    // 按仓库分组
    const byWarehouse = Object.values(
      [...inboundStats, ...outboundStats].reduce<Record<string, EfficiencyAggregate>>((acc, stat) => {
        const warehouseId = stat.warehouseId
        if (!acc[warehouseId]) {
          acc[warehouseId] = {
            warehouseId,
            inboundEfficiency: 0,
            outboundEfficiency: 0,
            inboundCount: 0,
            outboundCount: 0,
          }
        }
        if ('receivingEndAt' in stat) {
          acc[warehouseId].inboundEfficiency += stat.efficiency
          acc[warehouseId].inboundCount += 1
        } else {
          acc[warehouseId].outboundEfficiency += stat.efficiency
          acc[warehouseId].outboundCount += 1
        }
        return acc
      }, {})
    )

    // 计算每个仓库的平均效率
    byWarehouse.forEach((warehouse) => {
      warehouse.inboundEfficiency = warehouse.inboundCount > 0
        ? warehouse.inboundEfficiency / warehouse.inboundCount
        : 0
      warehouse.outboundEfficiency = warehouse.outboundCount > 0
        ? warehouse.outboundEfficiency / warehouse.outboundCount
        : 0
    })

    // 按时间粒度分组
    const formatDate = (date: Date) => {
      switch (granularity) {
        case 'hour':
          return format(date, 'MM-dd HH:00')
        case 'day':
          return format(date, 'MM-dd')
        case 'week':
          return format(startOfWeek(date), 'MM-dd')
        case 'month':
          return format(date, 'yyyy-MM')
        case 'quarter':
          return `${format(date, 'yyyy')}-Q${Math.floor(date.getMonth() / 3) + 1}`
        case 'year':
          return format(date, 'yyyy')
        default:
          return format(date, 'MM-dd')
      }
    }

    const byTime: Record<string, TimeAggregate> = {}

    inboundStats.forEach((stat) => {
      if (stat.receivingEndAt) {
        const timeKey = formatDate(stat.receivingEndAt)
        if (!byTime[timeKey]) {
          byTime[timeKey] = { time: timeKey, inboundEfficiency: 0, outboundEfficiency: 0, inboundCount: 0, outboundCount: 0 }
        }
        byTime[timeKey].inboundEfficiency += stat.efficiency
        byTime[timeKey].inboundCount += 1
      }
    })

    outboundStats.forEach((stat) => {
      if (stat.updatedAt) {
        const timeKey = formatDate(stat.updatedAt)
        if (!byTime[timeKey]) {
          byTime[timeKey] = { time: timeKey, inboundEfficiency: 0, outboundEfficiency: 0, inboundCount: 0, outboundCount: 0 }
        }
        byTime[timeKey].outboundEfficiency += stat.efficiency
        byTime[timeKey].outboundCount += 1
      }
    })

    const byTimeArray = Object.values(byTime).map((item) => ({
      time: item.time,
      inboundEfficiency: item.inboundCount > 0 ? Math.round(item.inboundEfficiency / item.inboundCount) : 0,
      outboundEfficiency: item.outboundCount > 0 ? Math.round(item.outboundEfficiency / item.outboundCount) : 0,
    }))

    return NextResponse.json({
      avgInboundEfficiency: Math.round(avgInboundEfficiency),
      inboundEfficiencyTrend,
      avgOutboundEfficiency: Math.round(avgOutboundEfficiency),
      outboundEfficiencyTrend,
      totalInboundOrders: asns.length,
      totalOutboundOrders: outboundOrders.length,
      byWarehouse,
      byTime: byTimeArray,
    })
  } catch (error) {
    console.error('Error fetching operations efficiency:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
