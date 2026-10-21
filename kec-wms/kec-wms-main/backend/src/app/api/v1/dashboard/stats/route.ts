import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { endOfDay,format,startOfDay,subDays } from '@/lib/utils/date-formatter'
import { NextResponse } from 'next/server'

/**
 * GET /api/v1/dashboard/stats
 * 获取仪表板统计数据
 */
export const GET = createAuthHandler(async (_request, auth) => {
  try {
    const tenantId = auth.user.tenantId
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // 获取最近7天的日期范围
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i)
      return {
        date: format(date, 'yyyy-MM-dd'),
        start: startOfDay(date),
        end: endOfDay(date),
      }
    })

    // 并行查询所有统计数据
    const [
      todayInboundCount,
      todayOutboundCount,
      totalInventory,
      pendingOrdersCount,
      recentAsns,
      recentOrders,
      inventoryAlerts,
      lowStockCount,
    ] = await Promise.all([
      // 今日入库（ASN）- 今天完成的ASN数量
      prisma.asn.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          completedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      // 今日出库 - 今天发货的订单数量（使用timeline.checkedOutAt）
      prisma.outboundOrder.count({
        where: {
          tenantId,
          status: 'SHIPPED',
          timeline: {
            checkedOutAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      }),

      // 库存总量 - AVAILABLE桶的总数量
      prisma.inventoryBucket.aggregate({
        where: {
          tenantId,
          bucketType: 'AVAILABLE',
        },
        _sum: {
          quantity: true,
        },
      }),

      // 待处理订单 - CREATED/PENDING/ALLOCATED状态的订单
      prisma.outboundOrder.count({
        where: {
          tenantId,
          status: {
            in: ['CREATED', 'PENDING', 'ALLOCATED', 'PENDING_WAVE'],
          },
        },
      }),

      // 最近5条ASN
      prisma.asn.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          asnNumber: true,
          status: true,
          createdAt: true,
          client: {
            select: {
              clientName: true,
            },
          },
        },
      }),

      // 最近5条出库订单
      prisma.outboundOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          client: {
            select: {
              clientName: true,
            },
          },
        },
      }),

      // 库存预警数量
      prisma.inventoryAlert.count({
        where: {
          tenantId,
          status: 'ACTIVE',
        },
      }),

      // 低库存SKU数量 - 暂时返回0，需要后续优化
      Promise.resolve(0),
    ])

    // 获取最近7天的入库和出库趋势
    const trendData = await Promise.all(
      last7Days.map(async ({ date, start, end }) => {
        const [inboundCount, outboundCount] = await Promise.all([
          prisma.asn.count({
            where: {
              tenantId,
              status: 'COMPLETED',
              completedAt: {
                gte: start,
                lte: end,
              },
            },
          }),
          prisma.outboundOrder.count({
            where: {
              tenantId,
              status: 'SHIPPED',
              timeline: {
                checkedOutAt: {
                  gte: start,
                  lte: end,
                },
              },
            },
          }),
        ])
        return {
          date,
          inbound: inboundCount,
          outbound: outboundCount,
        }
      })
    )

    // 构建响应数据
    const stats = {
      // 核心指标
      metrics: {
        todayInbound: todayInboundCount,
        todayOutbound: todayOutboundCount,
        totalInventory: totalInventory._sum.quantity || 0,
        pendingOrders: pendingOrdersCount,
      },
      // 预警信息
      alerts: {
        inventoryAlerts: inventoryAlerts,
        lowStockCount: lowStockCount,
      },
      // 最近活动
      recentActivities: {
        asns: recentAsns,
        orders: recentOrders,
      },
      // 趋势数据
      trends: trendData,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    // 记录详细错误信息以便调试
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
