import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { TransferStatus } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// POST /api/v1/inventory/transfers/[id]/approve
export const POST = createAuthHandler(async (request, { user }, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(user)

  const transfer = await prisma.inventoryTransfer.findFirst({
    where: {
      id,
      tenantId: user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
  })

  if (!transfer) {
    return NextResponse.json(
      { error: 'Transfer not found' },
      { status: 404 }
    )
  }

  if (transfer.status !== TransferStatus.PENDING) {
    return NextResponse.json(
      { error: 'Only pending transfers can be approved' },
      { status: 400 }
    )
  }

  const updatedTransfer = await prisma.inventoryTransfer.update({
    where: { id },
    data: {
      status: TransferStatus.APPROVED,
      approvedByUserId: user.id,
      approvedAt: new Date(),
    },
  })

  return NextResponse.json({ data: updatedTransfer })
})
