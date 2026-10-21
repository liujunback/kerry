import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { subDays, startOfDay, endOfDay } from '@/lib/utils/date-formatter'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const tenantId = auth.user.tenantId

    // Default to last 30 days
    const start = startDate ? startOfDay(new Date(startDate)) : subDays(new Date(), 29)
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())

    const asnWhere: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: start, lte: end },
    }
    if (warehouseId) asnWhere.warehouseId = warehouseId
    if (clientId) asnWhere.clientId = clientId

    // Get ASN items with discrepancies (where receivedQty != expectedQty)
    const asnItems = await prismaRead.asnLine.findMany({
      where: {
        asn: asnWhere,
      },
      include: {
        asn: {
          select: {
            asnNumber: true,
            warehouseId: true,
          },
        },
        sku: {
          select: {
            skuCode: true,
            skuName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Calculate discrepancy types and statistics
    const items = asnItems
      .filter((item) => item.receivedQty !== item.expectedQty) // Filter discrepancies
      .map((item) => {
      const variance = item.receivedQty - item.expectedQty
      let type = 'OTHER'

      if (variance < 0) {
        type = 'SHORTAGE'
      } else if (variance > 0) {
        type = 'OVERAGE'
      }

      return {
        asnNumber: item.asn.asnNumber,
        skuCode: item.sku.skuCode,
        skuName: item.sku.skuName,
        type,
        expectedQty: item.expectedQty,
        actualQty: item.receivedQty,
        varianceQty: variance,
        status: 'REPORTED',
      }
    })

    // Group by type
    const typeMap = new Map<string, { count: number; variance: number }>()
    items.forEach((item) => {
      const existing = typeMap.get(item.type) || { count: 0, variance: 0 }
      typeMap.set(item.type, {
        count: existing.count + 1,
        variance: existing.variance + Math.abs(item.varianceQty),
      })
    })

    const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      variance: data.variance,
    }))

    // Calculate summary
    const totalDiscrepancies = items.length
    const totalVariance = items.reduce((sum, item) => sum + Math.abs(item.varianceQty), 0)

    // Get total ASN items for rate calculation
    const totalAsnItems = await prismaRead.asnLine.count({
      where: { asn: asnWhere },
    })

    const discrepancyRate = totalAsnItems > 0
      ? Math.round((totalDiscrepancies / totalAsnItems) * 100)
      : 0

    // Get yesterday's data for comparison
    const yesterdayWhere = {
      ...asnWhere,
      createdAt: {
        gte: startOfDay(subDays(new Date(), 1)),
        lte: endOfDay(subDays(new Date(), 1)),
      },
    }
    // Filter for discrepancies in yesterday's data
    const yesterdayDiscrepancies = await prismaRead.asnLine.findMany({
      where: {
        asn: yesterdayWhere,
      },
      select: {
        receivedQty: true,
        expectedQty: true,
      },
    })
    const yesterdayDiscrepancyCount = yesterdayDiscrepancies.filter(
      (item) => item.receivedQty !== item.expectedQty
    ).length

    const discrepanciesTrend = yesterdayDiscrepancyCount > 0
      ? Math.round(((totalDiscrepancies - yesterdayDiscrepancyCount) / yesterdayDiscrepancyCount) * 100)
      : 0

    // Group by warehouse
    const warehouseMap = new Map<string, { count: number; variance: number }>()
    items.forEach((item) => {
      const warehouseId = asnItems.find(i => i.asn.asnNumber === item.asnNumber)?.asn.warehouseId
      if (warehouseId) {
        const existing = warehouseMap.get(warehouseId) || { count: 0, variance: 0 }
        warehouseMap.set(warehouseId, {
          count: existing.count + 1,
          variance: existing.variance + Math.abs(item.varianceQty),
        })
      }
    })

    const byWarehouse = await Promise.all(
      Array.from(warehouseMap.entries()).map(async ([warehouseId, data]) => {
        const warehouse = await prismaRead.warehouse.findUnique({
          where: { id: warehouseId },
          select: { warehouseName: true },
        })
        return {
          warehouse: warehouse?.warehouseName || 'Unknown',
          warehouseId,
          count: data.count,
          variance: data.variance,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDiscrepancies,
          discrepanciesTrend,
          totalVariance,
          discrepancyRate,
        },
        byType,
        byWarehouse,
        items,
      },
    })
  } catch (error) {
    console.error('Discrepancies report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discrepancies report' },
      { status: 500 }
    )
  }
})
