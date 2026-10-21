import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { alertListQuerySchema, AlertSeverity, AlertStatus, AlertType } from '@/lib/validations/inventory'
import { NextRequest, NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/inventory/alerts
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = alertListQuerySchema.parse(searchParams)
    const warehouseId = resolveScopedWarehouseId(auth.user, query.warehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (warehouseId) where.warehouseId = warehouseId
    if (query.status) where.status = query.status
    if (query.alertType) where.alertType = query.alertType
    if (query.severity) where.severity = query.severity
    if (query.search) {
      where.OR = [
        { sku: { skuCode: { contains: query.search } } },
        { sku: { skuName: { contains: query.search } } },
      ]
    }

    const [alerts, total] = await Promise.all([
      prisma.inventoryAlert.findMany({
        where,
        include: {
          warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
          sku: { select: { id: true, skuCode: true, skuName: true } },
          acknowledgedByUser: { select: { id: true, fullName: true } },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.inventoryAlert.count({ where }),
    ])

    const stats = await prisma.inventoryAlert.groupBy({
      by: ['severity'],
      where: {
        tenantId: auth.user.tenantId,
        ...(warehouseId ? { warehouseId } : {}),
        status: AlertStatus.ACTIVE,
      },
      _count: true,
    })

    const severityCounts = {
      critical: stats.find((s) => s.severity === AlertSeverity.CRITICAL)?._count || 0,
      warning: stats.find((s) => s.severity === AlertSeverity.WARNING)?._count || 0,
      info: stats.find((s) => s.severity === AlertSeverity.INFO)?._count || 0,
      low: stats.find((s) => s.severity === AlertSeverity.LOW)?._count || 0,
    }

    return NextResponse.json({
      data: alerts,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      stats: severityCounts,
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
})

// POST /api/v1/inventory/alerts
export const POST = createAuthHandler(async (_request, auth) => {
  try {
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const inventorySummaries = await prisma.skuInventorySummary.findMany({
      where: {
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        sku: {
          select: {
            id: true,
            skuCode: true,
            skuName: true,
          },
        },
        warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      },
    })

    const alerts: Array<{
      tenantId: string
      warehouseId: string
      skuId: string
      alertType: string
      severity: string
      message: string
      threshold: number | null
      currentQuantity: number
    }> = []

    for (const summary of inventorySummaries) {
      if (summary.qtyAvailable === 0) {
        alerts.push({
          tenantId: summary.tenantId,
          warehouseId: summary.warehouseId,
          skuId: summary.skuId,
          alertType: AlertType.OUT_OF_STOCK,
          severity: AlertSeverity.CRITICAL,
          message: `SKU ${summary.sku?.skuCode} 在 ${summary.warehouse?.warehouseName} 已缺货`,
          threshold: 0,
          currentQuantity: summary.qtyAvailable,
        })
      }
    }

    const nearExpiryDate = new Date()
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 30)

    const nearExpiryInventory = await prisma.inventoryBucket.findMany({
      where: {
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        expiryDate: {
          lte: nearExpiryDate,
          gt: new Date(),
        },
        quantity: { gt: 0 },
        bucketType: 'AVAILABLE',
      },
      include: {
        sku: { select: { id: true, skuCode: true, skuName: true } },
        warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      },
    })

    for (const inv of nearExpiryInventory) {
      alerts.push({
        tenantId: inv.tenantId,
        warehouseId: inv.warehouseId,
        skuId: inv.skuId,
        alertType: AlertType.NEAR_EXPIRY,
        severity: AlertSeverity.WARNING,
        message: `SKU ${inv.sku?.skuCode} 在 ${inv.warehouse?.warehouseName} 即将过期`,
        threshold: null,
        currentQuantity: inv.quantity,
      })
    }

    const expiredInventory = await prisma.inventoryBucket.findMany({
      where: {
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        expiryDate: { lte: new Date() },
        quantity: { gt: 0 },
        bucketType: 'AVAILABLE',
      },
      include: {
        sku: { select: { id: true, skuCode: true, skuName: true } },
        warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      },
    })

    for (const inv of expiredInventory) {
      alerts.push({
        tenantId: inv.tenantId,
        warehouseId: inv.warehouseId,
        skuId: inv.skuId,
        alertType: AlertType.EXPIRED,
        severity: AlertSeverity.CRITICAL,
        message: `SKU ${inv.sku?.skuCode} 在 ${inv.warehouse?.warehouseName} 已过期`,
        threshold: null,
        currentQuantity: inv.quantity,
      })
    }

    let created = 0
    for (const alert of alerts) {
      const existing = await prisma.inventoryAlert.findFirst({
        where: {
          tenantId: alert.tenantId,
          warehouseId: alert.warehouseId,
          skuId: alert.skuId,
          alertType: alert.alertType,
          status: AlertStatus.ACTIVE,
        },
      })

      if (!existing) {
        await prisma.inventoryAlert.create({
          data: {
            ...alert,
            status: AlertStatus.ACTIVE,
          },
        })
        created++
      }
    }

    return NextResponse.json({
      message: `Generated ${created} new alerts`,
      total: alerts.length,
      created,
    })
  } catch (error) {
    console.error('Error generating alerts:', error)
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    )
  }
})
