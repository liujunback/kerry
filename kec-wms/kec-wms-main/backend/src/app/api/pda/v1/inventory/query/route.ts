import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const lookupSchema = z.object({
  locationCode: z.string().trim().optional().default(''),
  skuOrBarcode: z.string().trim().optional().default(''),
}).superRefine((value, ctx) => {
  if (!value.locationCode && !value.skuOrBarcode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '请至少输入SKU/Barcode或货位',
      path: ['skuOrBarcode'],
    })
  }
})

const PDA_QUERY_BUCKET_TYPES = [
  'AVAILABLE',
  'ALLOCATED',
  'PICKING',
  'DEFECTIVE',
  'FROZEN',
  'QC_HOLD',
  'COUNT_HOLD',
] as const

function formatDateKey(value: Date | string | null): string {
  if (!value) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return String(value).slice(0, 10)
}

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

    const location = locationCode
      ? await prismaRead.binLocation.findFirst({
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
      : null

    if (locationCode && !location) {
      return NextResponse.json(
        { success: false, message: '货位不存在', code: 'LOCATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    const sku = skuOrBarcode
      ? await prismaRead.sku.findFirst({
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
      : null

    if (skuOrBarcode && !sku) {
      return NextResponse.json(
        { success: false, message: 'SKU不存在', code: 'SKU_NOT_FOUND' },
        { status: 404 }
      )
    }

    const buckets = await prismaRead.inventoryBucket.findMany({
      where: {
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        ...(location ? { locationId: location.id } : {}),
        ...(sku ? { skuId: sku.id } : {}),
        quantity: { gt: 0 },
        bucketType: { in: [...PDA_QUERY_BUCKET_TYPES] },
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        location: {
          select: {
            id: true,
            locationCode: true,
            warehouseId: true,
          },
        },
        sku: {
          select: {
            id: true,
            skuCode: true,
            skuName: true,
            barcode: true,
          },
        },
      },
      orderBy: [
        { locationId: 'asc' },
        { skuId: 'asc' },
        { asnNumber: 'asc' },
        { expiryDate: 'asc' },
        { batchNumber: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    if (buckets.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有匹配库存', code: 'INVENTORY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const grouped = new Map<string, {
      client: {
        id: string
        clientCode: string
        clientName: string
      } | null
      locationCode: string
      skuCode: string
      skuName: string
      asnNumber: string
      expiryDate: Date | string | null
      batchNumber: string
      quantityAvailable: number
      quantityOccupied: number
      quantityDefective: number
      quantityFrozen: number
      totalQuantity: number
    }>()

    for (const bucket of buckets) {
      const expiryKey = formatDateKey(bucket.expiryDate)
      const key = [
        bucket.clientId || '',
        bucket.locationId,
        bucket.skuId,
        bucket.asnNumber || '',
        expiryKey,
        bucket.batchNumber || '',
      ].join(':')

      const current = grouped.get(key) || {
        client: bucket.client
          ? {
              id: bucket.client.id,
              clientCode: bucket.client.clientCode,
              clientName: bucket.client.clientName,
            }
          : null,
        locationCode: bucket.location?.locationCode || '',
        skuCode: bucket.sku?.skuCode || bucket.skuCode,
        skuName: bucket.sku?.skuName || '',
        asnNumber: bucket.asnNumber || '',
        expiryDate: bucket.expiryDate,
        batchNumber: bucket.batchNumber || '',
        quantityAvailable: 0,
        quantityOccupied: 0,
        quantityDefective: 0,
        quantityFrozen: 0,
        totalQuantity: 0,
      }

      switch (bucket.bucketType) {
        case 'AVAILABLE':
          current.quantityAvailable += bucket.quantity
          break
        case 'ALLOCATED':
        case 'PICKING':
          current.quantityOccupied += bucket.quantity
          break
        case 'DEFECTIVE':
          current.quantityDefective += bucket.quantity
          break
        case 'FROZEN':
        case 'QC_HOLD':
        case 'COUNT_HOLD':
          current.quantityFrozen += bucket.quantity
          break
      }

      current.totalQuantity =
        current.quantityAvailable +
        current.quantityOccupied +
        current.quantityDefective +
        current.quantityFrozen

      grouped.set(key, current)
    }

    const items = Array.from(grouped.values())
      .sort((left, right) => {
        return (
          left.locationCode.localeCompare(right.locationCode) ||
          left.skuCode.localeCompare(right.skuCode) ||
          (left.asnNumber || '').localeCompare(right.asnNumber || '') ||
          formatDateKey(left.expiryDate).localeCompare(formatDateKey(right.expiryDate)) ||
          (left.batchNumber || '').localeCompare(right.batchNumber || '')
        )
      })
      .map((item) => ({
        client: item.client,
        locationCode: item.locationCode,
        skuCode: item.skuCode,
        skuName: item.skuName,
        asnNumber: item.asnNumber,
        expiryDate: formatDateKey(item.expiryDate) || null,
        batchNumber: item.batchNumber,
        quantityAvailable: item.quantityAvailable,
        quantityOccupied: item.quantityOccupied,
        quantityDefective: item.quantityDefective,
        quantityFrozen: item.quantityFrozen,
        totalQuantity: item.totalQuantity,
      }))

    return NextResponse.json({
      success: true,
      data: {
        location: location
          ? {
              id: location.id,
              locationCode: location.locationCode,
              warehouseId: location.warehouseId,
            }
          : null,
        sku: sku
          ? {
              id: sku.id,
              skuCode: sku.skuCode,
              skuName: sku.skuName,
              barcode: sku.barcode,
            }
          : null,
        items,
        total: items.length,
      },
    })
  } catch (error) {
    console.error('PDA库存查询失败:', error)
    return NextResponse.json(
      { success: false, message: '库存查询失败' },
      { status: 500 }
    )
  }
})
