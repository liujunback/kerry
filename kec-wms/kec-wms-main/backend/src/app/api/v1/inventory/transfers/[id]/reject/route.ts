import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { TransferStatus } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
})

// POST /api/v1/inventory/transfers/[id]/reject
export const POST = createAuthHandler(async (request, { user }, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(user)
  const body = await request.json()
  const { reason } = rejectSchema.parse(body)

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
      { error: 'Only pending transfers can be rejected' },
      { status: 400 }
    )
  }

  const updatedTransfer = await prisma.inventoryTransfer.update({
    where: { id },
    data: {
      status: TransferStatus.REJECTED,
      rejectedByUserId: user.id,
      rejectedAt: new Date(),
      rejectReason: reason,
    },
  })

  return NextResponse.json({ data: updatedTransfer })
})
