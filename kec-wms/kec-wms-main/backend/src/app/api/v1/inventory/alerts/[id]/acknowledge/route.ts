import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { AlertStatus } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// POST /api/v1/inventory/alerts/[id]/acknowledge
export const POST = createAuthHandler(async (request, { user }, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(user)

  const alert = await prisma.inventoryAlert.findFirst({
    where: {
      id,
      tenantId: user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
  })

  if (!alert) {
    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    )
  }

  if (alert.status !== AlertStatus.ACTIVE) {
    return NextResponse.json(
      { error: 'Only active alerts can be acknowledged' },
      { status: 400 }
    )
  }

  const updatedAlert = await prisma.inventoryAlert.update({
    where: { id },
    data: {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedByUserId: user.id,
      acknowledgedAt: new Date(),
    },
    include: {
      warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      sku: { select: { id: true, skuCode: true, skuName: true } },
    },
  })

  return NextResponse.json({ data: updatedAlert })
})
