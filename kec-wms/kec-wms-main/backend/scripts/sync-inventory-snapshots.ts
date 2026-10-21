/**
 * 同步库存快照脚本
 * 从 inventory_bucket 生成 inventory_snapshot 和 sku_inventory_summary
 *
 * 运行: npx tsx scripts/sync-inventory-snapshots.ts
 */

import { PrismaClient } from '@prisma/client'
import { BucketType } from '../src/lib/services/inventory-event-service'

const prisma = new PrismaClient()

async function syncSnapshots() {
  console.log('开始同步库存快照...')

  // 1. 获取所有有库存的桶
  const buckets = await prisma.inventoryBucket.findMany({
    where: { quantity: { gt: 0 } },
    select: {
      tenantId: true,
      clientId: true,
      warehouseId: true,
      zoneId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      bucketType: true,
      quantity: true,
      expiryDate: true,
      productionDate: true,
      fifoDate: true,
    },
  })

  console.log(`找到 ${buckets.length} 个库存桶`)

  // 2. 按库位+SKU+批次+LPN+到期日 聚合生成 InventorySnapshot
  const snapshotMap = new Map<string, {
    tenantId: string
    clientId: string
    warehouseId: string
    zoneId: string
    locationId: string
    skuId: string
    skuCode: string
    batchNumber: string | null
    lpn: string | null
    asnNumber: string | null
    expiryDate: Date | null
    productionDate: Date | null
    fifoDate: Date | null
    quantities: Record<string, number>
  }>()

  for (const bucket of buckets) {
    const key = `${bucket.locationId}:${bucket.skuId}:${bucket.batchNumber || ''}:${bucket.lpn || ''}:${bucket.expiryDate?.toISOString() || ''}:${bucket.asnNumber || ''}`

    if (!snapshotMap.has(key)) {
      snapshotMap.set(key, {
        tenantId: bucket.tenantId,
        clientId: bucket.clientId,
        warehouseId: bucket.warehouseId,
        zoneId: bucket.zoneId,
        locationId: bucket.locationId,
        skuId: bucket.skuId,
        skuCode: bucket.skuCode,
        batchNumber: bucket.batchNumber || null,
        lpn: bucket.lpn || null,
        asnNumber: bucket.asnNumber || null,
        expiryDate: bucket.expiryDate,
        productionDate: bucket.productionDate,
        fifoDate: bucket.fifoDate,
        quantities: {},
      })
    }

    const agg = snapshotMap.get(key)!
    agg.quantities[bucket.bucketType] = (agg.quantities[bucket.bucketType] || 0) + bucket.quantity
  }

  console.log(`聚合为 ${snapshotMap.size} 条快照记录`)

  // 3. 写入 InventorySnapshot
  let snapshotCount = 0
  for (const [, data] of snapshotMap) {
    const qtyAvailable = data.quantities[BucketType.AVAILABLE] || 0
    const qtyAllocated = data.quantities[BucketType.ALLOCATED] || 0
    const qtyPicking = data.quantities[BucketType.PICKING] || 0
    const qtyFrozen = data.quantities[BucketType.FROZEN] || 0
    const qtyDefective = data.quantities[BucketType.DEFECTIVE] || 0
    const qtyQcHold = data.quantities[BucketType.QC_HOLD] || 0
    const qtyCountHold = data.quantities[BucketType.COUNT_HOLD] || 0
    const totalOnHand = qtyAvailable + qtyAllocated + qtyPicking + qtyFrozen + qtyDefective + qtyQcHold + qtyCountHold

    await prisma.inventorySnapshot.upsert({
      where: {
        locationId_skuId_batchNumber_lpn_expiryDate_asnNumber: {
          locationId: data.locationId,
          skuId: data.skuId,
          batchNumber: data.batchNumber ?? '',
          lpn: data.lpn ?? '',
          expiryDate: data.expiryDate ?? new Date(0),
          asnNumber: data.asnNumber ?? '',
        },
      },
      create: {
        tenantId: data.tenantId,
        clientId: data.clientId,
        warehouseId: data.warehouseId,
        zoneId: data.zoneId,
        locationId: data.locationId,
        skuId: data.skuId,
        skuCode: data.skuCode,
        batchNumber: data.batchNumber ?? '',
        lpn: data.lpn ?? '',
        asnNumber: data.asnNumber ?? '',
        expiryDate: data.expiryDate,
        productionDate: data.productionDate,
        fifoDate: data.fifoDate,
        qtyAvailable,
        qtyAllocated,
        qtyPicking,
        qtyFrozen,
        qtyDefective,
        qtyQcHold,
        qtyCountHold,
        totalOnHand,
      },
      update: {
        qtyAvailable,
        qtyAllocated,
        qtyPicking,
        qtyFrozen,
        qtyDefective,
        qtyQcHold,
        qtyCountHold,
        totalOnHand,
      },
    })
    snapshotCount++
  }

  console.log(`已写入 ${snapshotCount} 条 InventorySnapshot`)

  // 4. 按仓库+客户+SKU 聚合生成 SkuInventorySummary
  const summaryMap = new Map<string, {
    tenantId: string
    clientId: string
    warehouseId: string
    skuId: string
    skuCode: string
    quantities: Record<string, number>
    locations: Set<string>
    earliestExpiry: Date | null
  }>()

  for (const bucket of buckets) {
    const key = `${bucket.warehouseId}:${bucket.clientId}:${bucket.skuId}`

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        tenantId: bucket.tenantId,
        clientId: bucket.clientId,
        warehouseId: bucket.warehouseId,
        skuId: bucket.skuId,
        skuCode: bucket.skuCode,
        quantities: {},
        locations: new Set(),
        earliestExpiry: null,
      })
    }

    const agg = summaryMap.get(key)!
    agg.quantities[bucket.bucketType] = (agg.quantities[bucket.bucketType] || 0) + bucket.quantity
    agg.locations.add(bucket.locationId)

    if (bucket.expiryDate) {
      if (!agg.earliestExpiry || bucket.expiryDate < agg.earliestExpiry) {
        agg.earliestExpiry = bucket.expiryDate
      }
    }
  }

  console.log(`聚合为 ${summaryMap.size} 条汇总记录`)

  // 5. 写入 SkuInventorySummary
  let summaryCount = 0
  for (const [, data] of summaryMap) {
    const qtyAvailable = data.quantities[BucketType.AVAILABLE] || 0
    const qtyAllocated = data.quantities[BucketType.ALLOCATED] || 0
    const qtyPicking = data.quantities[BucketType.PICKING] || 0
    const qtyFrozen = data.quantities[BucketType.FROZEN] || 0
    const qtyDefective = data.quantities[BucketType.DEFECTIVE] || 0
    const qtyQcHold = data.quantities[BucketType.QC_HOLD] || 0
    const qtyCountHold = data.quantities[BucketType.COUNT_HOLD] || 0
    const totalOnHand = qtyAvailable + qtyAllocated + qtyPicking + qtyFrozen + qtyDefective + qtyQcHold + qtyCountHold

    await prisma.skuInventorySummary.upsert({
      where: {
        warehouseId_clientId_skuId: {
          warehouseId: data.warehouseId,
          clientId: data.clientId,
          skuId: data.skuId,
        },
      },
      create: {
        tenantId: data.tenantId,
        clientId: data.clientId,
        warehouseId: data.warehouseId,
        skuId: data.skuId,
        skuCode: data.skuCode,
        qtyAvailable,
        qtyAllocated,
        qtyPicking,
        qtyFrozen,
        qtyDefective,
        totalOnHand,
        locationCount: data.locations.size,
        earliestExpiryDate: data.earliestExpiry,
      },
      update: {
        qtyAvailable,
        qtyAllocated,
        qtyPicking,
        qtyFrozen,
        qtyDefective,
        totalOnHand,
        locationCount: data.locations.size,
        earliestExpiryDate: data.earliestExpiry,
      },
    })
    summaryCount++
  }

  console.log(`已写入 ${summaryCount} 条 SkuInventorySummary`)
  console.log('同步完成!')
}

syncSnapshots()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
