import { prisma, type PrismaWriteClient, type TransactionClient } from '@/lib/db/prisma'

type InventoryClient = PrismaWriteClient | TransactionClient

type AdjustmentLineLike = {
  inventoryId?: string
  skuId: string
  locationId?: string
  fromLocationId?: string
  batchNumber?: string
  lpn?: string
  asnNumber?: string
  expiryDate?: string | Date | null
  bucketType?: string
  fromBucketType?: string
}

type ResolvedAdjustmentSourceBucket = {
  id: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  batchNumber: string
  lpn: string
  asnNumber: string
  expiryDate: Date | null
  productionDate: Date | null
  bucketType: string
  quantity: number
}

function normalizeAsnNumber(asnNumber: string | undefined, hasExplicitAsnNumber: boolean) {
  if (!hasExplicitAsnNumber) return undefined
  return asnNumber?.trim() || ''
}

function normalizeDate(date: string | Date | null | undefined) {
  if (!date) return null

  const normalized = date instanceof Date ? new Date(date) : new Date(date)
  if (Number.isNaN(normalized.getTime())) return null
  return normalized
}

export async function resolveAdjustmentSourceBucket(params: {
  client?: InventoryClient
  tenantId: string
  warehouseId: string
  line: AdjustmentLineLike
}): Promise<ResolvedAdjustmentSourceBucket | null> {
  const client = params.client || prisma
  const { line } = params

  const sourceLocationId = line.locationId || line.fromLocationId || ''
  const sourceBucketType = line.bucketType || line.fromBucketType || 'AVAILABLE'
  const normalizedBatchNumber = line.batchNumber || ''
  const normalizedLpn = line.lpn || ''
  const normalizedExpiryDate = normalizeDate(line.expiryDate)
  const hasExplicitAsnNumber = Object.prototype.hasOwnProperty.call(line, 'asnNumber')
  const normalizedAsnNumber = normalizeAsnNumber(line.asnNumber, hasExplicitAsnNumber)

  const select = {
    id: true,
    clientId: true,
    warehouseId: true,
    locationId: true,
    skuId: true,
    batchNumber: true,
    lpn: true,
    asnNumber: true,
    expiryDate: true,
    productionDate: true,
    bucketType: true,
    quantity: true,
  } as const

  if (sourceLocationId && line.skuId) {
    const baseWhere = {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      skuId: line.skuId,
      locationId: sourceLocationId,
      batchNumber: normalizedBatchNumber,
      lpn: normalizedLpn,
      expiryDate: normalizedExpiryDate,
      bucketType: sourceBucketType,
    }

    if (normalizedAsnNumber !== undefined) {
      const exactBucket = await client.inventoryBucket.findFirst({
        where: {
          ...baseWhere,
          asnNumber: normalizedAsnNumber,
        },
        select,
      })

      if (exactBucket) {
        return exactBucket
      }
    } else {
      const candidates = await client.inventoryBucket.findMany({
        where: baseWhere,
        select,
        take: 2,
      })

      if (candidates.length > 1) {
        throw new Error(`ADJUSTMENT_SOURCE_AMBIGUOUS:存在多个来源库存桶，请指定 ASN number。SKU: ${line.skuId}`)
      }

      if (candidates.length === 1) {
        return candidates[0]
      }
    }
  }

  if (!line.inventoryId) {
    return null
  }

  return client.inventoryBucket.findFirst({
    where: {
      id: line.inventoryId,
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
    },
    select,
  })
}
