import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { BucketType } from '@/lib/services/inventory-event-service'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/inventory/freezes/[id] - 获取冻结库存详情
export const GET = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

  const bucket = await prisma.inventoryBucket.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
    include: {
      warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      sku: { select: { id: true, skuCode: true, skuName: true } },
      location: { select: { id: true, locationCode: true } },
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

  return NextResponse.json({ data: bucket })
})
