import type { TransactionClient } from '@/lib/db/prisma'
import { InventoryCountDetailStatus, InventoryCountDisposalStatus } from '@/lib/services/inventory-count/status'
import {
  appendInventoryCountOperationLog,
} from '@/lib/services/inventory-count/operation-log'
import {
  createInventoryCountAdjustmentForDetail,
  executeInventoryCountAdjustmentForDetail,
} from '@/lib/services/inventory-count/adjustment'

async function generateInventoryCountDisposalNumber(tx: TransactionClient, tenantId: string) {
  const today = new Date()
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
  const prefix = `DISP${dateStr}`
  const latest = await tx.inventoryCountDisposal.findFirst({
    where: {
      tenantId,
      disposalNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      disposalNumber: 'desc',
    },
    select: {
      disposalNumber: true,
    },
  })
  const next = latest ? Number.parseInt(latest.disposalNumber.slice(-4), 10) + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

export async function generateInventoryCountDisposals(
  tx: TransactionClient,
  orderId: string,
  actorUserId?: string
) {
  const order = await tx.inventoryCountOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      tenantId: true,
      orderNumber: true,
      warehouseId: true,
      warehouseName: true,
    },
  })

  if (!order) {
    throw new Error('盘点单不存在')
  }

  const details = await tx.inventoryCountDetail.findMany({
    where: {
      orderId,
      status: InventoryCountDetailStatus.CONFIRMED,
      disposalId: null,
      diffQuantity: {
        not: 0,
      },
    },
  })

  for (const detail of details) {
    if (detail.finalQuantity === null || detail.diffQuantity === null) {
      throw new Error(`盘点明细缺少最终实盘结果：${detail.detailNumber}`)
    }

    const disposalNumber = await generateInventoryCountDisposalNumber(tx, order.tenantId)
    const disposal = await tx.inventoryCountDisposal.create({
      data: {
        tenantId: order.tenantId,
        disposalNumber,
        orderId: order.id,
        detailId: detail.id,
        sourceAdjustmentId: null,
        clientId: detail.clientId,
        warehouseId: detail.warehouseId,
        skuId: detail.skuId,
        skuCode: detail.skuCode,
        batchNumber: detail.batchNumber,
        asnNumber: '',
        sourceLocationId: detail.locationId,
        sourceLocationCode: detail.locationCode,
        targetLocationId: null,
        targetLocationCode: null,
        disposalType: detail.diffQuantity > 0 ? 'COUNT_SURPLUS' : 'COUNT_SHORTAGE',
        quantity: Math.abs(detail.diffQuantity),
        status: InventoryCountDisposalStatus.PENDING,
        assignedUserId: actorUserId || null,
        assignedUserName: actorUserId ? '盘点确认人' : null,
        processedAt: null,
        remark: detail.diffQuantity > 0 ? '盘点盘盈差异处理' : '盘点盘亏差异处理',
      },
      select: {
        id: true,
      },
    })

    await tx.inventoryCountDetail.update({
      where: { id: detail.id },
      data: {
        disposalId: disposal.id,
      },
    })

    await appendInventoryCountOperationLog(tx, {
      tenantId: order.tenantId,
      orderId: order.id,
      entityType: 'InventoryCountDisposal',
      entityId: disposal.id,
      operationType: 'DISPOSAL_CREATED',
      description: `生成差异单：${disposalNumber}，${detail.diffQuantity > 0 ? '盘盈' : '盘亏'} ${Math.abs(detail.diffQuantity)}`,
      operatorId: actorUserId || null,
      operatorName: actorUserId ? '盘点确认人' : '系统',
      metadata: {
        disposalNumber,
        detailNumber: detail.detailNumber,
        quantity: Math.abs(detail.diffQuantity),
        disposalType: detail.diffQuantity > 0 ? 'COUNT_SURPLUS' : 'COUNT_SHORTAGE',
      },
    })
  }

  const completedAfterFinalize = await tx.inventoryCountDetail.count({
    where: {
      orderId,
      status: {
        not: InventoryCountDetailStatus.ADJUSTED,
      },
    },
  })

  if (completedAfterFinalize === 0) {
    await appendInventoryCountOperationLog(tx, {
      tenantId: order.tenantId,
      orderId: order.id,
      entityType: 'InventoryCountOrder',
      entityId: order.id,
      operationType: 'ORDER_COMPLETED',
      description: '完成盘点单：全部明细已调整完成',
      operatorId: actorUserId || null,
      operatorName: actorUserId ? '盘点确认人' : '系统',
    })
  }
}

