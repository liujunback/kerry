import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { BucketType } from '@/lib/services/inventory-event-service'
import { extractInventoryCountLockMessage } from '@/lib/services/inventory-count-lock-guard'
import { unfreeze } from '@/lib/services/inventory-operation-service'
import { releaseFreezeSchema } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// POST /api/v1/inventory/freezes/[id]/release - 解冻
export const POST = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
  const body = await request.json()
  const data = releaseFreezeSchema.parse(body)

  // 获取冻结的库存桶
  const bucket = await prisma.inventoryBucket.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
    include: {
      sku: { select: { id: true, skuCode: true, skuName: true, clientId: true } },
      warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
    },
  })

  if (!bucket) {
    return NextResponse.json(
      { error: 'Frozen inventory not found' },
      { status: 404 }
    )
  }

  if (bucket.bucketType !== BucketType.FROZEN) {
    return NextResponse.json(
      { error: 'This is not a frozen inventory bucket' },
      { status: 400 }
    )
  }

  const releaseQty = data.quantity || bucket.quantity

  if (releaseQty > bucket.quantity) {
    return NextResponse.json(
      { error: 'Release quantity exceeds frozen quantity' },
      { status: 400 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      await unfreeze({
      tenantId: auth.user.tenantId,
      clientId: bucket.sku?.clientId || bucket.clientId,
      warehouseId: bucket.warehouseId,
      locationId: bucket.locationId,
      skuId: bucket.skuId,
      skuCode: bucket.sku?.skuCode || bucket.skuCode,
      quantity: releaseQty,
      batchNumber: bucket.batchNumber,
      lpn: bucket.lpn,
      asnNumber: bucket.asnNumber,
      expiryDate: bucket.expiryDate,
      reasonCode: data.releaseType,
      reasonDescription: data.reason,
      referenceType: 'UNFREEZE',
      operatorId: auth.user.id,
    }, tx)
    })
  } catch (error) {
    const countLockMessage = extractInventoryCountLockMessage(error)
    if (countLockMessage) {
      return NextResponse.json(
        { error: countLockMessage },
        { status: 400 }
      )
    }

    console.error('Error releasing freeze:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to release freeze' },
      { status: 500 }
    )
  }

  // 获取更新后的桶状态
  const updatedBucket = await prisma.inventoryBucket.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
    include: {
      warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      sku: { select: { id: true, skuCode: true, skuName: true } },
    },
  })

  return NextResponse.json({
    data: updatedBucket,
    message: `Released ${releaseQty} units from frozen inventory`,
  })
})
