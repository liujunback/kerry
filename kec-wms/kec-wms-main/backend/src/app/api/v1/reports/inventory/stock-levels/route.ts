import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const zoneId = searchParams.get('zoneId')
    const clientId = searchParams.get('clientId')

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }
    if (warehouseId) where.warehouseId = warehouseId
    if (zoneId) where.zoneId = zoneId
    if (clientId) where.clientId = clientId

    // Get summary totals
    const totals = await prismaRead.skuInventorySummary.aggregate({
      where,
      _sum: {
        qtyAvailable: true,
        qtyAllocated: true,
        qtyFrozen: true,
        totalOnHand: true,
      },
      _count: {
        skuId: true,
      },
    })

    // Get breakdown by warehouse
    const byWarehouse = await prismaRead.skuInventorySummary.groupBy({
      by: ['warehouseId'],
      where,
      _sum: {
        qtyAvailable: true,
        qtyAllocated: true,
        qtyFrozen: true,
        totalOnHand: true,
      },
      _count: {
        skuId: true,
      },
    })

    // Get warehouse names
    const warehouseIds = byWarehouse.map((w) => w.warehouseId)
    const warehouses = await prismaRead.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, warehouseName: true, warehouseCode: true },
    })
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))

    const byWarehouseData = byWarehouse.map((w) => ({
      warehouseId: w.warehouseId,
      warehouseName: warehouseMap.get(w.warehouseId)?.warehouseName || 'Unknown',
      warehouseCode: warehouseMap.get(w.warehouseId)?.warehouseCode || '',
      available: w._sum.qtyAvailable || 0,
      reserved: w._sum.qtyAllocated || 0,
      frozen: w._sum.qtyFrozen || 0,
      total: w._sum.totalOnHand || 0,
      skuCount: w._count.skuId,
    }))

    // Get breakdown by client
    const byClient = await prismaRead.skuInventorySummary.groupBy({
      by: ['clientId'],
      where,
      _sum: {
        qtyAvailable: true,
        qtyAllocated: true,
        qtyFrozen: true,
        totalOnHand: true,
      },
      _count: {
        skuId: true,
      },
    })

    // Get client names
    const clientIds = byClient.map((c) => c.clientId)
    const clients = await prismaRead.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, clientName: true, clientCode: true },
    })
    const clientMap = new Map(clients.map((c) => [c.id, c]))

    const byClientData = byClient.map((c) => ({
      clientId: c.clientId,
      clientName: clientMap.get(c.clientId)?.clientName || 'Unknown',
      clientCode: clientMap.get(c.clientId)?.clientCode || '',
      available: c._sum.qtyAvailable || 0,
      reserved: c._sum.qtyAllocated || 0,
      frozen: c._sum.qtyFrozen || 0,
      total: c._sum.totalOnHand || 0,
      skuCount: c._count.skuId,
    }))

    // Get breakdown by zone - aggregate from InventoryBucket
    const byZoneRaw = await prismaRead.inventoryBucket.groupBy({
      by: ['zoneId', 'bucketType'],
      where: {
        tenantId: auth.user.tenantId,
        ...(warehouseId && { warehouseId }),
        ...(zoneId && { zoneId }),
        ...(clientId && { clientId }),
      },
      _sum: {
        quantity: true,
      },
      _count: {
        skuId: true,
      },
    })

    // Aggregate by zone and bucket type
    const zoneAggregates = new Map<string, { available: number; allocated: number; frozen: number; total: number; skuCount: number }>()

    for (const item of byZoneRaw) {
      if (item.bucketType === 'COUNT_SURPLUS' || item.bucketType === 'COUNT_SHORTAGE') {
        continue
      }
      if (!zoneAggregates.has(item.zoneId)) {
        zoneAggregates.set(item.zoneId, { available: 0, allocated: 0, frozen: 0, total: 0, skuCount: 0 })
      }
      const agg = zoneAggregates.get(item.zoneId)!
      const qty = item._sum.quantity || 0

      if (item.bucketType === 'AVAILABLE') agg.available += qty
      else if (item.bucketType === 'ALLOCATED') agg.allocated += qty
      else if (item.bucketType === 'FROZEN') agg.frozen += qty

      agg.total += qty
      agg.skuCount += item._count.skuId
    }

    const byZone = Array.from(zoneAggregates.entries()).map(([zoneId, data]) => ({
      zoneId,
      ...data,
    }))

    // Get zone names
    const zoneIds = byZone.map((z) => z.zoneId)
    const zones = await prismaRead.zone.findMany({
      where: { id: { in: zoneIds } },
      select: { id: true, zoneName: true, zoneCode: true },
    })
    const zoneMap = new Map(zones.map((z) => [z.id, z]))

    const byZoneData = byZone.map((z) => ({
      zoneId: z.zoneId,
      zoneName: zoneMap.get(z.zoneId)?.zoneName || 'Unknown',
      zoneCode: zoneMap.get(z.zoneId)?.zoneCode || '',
      available: z.available,
      reserved: z.allocated,
      frozen: z.frozen,
      total: z.total,
      skuCount: z.skuCount,
    }))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSku: totals._count.skuId,
          totalQuantity: totals._sum.totalOnHand || 0,
          available: totals._sum.qtyAvailable || 0,
          reserved: totals._sum.qtyAllocated || 0,
          frozen: totals._sum.qtyFrozen || 0,
        },
        byWarehouse: byWarehouseData,
        byZone: byZoneData,
        byClient: byClientData,
      },
    })
  } catch (error) {
    console.error('Stock levels report error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock levels report' },
      { status: 500 }
    )
  }
})