export async function ensureInventoryCountDisposals(
  tx: TransactionClient,
  orderId: string,
  actorUserId?: string
) {
  const details = await tx.inventoryCountDetail.findMany({
    where: {
      orderId,
      adjustmentId: {
        not: null,
      },
      disposalId: null,
      diffQuantity: {
        not: 0,
      },
    },
    select: {
      id: true,
      tenantId: true,
      clientId: true,
      warehouseId: true,
      locationId: true,
      locationCode: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      diffQuantity: true,
      adjustmentId: true,
    },
  })

  for (const detail of details) {
    if (!detail.diffQuantity || !detail.adjustmentId) {
      continue
    }

    const disposalNumber = await generateInventoryCountDisposalNumber(tx, detail.tenantId)
    const disposal = await tx.inventoryCountDisposal.create({
      data: {
        tenantId: detail.tenantId,
        disposalNumber,
        orderId,
        detailId: detail.id,
        sourceAdjustmentId: detail.adjustmentId,
        clientId: detail.clientId,
        warehouseId: detail.warehouseId,
        skuId: detail.skuId,
        skuCode: detail.skuCode,
        batchNumber: detail.batchNumber,
        asnNumber: '',
        sourceLocationId: detail.locationId,
        sourceLocationCode: detail.locationCode,
        targetLocationId: null,
        targetLocationCode: null,
        disposalType: detail.diffQuantity > 0 ? 'COUNT_SURPLUS' : 'COUNT_SHORTAGE',
        quantity: Math.abs(detail.diffQuantity),
        status: InventoryCountDisposalStatus.PENDING,
        assignedUserId: actorUserId || null,
        assignedUserName: actorUserId ? '盘点确认人' : null,
        processedAt: null,
        remark: detail.diffQuantity > 0 ? '盘点盘盈差异处理' : '盘点盘亏差异处理',
      },
      select: {
        id: true,
      },
    })

    await tx.inventoryCountDetail.update({
      where: { id: detail.id },
      data: {
        disposalId: disposal.id,
      },
    })
  }
}

export async function finalizeInventoryCountReadyDetails(
  tx: TransactionClient,
  orderId: string,
  actorUserId?: string
) {
  const order = await tx.inventoryCountOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      tenantId: true,
      orderNumber: true,
      warehouseId: true,
      warehouseName: true,
    },
  })

  if (!order) {
    throw new Error('盘点单不存在')
  }

  const details = await tx.inventoryCountDetail.findMany({
    where: {
      orderId,
      status: {
        in: [
          InventoryCountDetailStatus.CONFIRMED,
          InventoryCountDetailStatus.ADJUST_CREATED,
        ],
      },
    },
  })

  for (const detail of details) {
    const diffQuantity = detail.diffQuantity || 0
    if (diffQuantity === 0) {
      await executeInventoryCountAdjustmentForDetail(tx, order, detail, null, {
        id: actorUserId || detail.tenantId,
        name: actorUserId ? '盘点确认人' : '系统',
      })
      continue
    }

    const disposal = detail.disposalId
      ? await tx.inventoryCountDisposal.findFirst({
          where: {
            id: detail.disposalId,
            orderId,
            status: InventoryCountDisposalStatus.DONE,
          },
          select: {
            id: true,
            sourceAdjustmentId: true,
            targetLocationId: true,
          },
        })
      : null

    if (!disposal) {
      continue
    }

    const targetLocation = diffQuantity > 0 && disposal.targetLocationId
      ? await tx.binLocation.findFirst({
          where: {
            id: disposal.targetLocationId,
            tenantId: order.tenantId,
            warehouseId: order.warehouseId,
          },
          select: {
            id: true,
            locationCode: true,
            zoneId: true,
          },
        })
      : null
    const adjustmentTargetLocation = targetLocation
      ? {
          locationId: targetLocation.id,
          locationCode: targetLocation.locationCode,
          zoneId: targetLocation.zoneId,
        }
      : undefined
    const adjustment = await createInventoryCountAdjustmentForDetail(
      tx,
      order,
      detail,
      actorUserId,
      adjustmentTargetLocation
    )
    if (!disposal.sourceAdjustmentId) {
      await tx.inventoryCountDisposal.updateMany({
        where: { id: disposal.id },
        data: { sourceAdjustmentId: adjustment.id },
      })
    }
    await executeInventoryCountAdjustmentForDetail(tx, order, {
      ...detail,
      adjustmentId: adjustment.id,
      status: InventoryCountDetailStatus.ADJUST_CREATED,
    }, adjustment, {
      id: actorUserId || detail.tenantId,
      name: actorUserId ? '盘点确认人' : '系统',
    }, adjustmentTargetLocation)
  }

  const remaining = await tx.inventoryCountDetail.count({
    where: {
      orderId,
      status: {
        not: InventoryCountDetailStatus.ADJUSTED,
      },
    },
  })

  if (remaining === 0) {
    await appendInventoryCountOperationLog(tx, {
      tenantId: order.tenantId,
      orderId: order.id,
      entityType: 'InventoryCountOrder',
      entityId: order.id,
      operationType: 'ORDER_COMPLETED',
      description: '完成盘点单：全部差异已处理完成',
      operatorId: actorUserId || null,
      operatorName: actorUserId ? '盘点确认人' : '系统',
    })
  }
}
