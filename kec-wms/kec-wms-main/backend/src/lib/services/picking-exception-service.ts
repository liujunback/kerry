import { prisma, type TransactionClient } from '@/lib/db/prisma'
import { adjust } from '@/lib/services/inventory-operation-service'
import { BucketType, InventoryEventType } from '@/lib/services/inventory-event-service'

export const PICKING_EXCEPTION_READ_PERMISSION = 'picking-exception:read'
export const PICKING_EXCEPTION_MANAGE_PERMISSION = 'picking-exception:manage'
export const PICKING_EXCEPTION_PRINT_PERMISSION = 'picking-exception:print'

export class PickingExceptionError extends Error {
  code: string
  httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = 'PickingExceptionError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

type PickShortageLineInput = {
  id: string
  orderId: string
  orderLineId: string
  skuId: string
  skuCode: string
  expectedQty: number
  pickedQty: number
  shortQty: number
  locationId: string
  bucketId: string | null
  batchNumber: string | null
  lpn: string | null
  bucket?: {
    asnNumber: string | null
  } | null
  location: {
    locationCode: string
  }
  sku: {
    skuName: string | null
  }
  order: {
    orderNumber: string
  }
}

type CreateShortageCasesParams = {
  tenantId: string
  warehouseId: string
  pickOrderId: string
  pickOrderNumber: string
  operatorId: string
  lines: PickShortageLineInput[]
}

type AllocationBucket = {
  id: string
  tenantId: string
  clientId: string
  warehouseId: string
  locationId: string
  skuId: string
  skuCode: string
  batchNumber: string
  lpn: string
  asnNumber: string
  quantity: number
  expiryDate: Date | null
  fifoDate: Date | null
  location: {
    locationCode: string
  }
}

function buildSupplementPickNo() {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SP-${date}-${time}-${suffix}`
}

async function findAllocatedBucketForSource(params: {
  tx: TransactionClient
  tenantId: string
  warehouseId: string
  locationId: string
  skuId: string
  batchNumber: string
  lpn: string
  asnNumber: string
  expiryDate: Date | null
}) {
  return params.tx.inventoryBucket.findFirst({
    where: {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      locationId: params.locationId,
      skuId: params.skuId,
      batchNumber: params.batchNumber,
      lpn: params.lpn,
      asnNumber: params.asnNumber,
      expiryDate: params.expiryDate,
      bucketType: BucketType.ALLOCATED,
    },
    select: {
      id: true,
    },
  })
}

export async function createOrUpdatePickingShortageCases(
  tx: TransactionClient,
  params: CreateShortageCasesParams
) {
  const shortageLines = params.lines.filter((line) => line.shortQty > 0)
  const linesByOrder = new Map<string, PickShortageLineInput[]>()

  for (const line of shortageLines) {
    const lines = linesByOrder.get(line.orderId) || []
    lines.push(line)
    linesByOrder.set(line.orderId, lines)
  }

  const caseIds: string[] = []

  for (const [orderId, lines] of linesByOrder.entries()) {
    const orderNumber = lines[0]?.order.orderNumber || ''
    let exceptionCase = await tx.pickingExceptionCase.findFirst({
      where: {
        tenantId: params.tenantId,
        orderId,
        pickOrderId: params.pickOrderId,
        exceptionType: 'PICK_SHORTAGE',
        status: 'OPEN',
      },
      select: { id: true },
    })

    if (!exceptionCase) {
      exceptionCase = await tx.pickingExceptionCase.create({
        data: {
          tenantId: params.tenantId,
          warehouseId: params.warehouseId,
          orderId,
          orderNumber,
          pickOrderId: params.pickOrderId,
          pickOrderNumber: params.pickOrderNumber,
          exceptionType: 'PICK_SHORTAGE',
          exceptionStage: 'PICKING',
          status: 'OPEN',
          detectedBy: params.operatorId,
          createdBy: params.operatorId,
          updatedBy: params.operatorId,
          remark: 'PDA确认拣货缺货',
        },
        select: { id: true },
      })
    }

    caseIds.push(exceptionCase.id)

    for (const line of lines) {
      const existingLine = await tx.pickingExceptionLine.findUnique({
        where: {
          tenantId_pickOrderLineId: {
            tenantId: params.tenantId,
            pickOrderLineId: line.id,
          },
        },
        select: {
          id: true,
          supplementedQty: true,
        },
      })
      const supplementedQty = existingLine?.supplementedQty ?? 0
      const remainingShortageQty = Math.max(0, line.shortQty - supplementedQty)

      const data = {
        caseId: exceptionCase.id,
        pickOrderId: params.pickOrderId,
        orderId: line.orderId,
        orderLineId: line.orderLineId,
        skuId: line.skuId,
        skuCode: line.skuCode,
        skuName: line.sku.skuName,
        locationId: line.locationId,
        locationCode: line.location.locationCode,
        sourceBucketId: line.bucketId,
        batchNumber: line.batchNumber,
        lpn: line.lpn,
        asnNumber: line.bucket?.asnNumber || null,
        expectedQty: line.expectedQty,
        actualPickedQty: line.pickedQty,
        shortageQty: line.shortQty,
        supplementedQty,
        remainingShortageQty,
        status: remainingShortageQty === 0 ? 'RESOLVED' : 'OPEN',
        updatedBy: params.operatorId,
      }

      if (existingLine) {
        await tx.pickingExceptionLine.update({
          where: { id: existingLine.id },
          data,
        })
      } else {
        await tx.pickingExceptionLine.create({
          data: {
            tenantId: params.tenantId,
            pickOrderLineId: line.id,
            ...data,
            createdBy: params.operatorId,
          },
        })
      }
    }

    const totals = await tx.pickingExceptionLine.aggregate({
      where: {
        tenantId: params.tenantId,
        caseId: exceptionCase.id,
      },
      _sum: {
        shortageQty: true,
        supplementedQty: true,
        remainingShortageQty: true,
      },
    })

    const remainingShortageQty = totals._sum.remainingShortageQty || 0
    const supplementedQty = totals._sum.supplementedQty || 0
    const hasSupplement = await tx.supplementPickOrder.findFirst({
      where: {
        tenantId: params.tenantId,
        caseId: exceptionCase.id,
      },
      select: { id: true },
    })

    await tx.pickingExceptionCase.update({
      where: { id: exceptionCase.id },
      data: {
        shortageQty: totals._sum.shortageQty || 0,
        supplementedQty,
        remainingShortageQty,
        supplementStatus: remainingShortageQty === 0
          ? 'COMPLETED'
          : hasSupplement
            ? 'GENERATED'
            : 'NOT_GENERATED',
        status: remainingShortageQty === 0 ? 'RESOLVED' : 'OPEN',
        updatedBy: params.operatorId,
      },
    })
  }

  return caseIds
}

export async function generateSupplementPickOrder(params: {
  tenantId: string
  caseId: string
  operatorId: string
}) {
  return prisma.$transaction(async (tx) => {
    const exceptionCase = await tx.pickingExceptionCase.findFirst({
      where: {
        id: params.caseId,
        tenantId: params.tenantId,
        status: 'OPEN',
        exceptionType: 'PICK_SHORTAGE',
      },
    })

    if (!exceptionCase) {
      throw new PickingExceptionError('拣货异常不存在或已关闭', 'PICK_EX_001', 404)
    }

    const existingPending = await tx.supplementPickOrder.findFirst({
      where: {
        tenantId: params.tenantId,
        caseId: exceptionCase.id,
        status: 'PENDING',
      },
    })

    if (existingPending) {
      throw new PickingExceptionError('该异常已生成待处理补拣单', 'PICK_EX_002', 409)
    }

    const order = await tx.outboundOrder.findFirst({
      where: {
        id: exceptionCase.orderId,
        tenantId: params.tenantId,
      },
      select: {
        id: true,
        clientId: true,
        warehouseId: true,
        orderNumber: true,
      },
    })

    if (!order) {
      throw new PickingExceptionError('原出库订单不存在', 'PICK_EX_003', 404)
    }

    const caseLines = await tx.pickingExceptionLine.findMany({
      where: {
        tenantId: params.tenantId,
        caseId: exceptionCase.id,
        status: 'OPEN',
        remainingShortageQty: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (caseLines.length === 0) {
      throw new PickingExceptionError('当前异常没有待补拣缺货明细', 'PICK_EX_004', 400)
    }

    const supplementPickNo = buildSupplementPickNo()
    const supplementOrder = await tx.supplementPickOrder.create({
      data: {
        tenantId: params.tenantId,
        warehouseId: exceptionCase.warehouseId,
        supplementPickNo,
        caseId: exceptionCase.id,
        orderId: exceptionCase.orderId,
        orderNumber: exceptionCase.orderNumber,
        status: 'PENDING',
        allocationMethod: 'AUTO',
        printStatus: 'NOT_PRINTED',
        createdBy: params.operatorId,
        updatedBy: params.operatorId,
      },
    })

    let totalSupplementQty = 0

    for (const line of caseLines) {
      let remainingQty = line.remainingShortageQty
      const candidateBuckets = await tx.inventoryBucket.findMany({
        where: {
          tenantId: params.tenantId,
          warehouseId: exceptionCase.warehouseId,
          skuId: line.skuId,
          bucketType: BucketType.AVAILABLE,
          quantity: { gt: 0 },
          locationId: { not: line.locationId },
        },
        include: {
          location: {
            select: { locationCode: true },
          },
        },
        orderBy: [
          { expiryDate: 'asc' },
          { fifoDate: 'asc' },
          { quantity: 'desc' },
        ],
      }) as AllocationBucket[]

      for (const bucket of candidateBuckets) {
        if (remainingQty <= 0) break

        const supplementQty = Math.min(remainingQty, bucket.quantity)
        await adjust(
          {
            tenantId: params.tenantId,
            clientId: bucket.clientId,
            warehouseId: bucket.warehouseId,
            locationId: bucket.locationId,
            skuId: bucket.skuId,
            skuCode: bucket.skuCode,
            bucketType: BucketType.AVAILABLE,
            quantityDelta: -supplementQty,
            eventType: InventoryEventType.SUPPLEMENT_ALLOCATE,
            batchNumber: bucket.batchNumber,
            lpn: bucket.lpn,
            asnNumber: bucket.asnNumber,
            expiryDate: bucket.expiryDate,
            fifoDate: bucket.fifoDate,
            reasonCode: 'SUPPLEMENT_PICK_ALLOCATE',
            reasonDescription: '生成补拣单时占用补拣来源库存',
            referenceType: 'SUPPLEMENT_PICK_ORDER',
            referenceId: supplementOrder.id,
            referenceNumber: supplementPickNo,
            operatorId: params.operatorId,
          },
          tx
        )
        await adjust(
          {
            tenantId: params.tenantId,
            clientId: bucket.clientId,
            warehouseId: bucket.warehouseId,
            locationId: bucket.locationId,
            skuId: bucket.skuId,
            skuCode: bucket.skuCode,
            bucketType: BucketType.ALLOCATED,
            quantityDelta: supplementQty,
            eventType: InventoryEventType.SUPPLEMENT_ALLOCATE,
            batchNumber: bucket.batchNumber,
            lpn: bucket.lpn,
            asnNumber: bucket.asnNumber,
            expiryDate: bucket.expiryDate,
            fifoDate: bucket.fifoDate,
            reasonCode: 'SUPPLEMENT_PICK_ALLOCATE',
            reasonDescription: '生成补拣单时占用补拣来源库存',
            referenceType: 'SUPPLEMENT_PICK_ORDER',
            referenceId: supplementOrder.id,
            referenceNumber: supplementPickNo,
            operatorId: params.operatorId,
          },
          tx
        )

        const allocatedBucket = await findAllocatedBucketForSource({
          tx,
          tenantId: params.tenantId,
          warehouseId: bucket.warehouseId,
          locationId: bucket.locationId,
          skuId: bucket.skuId,
          batchNumber: bucket.batchNumber,
          lpn: bucket.lpn,
          asnNumber: bucket.asnNumber,
          expiryDate: bucket.expiryDate,
        })

        if (!allocatedBucket) {
          throw new PickingExceptionError(`SKU ${line.skuCode} 补拣占用库存创建失败`, 'PICK_EX_010', 409)
        }

        await tx.allocationDetail.create({
          data: {
            tenantId: params.tenantId,
            bucketId: allocatedBucket.id,
            locationId: bucket.locationId,
            skuId: bucket.skuId,
            batchNumber: bucket.batchNumber,
            lpn: bucket.lpn,
            asnNumber: bucket.asnNumber,
            allocatedQty: supplementQty,
            referenceType: 'OUTBOUND_ORDER',
            referenceId: exceptionCase.orderId,
            referenceNumber: exceptionCase.orderNumber,
            referenceLineId: line.orderLineId,
            allocationType: 'SOFT',
            status: 'ALLOCATED',
          },
        })

        await tx.supplementPickOrderLine.create({
          data: {
            tenantId: params.tenantId,
            supplementPickOrderId: supplementOrder.id,
            caseLineId: line.id,
            orderLineId: line.orderLineId,
            skuId: bucket.skuId,
            skuCode: bucket.skuCode,
            sourceLocationId: bucket.locationId,
            sourceLocationCode: bucket.location.locationCode,
            sourceBucketId: allocatedBucket.id,
            batchNumber: bucket.batchNumber,
            lpn: bucket.lpn,
            asnNumber: bucket.asnNumber,
            supplementQty,
            status: 'PENDING',
            createdBy: params.operatorId,
            updatedBy: params.operatorId,
          },
        })

        remainingQty -= supplementQty
        totalSupplementQty += supplementQty
      }

      if (remainingQty > 0) {
        throw new PickingExceptionError(`SKU ${line.skuCode} 可用补拣库存不足`, 'PICK_EX_007', 409)
      }
    }

    await tx.supplementPickOrder.update({
      where: { id: supplementOrder.id },
      data: {
        totalSupplementQty,
        updatedBy: params.operatorId,
      },
    })

    await tx.pickingExceptionCase.update({
      where: { id: exceptionCase.id },
      data: {
        supplementStatus: 'GENERATED',
        updatedBy: params.operatorId,
      },
    })

    return {
      ...supplementOrder,
      totalSupplementQty,
    }
  })
}

export async function markSupplementPickOrderPrinted(params: {
  tenantId: string
  supplementPickOrderId: string
  operatorId: string
}) {
  return prisma.$transaction(async (tx) => {
    const supplementOrder = await tx.supplementPickOrder.findFirst({
      where: {
        id: params.supplementPickOrderId,
        tenantId: params.tenantId,
      },
    })

    if (!supplementOrder) {
      throw new PickingExceptionError('补拣单不存在', 'PICK_EX_008', 404)
    }

    const printedAt = new Date()
    await tx.supplementPickOrder.update({
      where: { id: supplementOrder.id },
      data: {
        printStatus: 'PRINTED',
        printCount: { increment: 1 },
        printedAt,
        updatedBy: params.operatorId,
      },
    })
    await tx.pickingExceptionCase.update({
      where: { id: supplementOrder.caseId },
      data: {
        printStatus: 'PRINTED',
        updatedBy: params.operatorId,
      },
    })
  })
}

export async function manuallyCompleteSupplementPickOrder(params: {
  tenantId: string
  supplementPickOrderId: string
  operatorId: string
  remark: string
}) {
  return prisma.$transaction(async (tx) => {
    const supplementOrder = await tx.supplementPickOrder.findFirst({
      where: {
        id: params.supplementPickOrderId,
        tenantId: params.tenantId,
      },
    })

    if (!supplementOrder) {
      throw new PickingExceptionError('补拣单不存在', 'PICK_EX_008', 404)
    }

    if (supplementOrder.status === 'COMPLETED') {
      throw new PickingExceptionError('补拣单已补齐，不能重复标记', 'PICK_EX_009', 409)
    }

    const order = await tx.outboundOrder.findFirst({
      where: {
        id: supplementOrder.orderId,
        tenantId: params.tenantId,
      },
      select: {
        clientId: true,
        warehouseId: true,
        orderNumber: true,
      },
    })

    if (!order) {
      throw new PickingExceptionError('原出库订单不存在', 'PICK_EX_003', 404)
    }

    const lines = await tx.supplementPickOrderLine.findMany({
      where: {
        tenantId: params.tenantId,
        supplementPickOrderId: supplementOrder.id,
      },
    })

    const completedAt = new Date()
    await tx.supplementPickOrder.update({
      where: { id: supplementOrder.id },
      data: {
        status: 'COMPLETED',
        completionMethod: 'MANUAL_MARK',
        manualCompletedBy: params.operatorId,
        manualCompletedAt: completedAt,
        manualCompleteRemark: params.remark,
        updatedBy: params.operatorId,
      },
    })

    await tx.supplementPickOrderLine.updateMany({
      where: {
        tenantId: params.tenantId,
        supplementPickOrderId: supplementOrder.id,
      },
      data: {
        status: 'COMPLETED',
        updatedBy: params.operatorId,
      },
    })

    for (const line of lines) {
      const allocatedBucket = await tx.inventoryBucket.findFirst({
        where: {
          tenantId: params.tenantId,
          warehouseId: supplementOrder.warehouseId,
          locationId: line.sourceLocationId,
          skuId: line.skuId,
          batchNumber: line.batchNumber || '',
          lpn: line.lpn || '',
          asnNumber: line.asnNumber || '',
          bucketType: BucketType.ALLOCATED,
        },
        select: {
          id: true,
          clientId: true,
          skuCode: true,
          batchNumber: true,
          lpn: true,
          asnNumber: true,
          expiryDate: true,
          fifoDate: true,
        },
      })

      if (!allocatedBucket) {
        throw new PickingExceptionError(`SKU ${line.skuCode} 补拣占用库存不存在`, 'PICK_EX_011', 409)
      }

      await adjust(
        {
          tenantId: params.tenantId,
          clientId: allocatedBucket.clientId || order.clientId,
          warehouseId: supplementOrder.warehouseId,
          locationId: line.sourceLocationId,
          skuId: line.skuId,
          skuCode: line.skuCode,
          bucketType: BucketType.ALLOCATED,
          quantityDelta: -line.supplementQty,
          eventType: InventoryEventType.SUPPLEMENT_PICK,
          batchNumber: allocatedBucket.batchNumber,
          lpn: allocatedBucket.lpn,
          asnNumber: allocatedBucket.asnNumber,
          expiryDate: allocatedBucket.expiryDate,
          fifoDate: allocatedBucket.fifoDate,
          reasonCode: 'SUPPLEMENT_PICK_COMPLETE',
          reasonDescription: '手动标记补拣完成，补拣库存转入拣货中',
          referenceType: 'SUPPLEMENT_PICK_ORDER',
          referenceId: supplementOrder.id,
          referenceNumber: supplementOrder.supplementPickNo,
          operatorId: params.operatorId,
        },
        tx
      )
      await adjust(
        {
          tenantId: params.tenantId,
          clientId: allocatedBucket.clientId || order.clientId,
          warehouseId: supplementOrder.warehouseId,
          locationId: line.sourceLocationId,
          skuId: line.skuId,
          skuCode: line.skuCode,
          bucketType: BucketType.PICKING,
          quantityDelta: line.supplementQty,
          eventType: InventoryEventType.SUPPLEMENT_PICK,
          batchNumber: allocatedBucket.batchNumber,
          lpn: allocatedBucket.lpn,
          asnNumber: allocatedBucket.asnNumber,
          expiryDate: allocatedBucket.expiryDate,
          fifoDate: allocatedBucket.fifoDate,
          reasonCode: 'SUPPLEMENT_PICK_COMPLETE',
          reasonDescription: '手动标记补拣完成，补拣库存转入拣货中',
          referenceType: 'SUPPLEMENT_PICK_ORDER',
          referenceId: supplementOrder.id,
          referenceNumber: supplementOrder.supplementPickNo,
          operatorId: params.operatorId,
        },
        tx
      )

      const allocations = await tx.$queryRaw<Array<{
        id: string
        allocated_qty: number
        picked_qty: number
      }>>`
        SELECT id, allocated_qty, picked_qty
        FROM allocation_detail
        WHERE tenant_id = ${params.tenantId}
          AND reference_type = 'OUTBOUND_ORDER'
          AND reference_id = ${supplementOrder.orderId}
          AND reference_line_id = ${line.orderLineId}
          AND location_id = ${line.sourceLocationId}
          AND sku_id = ${line.skuId}
          AND batch_number = ${allocatedBucket.batchNumber}
          AND lpn = ${allocatedBucket.lpn}
          AND asn_number = ${allocatedBucket.asnNumber}
          AND status = 'ALLOCATED'
          AND allocated_qty > picked_qty
        ORDER BY allocated_at ASC
        FOR UPDATE
      `
      let remainingPickedQty = line.supplementQty
      for (const allocation of allocations) {
        if (remainingPickedQty <= 0) break

        const pickableQty = allocation.allocated_qty - allocation.picked_qty
        const pickedQtyDelta = Math.min(remainingPickedQty, pickableQty)
        await tx.allocationDetail.update({
          where: { id: allocation.id },
          data: {
            pickedQty: { increment: pickedQtyDelta },
            status: 'PICKING',
            pickedAt: completedAt,
          },
        })
        remainingPickedQty -= pickedQtyDelta
      }

      if (remainingPickedQty > 0) {
        throw new PickingExceptionError(`SKU ${line.skuCode} 补拣分配明细不足`, 'PICK_EX_012', 409)
      }
      await tx.supplementPickOrderLine.update({
        where: { id: line.id },
        data: {
          pickedQty: line.supplementQty,
          updatedBy: params.operatorId,
        },
      })
      await tx.pickingExceptionLine.update({
        where: { id: line.caseLineId },
        data: {
          supplementedQty: { increment: line.supplementQty },
          remainingShortageQty: { decrement: line.supplementQty },
          status: 'RESOLVED',
          updatedBy: params.operatorId,
        },
      })
      await tx.outboundOrderLine.update({
        where: { id: line.orderLineId },
        data: {
          pickedQty: { increment: line.supplementQty },
          shortQty: { decrement: line.supplementQty },
          status: 'PICKED',
          updatedBy: params.operatorId,
        },
      })
    }

    const totals = await tx.pickingExceptionLine.aggregate({
      where: {
        tenantId: params.tenantId,
        caseId: supplementOrder.caseId,
      },
      _sum: {
        shortageQty: true,
        supplementedQty: true,
        remainingShortageQty: true,
      },
    })

    await tx.pickingExceptionCase.update({
      where: { id: supplementOrder.caseId },
      data: {
        status: 'RESOLVED',
        supplementStatus: 'COMPLETED',
        supplementedQty: totals._sum.supplementedQty || 0,
        remainingShortageQty: Math.max(0, totals._sum.remainingShortageQty || 0),
        resolvedBy: params.operatorId,
        resolvedAt: completedAt,
        updatedBy: params.operatorId,
      },
    })

    const orderLineTotals = await tx.outboundOrderLine.aggregate({
      where: {
        tenantId: params.tenantId,
        orderId: supplementOrder.orderId,
      },
      _sum: {
        pickedQty: true,
      },
    })

    await tx.outboundOrder.update({
      where: { id: supplementOrder.orderId },
      data: {
        status: 'PICKED',
        totalPickedQty: orderLineTotals._sum.pickedQty || 0,
        updatedBy: params.operatorId,
      },
    })

    return {
      id: supplementOrder.id,
      status: 'COMPLETED',
    }
  })
}

export function toPickingExceptionErrorResponse(error: unknown) {
  if (error instanceof PickingExceptionError) {
    return {
      body: { success: false, message: error.message, code: error.code },
      status: error.httpStatus,
    }
  }

  return {
    body: {
      success: false,
      message: error instanceof Error ? error.message : '拣货异常处理失败',
    },
    status: 500,
  }
}
