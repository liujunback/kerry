import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { BucketType } from '@/lib/services/inventory-event-service'
import { TransferStatus } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// POST /api/v1/inventory/transfers/[id]/submit
export const POST = createAuthHandler(async (request, { user }, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(user)

  const transfer = await prisma.inventoryTransfer.findFirst({
    where: {
      id,
      tenantId: user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
    include: { lines: true },
  })

  if (!transfer) {
    return NextResponse.json(
      { error: 'Transfer not found' },
      { status: 404 }
    )
  }

  if (transfer.status !== TransferStatus.DRAFT) {
    return NextResponse.json(
      { error: 'Only draft transfers can be submitted' },
      { status: 400 }
    )
  }

  if (transfer.lines.length === 0) {
    return NextResponse.json(
      { error: 'Transfer must have at least one line' },
      { status: 400 }
    )
  }

  for (const line of transfer.lines) {
    const sourceBucket = await prisma.inventoryBucket.findFirst({
      where: {
        tenantId: user.tenantId,
        warehouseId: transfer.warehouseId,
        skuId: line.skuId,
        locationId: line.sourceLocationId,
        batchNumber: line.batchNumber || undefined,
        bucketType: BucketType.AVAILABLE,
      },
    })

    if (!sourceBucket || sourceBucket.quantity < line.quantity) {
      return NextResponse.json(
        { error: 'Insufficient quantity in source location' },
        { status: 400 }
      )
    }
  }

  const updatedTransfer = await prisma.inventoryTransfer.update({
    where: { id },
    data: {
      status: TransferStatus.PENDING,
    },
  })

  return NextResponse.json({ data: updatedTransfer })
})
