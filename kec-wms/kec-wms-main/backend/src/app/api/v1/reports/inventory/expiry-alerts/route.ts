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
      expiryDate: { not: null },
      totalOnHand: { gt: 0 },
    }
    if (warehouseId) where.warehouseId = warehouseId

    const today = new Date()
    // Get inventory snapshots with expiry dates
    const inventorySnapshots = await prismaRead.inventorySnapshot.findMany({
      where,
      select: {
        id: true,
        expiryDate: true,
        totalOnHand: true,
        batchNumber: true,
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
        warehouse: {
          select: {
            warehouseName: true,
          },
        },
      },
    })

    // Calculate expiry buckets
    let expired = 0
    let expiring7Days = 0
    let expiring30Days = 0
    let expiring90Days = 0

    const expiryItems: Array<{
      skuCode: string
      skuName: string
      batchNumber: string | null
      expiryDate: string
      daysToExpiry: number
      quantity: number
      location: string
      warehouse: string
    }> = []

    inventorySnapshots.forEach((item) => {
      if (!item.expiryDate) return

      const expiryDate = new Date(item.expiryDate)
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const qty = item.totalOnHand || 0

      if (daysToExpiry < 0) {
        expired += qty
      } else if (daysToExpiry <= 7) {
        expiring7Days += qty
      } else if (daysToExpiry <= 30) {
        expiring30Days += qty
      } else if (daysToExpiry <= 90) {
        expiring90Days += qty
      }

      // Add to list if expiring within 90 days or expired
      if (daysToExpiry <= 90) {
        expiryItems.push({
          skuCode: item.sku.skuCode,
          skuName: item.sku.skuName,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate.toISOString().split('T')[0],
          daysToExpiry,
          quantity: qty,
          location: item.location?.locationCode || '',
          warehouse: item.warehouse?.warehouseName || '',
        })
      }
    })

    // Sort by days to expiry (most urgent first)
    expiryItems.sort((a, b) => a.daysToExpiry - b.daysToExpiry)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          expired,
          expiring7Days,
          expiring30Days,
          expiring90Days,
        },
        distribution: [
          { range: 'expired', quantity: expired },
          { range: '7days', quantity: expiring7Days },
          { range: '30days', quantity: expiring30Days },
          { range: '90days', quantity: expiring90Days },
        ],
        items: expiryItems.slice(0, 50),
      },
    })
  } catch (error) {
    console.error('Expiry alerts report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expiry alerts report' },
      { status: 500 }
    )
  }
})
