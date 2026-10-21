import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      totalOnHand: { gt: 0 },
    }
    if (warehouseId) where.warehouseId = warehouseId

    // Get all inventory snapshots with received date for aging calculation
    const inventorySnapshots = await prismaRead.inventorySnapshot.findMany({
      where,
      select: {
        id: true,
        totalOnHand: true,
        receivedDate: true,
        fifoDate: true,
        sku: {
          select: {
            skuCode: true,
            skuName: true,
          },
        },
        location: {
          select: {
            locationCode: true,
          },
        },
      },
    })

    // Calculate aging days for each item based on receivedDate or fifoDate
    const now = new Date()
    const inventoryWithAging = inventorySnapshots.map((item) => {
      const baseDate = item.receivedDate || item.fifoDate || now
      const agingDays = Math.floor((now.getTime() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24))
      return {
        ...item,
        agingDays: Math.max(0, agingDays),
      }
    })

    // Calculate aging buckets
    const buckets = {
      '0-30': { count: 0, quantity: 0 },
      '31-60': { count: 0, quantity: 0 },
      '61-90': { count: 0, quantity: 0 },
      '90+': { count: 0, quantity: 0 },
    }

    let totalAgingDays = 0
    let totalItems = 0
    let maxAgingDays = 0

    inventoryWithAging.forEach((item) => {
      const days = item.agingDays
      const qty = item.totalOnHand || 0

      totalAgingDays += days * qty
      totalItems += qty
      if (days > maxAgingDays) maxAgingDays = days

      if (days <= 30) {
        buckets['0-30'].count++
        buckets['0-30'].quantity += qty
      } else if (days <= 60) {
        buckets['31-60'].count++
        buckets['31-60'].quantity += qty
      } else if (days <= 90) {
        buckets['61-90'].count++
        buckets['61-90'].quantity += qty
      } else {
        buckets['90+'].count++
        buckets['90+'].quantity += qty
      }
    })

    const averageAge = totalItems > 0 ? Math.round(totalAgingDays / totalItems) : 0

    // Get top aging items (90+ days)
    const topAgingItems = inventoryWithAging
      .filter((item) => item.agingDays > 90)
      .sort((a, b) => b.agingDays - a.agingDays)
      .slice(0, 10)
      .map((item) => ({
        skuCode: item.sku.skuCode,
        skuName: item.sku.skuName,
        agingDays: item.agingDays,
        quantity: item.totalOnHand || 0,
        location: item.location?.locationCode || '',
      }))

    const totalQuantity = Object.values(buckets).reduce((sum, b) => sum + b.quantity, 0)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalItems: inventoryWithAging.length,
          averageAge,
          maxAgingDays,
        },
        buckets: [
          {
            range: '0-30',
            quantity: buckets['0-30'].quantity,
            percentage: totalQuantity > 0 ? Math.round((buckets['0-30'].quantity / totalQuantity) * 100) : 0,
          },
          {
            range: '31-60',
            quantity: buckets['31-60'].quantity,
            percentage: totalQuantity > 0 ? Math.round((buckets['31-60'].quantity / totalQuantity) * 100) : 0,
          },
          {
            range: '61-90',
            quantity: buckets['61-90'].quantity,
            percentage: totalQuantity > 0 ? Math.round((buckets['61-90'].quantity / totalQuantity) * 100) : 0,
          },
          {
            range: '90+',
            quantity: buckets['90+'].quantity,
            percentage: totalQuantity > 0 ? Math.round((buckets['90+'].quantity / totalQuantity) * 100) : 0,
          },
        ],
        topAgingItems,
      },
    })
  } catch (error) {
    console.error('Aging analysis report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch aging analysis report' },
      { status: 500 }
    )
  }
})
