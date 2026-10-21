import { prisma, type TransactionClient } from '@/lib/db/prisma'
import { ship } from '@/lib/services/inventory-operation-service'
import { withBucketLock } from '@/lib/services/inventory-lock-service'

type AllocationDetailWithAsnNumber = {
  id: string
  bucketId: string
  locationId: string
  skuId: string
  batchNumber: string
  lpn: string
  asnNumber: string
  allocatedQty: number
  shippedQty: number
  status: string
  referenceLineId: string | null
}

export async function generateManifestNumber(
  tenantId: string,
  warehouseCode: string,
  channelCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
  const numberPrefix = `${warehouseCode}${channelCode}${dateStr}`

  const lastOrder = await prisma.manifestOrder.findFirst({
    where: {
      tenantId,
      manifestNumber: { startsWith: numberPrefix },
    },
    orderBy: { manifestNumber: 'desc' },
    select: { manifestNumber: true },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.manifestNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${numberPrefix}${sequence.toString().padStart(4, '0')}`
}

export async function findOrCreateManifestOrder(
  tenantId: string,
  warehouseId: string,
  warehouseCode: string,
  channelCode: string,
  channelName: string,
  userId: string
): Promise<string> {
  const existingManifest = await prisma.manifestOrder.findFirst({
    where: {
      tenantId,
      warehouseId,
      channelCode,
      status: { in: ['CREATED', 'IN_PROGRESS'] },
    },
  })

  if (existingManifest) {
    return existingManifest.id
  }

  const manifestNumber = await generateManifestNumber(tenantId, warehouseCode, channelCode)
  const newManifest = await prisma.manifestOrder.create({
    data: {
      tenantId,
      warehouseId,
      manifestNumber,
      channelCode,
      channelName,
      status: 'CREATED',
      createdBy: userId,
    },
  })

  return newManifest.id
}

export async function updateManifestOrderStats(manifestOrderId: string) {
  const stats = await prisma.checkoutOrder.aggregate({
    where: { manifestOrderId },
    _sum: {
      orderCount: true,
      parcelCount: true,
    },
    _count: true,
  })

  const weightResult = await prisma.outboundOrderExtension.aggregate({
    where: {
      order: {
        checkoutRecords: {
          some: {
            checkoutOrder: { manifestOrderId },
          },
        },
      },
    },
    _sum: { checkOutWeightKg: true },
  })
  const totalWeightKg = weightResult._sum.checkOutWeightKg

  await prisma.manifestOrder.update({
    where: { id: manifestOrderId },
    data: {
      orderCount: stats._sum.orderCount || 0,
      parcelCount: stats._sum.parcelCount || 0,
      containerCount: stats._count,
      status: 'IN_PROGRESS',
      totalWeightKg: totalWeightKg ?? undefined,
    },
  })
}

export async function shipOrderInTransaction(params: {
  tenantId: string
  orderId: string
  userId: string
  tx: TransactionClient
}) {
  const { tenantId, orderId, userId, tx } = params

  const order = await tx.outboundOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        where: {
          OR: [{ pickedQty: { gt: 0 } }, { packedQty: { gt: 0 } }],
        },
        include: { sku: true },
      },
    },
  })
  if (!order) return

  const allocations = await tx.allocationDetail.findMany({
    where: {
      referenceId: orderId,
      referenceType: 'OUTBOUND_ORDER',
      status: { in: ['ALLOCATED', 'PICKING', 'PICKED'] },
    },
  }) as AllocationDetailWithAsnNumber[]

  const allocationsByLine = new Map<string, typeof allocations>()
  for (const allocation of allocations) {
    const lineId = allocation.referenceLineId || ''
    if (!allocationsByLine.has(lineId)) {
      allocationsByLine.set(lineId, [])
    }
    allocationsByLine.get(lineId)!.push(allocation)
  }

  for (const line of order.lines) {
    const shipQty = line.packedQty > 0 ? line.packedQty : line.pickedQty
    if (shipQty <= 0) continue

    const lineAllocations = allocationsByLine.get(line.id) || []
    if (lineAllocations.length === 0) {
      console.warn(`[Checkout] 订单 ${order.orderNumber} 行 ${line.id} 没有分配记录，跳过库存扣减`)
      continue
    }

    for (const allocation of lineAllocations) {
      if (allocation.allocatedQty <= 0) continue

      const sourceBucketType = ['PICKING', 'PICKED'].includes(allocation.status) ? 'PICKING' : 'ALLOCATED'
      const bucket = await tx.inventoryBucket.findUnique({
        where: { id: allocation.bucketId },
        select: { expiryDate: true },
      })

      await withBucketLock(
        {
          tenantId,
          warehouseId: order.warehouseId,
          locationId: allocation.locationId,
          skuId: allocation.skuId,
          batchNumber: allocation.batchNumber,
          lpn: allocation.lpn,
          asnNumber: allocation.asnNumber || undefined,
          expiryDate: bucket?.expiryDate || undefined,
          bucketType: sourceBucketType,
        },
        async () => {
          await ship(
            {
              tenantId,
              clientId: order.clientId,
              warehouseId: order.warehouseId,
              locationId: allocation.locationId,
              skuId: allocation.skuId,
              skuCode: line.sku.skuCode,
              quantity: allocation.allocatedQty,
              batchNumber: allocation.batchNumber,
              lpn: allocation.lpn,
              asnNumber: allocation.asnNumber || undefined,
              expiryDate: bucket?.expiryDate || undefined,
              referenceType: 'OUTBOUND_ORDER',
              referenceId: orderId,
              referenceNumber: order.orderNumber,
              referenceLineId: line.id,
              operatorId: userId,
              sourceBucketType,
              skipBucketLocks: true,
            },
            tx
          )

          await tx.allocationDetail.update({
            where: { id: allocation.id },
            data: {
              shippedQty: allocation.allocatedQty,
              status: 'SHIPPED',
              shippedAt: new Date(),
            },
          })
        }
      )
    }
  }
}

export async function updateOrderWeightAndVolume(orderId: string, tenantId: string, tx?: TransactionClient) {
  const client = tx || prisma

  const shipments = await client.shipment.findMany({
    where: { orderId },
    select: { totalWeightKg: true },
  })

  const totalWeightKg = shipments.reduce((sum, shipment) => {
    return sum + (shipment.totalWeightKg ? Number(shipment.totalWeightKg) : 0)
  }, 0)

  const extension = await client.outboundOrderExtension.findUnique({
    where: { orderId },
    select: { recommendedPackagingModel: true },
  })

  let totalVolumeCbm = 0
  if (extension?.recommendedPackagingModel) {
    const material = await client.packagingMaterial.findFirst({
      where: {
        tenantId,
        materialCode: extension.recommendedPackagingModel,
      },
      select: { volumeCbm: true },
    })
    if (material?.volumeCbm) {
      totalVolumeCbm = Number(material.volumeCbm)
    }
  }

  await client.outboundOrder.update({
    where: { id: orderId },
    data: {
      totalWeightKg: totalWeightKg > 0 ? totalWeightKg : undefined,
      totalVolumeCbm: totalVolumeCbm > 0 ? totalVolumeCbm : undefined,
    },
  })
}

/**
 * Execute checkout for either one scanned order or all orders attached to the checkout container.
 * Container status is not finalized here.
 */
export async function executeCheckout(
  params: {
    checkoutOrderId: string
    tenantId: string
    userId: string
    targetOrderId?: string
  },
  tx?: TransactionClient
): Promise<{
  checkoutNumber: string
  orderCount: number
  parcelCount: number
}> {
  const { checkoutOrderId, tenantId, userId, targetOrderId } = params

  const doWork = async (client: TransactionClient) => {
    const container = await client.checkoutOrder.findUnique({
      where: { id: checkoutOrderId },
      include: { records: true },
    })

    if (!container) {
      throw new Error('签出单不存在')
    }

    if (container.records.length === 0) {
      throw new Error('请先扫描单号')
    }

    const allOrderIds = targetOrderId
      ? [targetOrderId]
      : [...new Set(container.records.map((record) => record.orderId))]

    const pendingOrders = await client.outboundOrder.findMany({
      where: { id: { in: allOrderIds }, status: { not: 'CHECKED_OUT' } },
      select: { id: true },
    })
    const pendingOrderIds = pendingOrders.map((order) => order.id)

    if (pendingOrderIds.length > 0) {
      await client.outboundOrder.updateMany({
        where: { id: { in: pendingOrderIds } },
        data: { status: 'CHECKED_OUT', updatedBy: userId },
      })

      const now = new Date()
      for (const orderId of pendingOrderIds) {
        await client.orderTimeline.upsert({
          where: { orderId },
          create: {
            tenantId,
            orderId,
            checkoutPendingAt: now,
            checkedOutAt: now,
            checkedOutBy: userId,
          },
          update: {
            checkoutPendingAt: now,
            checkedOutAt: now,
            checkedOutBy: userId,
          },
        })

        await shipOrderInTransaction({ tenantId, orderId, userId, tx: client })
        await updateOrderWeightAndVolume(orderId, tenantId, client)
      }
    }

    const currentContainer = await client.checkoutOrder.findUnique({
      where: { id: checkoutOrderId },
      select: { checkoutNumber: true, orderCount: true, parcelCount: true },
    })

    return {
      checkoutNumber: currentContainer!.checkoutNumber,
      orderCount: currentContainer!.orderCount,
      parcelCount: currentContainer!.parcelCount,
    }
  }

  if (tx) {
    return doWork(tx)
  }

  return prisma.$transaction(doWork, { maxWait: 10000, timeout: 60000 })
}
