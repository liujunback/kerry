import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const lookupSchema = z.object({
  locationCode: z.string().trim().min(1, '库位不能为空'),
  skuOrBarcode: z.string().trim().min(1, 'SKU/Barcode不能为空'),
})

const PDA_ADJUSTABLE_BUCKET_TYPES = [
  'AVAILABLE',
  'DEFECTIVE',
  'FROZEN',
  'QC_HOLD',
  'COUNT_HOLD',
] as const

export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const parseResult = lookupSchema.safeParse({
      locationCode: searchParams.get('locationCode') || '',
      skuOrBarcode: searchParams.get('skuOrBarcode') || '',
    })

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.errors[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const { locationCode, skuOrBarcode } = parseResult.data

    const location = await prisma.binLocation.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        locationCode,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      select: {
        id: true,
        locationCode: true,
        warehouseId: true,
      },
    })

    if (!location) {
      return NextResponse.json(
        { success: false, message: '库位不存在', code: 'LOCATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    const sku = await prisma.sku.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        status: 'ACTIVE',
        OR: [
          { skuCode: skuOrBarcode },
          { barcode: skuOrBarcode },
        ],
      },
      select: {
        id: true,
        skuCode: true,
        skuName: true,
        barcode: true,
      },
    })

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU不存在', code: 'SKU_NOT_FOUND' },
        { status: 404 }
      )
    }

    const buckets = await prisma.inventoryBucket.findMany({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId: location.warehouseId,
        locationId: location.id,
        skuId: sku.id,
        quantity: { gt: 0 },
        bucketType: { in: [...PDA_ADJUSTABLE_BUCKET_TYPES] },
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
      },
      orderBy: [
        { asnNumber: 'asc' },
        { expiryDate: 'asc' },
        { batchNumber: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    if (buckets.length === 0) {
      return NextResponse.json(
        { success: false, message: '当前库位没有可调整库存', code: 'INVENTORY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const matches = buckets.map((bucket) => ({
      inventoryId: bucket.id,
      skuId: bucket.skuId,
      skuCode: bucket.skuCode,
      locationId: bucket.locationId,
      locationCode: location.locationCode,
      clientId: bucket.clientId,
      quantity: bucket.quantity,
      bucketType: bucket.bucketType,
      asnNumber: bucket.asnNumber,
      batchNumber: bucket.batchNumber,
      lpn: bucket.lpn,
      expiryDate: bucket.expiryDate,
      client: bucket.client
        ? {
            id: bucket.client.id,
            clientCode: bucket.client.clientCode,
            clientName: bucket.client.clientName,
          }
        : null,
    }))

    const distinctAsnCount = new Set(
      buckets.map((bucket) => bucket.asnNumber || '_')
    ).size

    return NextResponse.json({
      success: true,
      data: {
        location: {
          id: location.id,
          locationCode: location.locationCode,
          warehouseId: location.warehouseId,
        },
        sku: {
          id: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          barcode: sku.barcode,
        },
        matches,
        selectedInventoryId: matches.length === 1 ? matches[0].inventoryId : null,
        hasMultipleMatches: matches.length > 1,
        hasMultipleAsn: distinctAsnCount > 1,
      },
    })
  } catch (error) {
    console.error('PDA库存调整查询失败:', error)
    return NextResponse.json(
      { success: false, message: '库存查询失败' },
      { status: 500 }
    )
  }
})
