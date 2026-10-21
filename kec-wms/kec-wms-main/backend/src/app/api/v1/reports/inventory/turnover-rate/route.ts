import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { format, startOfWeek, subDays } from '@/lib/utils/date-formatter'

type WarehouseTurnover = {
  warehouseId: string
  totalOutbound: number
  inventoryCount: number
  totalInventory: number
  turnoverRate?: number
}

type SkuTurnover = {
  skuId: string
  skuCode: string
  skuName: string
  totalOutbound: number
  inventoryCount: number
  totalInventory: number
  turnoverRate?: number
}

type TimeTurnover = {
  time: string
  totalOutbound: number
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const zoneId = searchParams.get('zoneId')
    const clientId = searchParams.get('clientId')
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

    // 构建筛选条件
    const inventoryWhere: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: start, lte: end },
    }

    if (warehouseId) inventoryWhere.warehouseId = warehouseId
    if (zoneId) inventoryWhere.zoneId = zoneId
    if (clientId) inventoryWhere.clientId = clientId

    const yesterdayInventoryWhere = {
      ...inventoryWhere,
      createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
    }

    // 获取出库数据（通过OutboundOrderLine）
    const outboundItems = await prismaRead.outboundOrderLine.findMany({
      where: {
        order: {
          tenantId,
          status: 'SHIPPED',
          updatedAt: { gte: start, lte: end },
          ...(warehouseId && { warehouseId }),
          ...(clientId && { clientId }),
        },
      },
      select: {
        shippedQty: true,
        skuId: true,
        order: {
          select: {
            warehouseId: true,
            clientId: true,
            updatedAt: true,
          },
        },
        sku: {
          select: {
            skuCode: true,
            skuName: true,
          },
        },
      },
    })

    // 获取昨天的出库数据
    const yesterdayOutboundItems = await prismaRead.outboundOrderLine.findMany({
      where: {
        order: {
          tenantId,
          status: 'SHIPPED',
          updatedAt: { gte: yesterdayStart, lte: yesterdayEnd },
          ...(warehouseId && { warehouseId }),
          ...(clientId && { clientId }),
        },
      },
      select: {
        shippedQty: true,
      },
    })

    // 获取库存数据（平均库存）
    const inventoryRecords = await prismaRead.inventoryBucket.findMany({
      where: inventoryWhere,
      select: {
        quantity: true,
        skuId: true,
        warehouseId: true,
        clientId: true,
        createdAt: true,
        sku: {
          select: {
            skuCode: true,
            skuName: true,
          },
        },
      },
    })

    // 获取昨天的库存数据
    const yesterdayInventoryRecords = await prismaRead.inventoryBucket.findMany({
      where: yesterdayInventoryWhere,
      select: {
        quantity: true,
      },
    })

    // 计算总出库量
    const totalOutbound = outboundItems.reduce((sum, item) => sum + item.shippedQty, 0)
    const yesterdayTotalOutbound = yesterdayOutboundItems.reduce((sum, item) => sum + item.shippedQty, 0)

    // 计算平均库存
    const totalInventory = inventoryRecords.reduce((sum, item) => sum + item.quantity, 0)
    const avgInventory = inventoryRecords.length > 0 ? totalInventory / inventoryRecords.length : 0

    const yesterdayTotalInventory = yesterdayInventoryRecords.reduce((sum, item) => sum + item.quantity, 0)
    const yesterdayAvgInventory = yesterdayInventoryRecords.length > 0 ? yesterdayTotalInventory / yesterdayInventoryRecords.length : 0

    // 计算周转率（出库量/平均库存）
    const turnoverRate = avgInventory > 0 ? (totalOutbound / avgInventory).toFixed(2) : '0.00'
    const yesterdayTurnoverRate = yesterdayAvgInventory > 0 ? yesterdayTotalOutbound / yesterdayAvgInventory : 0

    // 计算趋势
    const turnoverRateTrend = yesterdayTurnoverRate > 0
      ? Math.round(((parseFloat(turnoverRate) - yesterdayTurnoverRate) / yesterdayTurnoverRate) * 100)
      : 0

    // 按仓库分组
    const byWarehouse = Object.values(
      outboundItems.reduce<Record<string, WarehouseTurnover>>((acc, item) => {
        const warehouseId = item.order.warehouseId
        if (!acc[warehouseId]) {
          acc[warehouseId] = {
            warehouseId,
            totalOutbound: 0,
            inventoryCount: 0,
            totalInventory: 0,
          }
        }
        acc[warehouseId].totalOutbound += item.shippedQty
        return acc
      }, {})
    )

    // 为每个仓库计算库存数据
    inventoryRecords.forEach((record) => {
      const warehouse = byWarehouse.find((w) => w.warehouseId === record.warehouseId)
      if (warehouse) {
        warehouse.totalInventory += record.quantity
        warehouse.inventoryCount += 1
      }
    })

    // 计算每个仓库的周转率
    byWarehouse.forEach((warehouse) => {
      const avgInv = warehouse.inventoryCount > 0 ? warehouse.totalInventory / warehouse.inventoryCount : 0
      warehouse.turnoverRate = avgInv > 0 ? parseFloat((warehouse.totalOutbound / avgInv).toFixed(2)) : 0
    })

    // 按SKU分组
    const bySku = Object.values(
      outboundItems.reduce<Record<string, SkuTurnover>>((acc, item) => {
        const skuId = item.skuId
        if (!acc[skuId]) {
          acc[skuId] = {
            skuId,
            skuCode: item.sku.skuCode,
            skuName: item.sku.skuName,
            totalOutbound: 0,
            inventoryCount: 0,
            totalInventory: 0,
          }
        }
        acc[skuId].totalOutbound += item.shippedQty
        return acc
      }, {})
    )

    // 为每个SKU计算库存数据
    inventoryRecords.forEach((record) => {
      const sku = bySku.find((s) => s.skuId === record.skuId)
      if (sku) {
        sku.totalInventory += record.quantity
        sku.inventoryCount += 1
      }
    })

    // 计算每个SKU的周转率
    bySku.forEach((sku) => {
      const avgInv = sku.inventoryCount > 0 ? sku.totalInventory / sku.inventoryCount : 0
      sku.turnoverRate = avgInv > 0 ? parseFloat((sku.totalOutbound / avgInv).toFixed(2)) : 0
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

    const byTime = Object.values(
      outboundItems.reduce<Record<string, TimeTurnover>>((acc, item) => {
        const timeKey = formatDate(item.order.updatedAt!)
        if (!acc[timeKey]) {
          acc[timeKey] = {
            time: timeKey,
            totalOutbound: 0,
          }
        }
        acc[timeKey].totalOutbound += item.shippedQty
        return acc
      }, {})
    )

    return NextResponse.json({
      turnoverRate,
      turnoverRateTrend,
      totalOutbound,
      avgInventory: Math.round(avgInventory),
      byWarehouse,
      bySku,
      byTime,
    })
  } catch (error) {
    console.error('Error fetching inventory turnover rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
