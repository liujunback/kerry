import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/inventory/alerts/[id]
export const GET = createAuthHandler(async (request, { user }, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(user)

  const alert = await prisma.inventoryAlert.findFirst({
    where: {
      id,
      tenantId: user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
    include: {
      warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      sku: { select: { id: true, skuCode: true, skuName: true } },
      acknowledgedByUser: { select: { id: true, fullName: true } },
    },
  })

  if (!alert) {
    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: alert })
})
