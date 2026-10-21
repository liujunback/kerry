import { prisma } from '@/lib/db/prisma'
import { randomUUID } from 'crypto'
import { generatePickTaskNumbers } from '@/lib/utils/number-generator'
import { assignPickOrdersBatch } from '@/lib/services/pick-assignment-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { ORDER_OPERATION_TYPES, WAVE_OPERATION_TYPES } from '@/lib/constants/operation-types'

type ReleaseWaveParams = {
  tenantId: string
  waveId: string
  operatorId?: string | null
  operatorName?: string | null
}

export async function releaseWave(params: ReleaseWaveParams) {
  const wave = await prisma.wave.findFirst({
    where: {
      id: params.waveId,
      tenantId: params.tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseCode: true,
        },
      },
      waveOrders: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderBusinessType: true,
        },
      },
    },
  })

  if (!wave) {
    throw new Error('波次不存在')
  }

  if (wave.releaseStatus === 'RELEASED') {
    throw new Error('波次已释放')
  }

  const strategyCreator = wave.strategyId
    ? await prisma.waveStrategy.findFirst({
        where: {
          id: wave.strategyId,
          tenantId: params.tenantId,
        },
        select: {
          createdBy: true,
        },
      })
    : null
  const operationUserId = params.operatorId || strategyCreator?.createdBy || undefined

  const orderRecords = wave.orders.length > 0
    ? wave.orders
    : await prisma.outboundOrder.findMany({
        where: {
          tenantId: params.tenantId,
          waveId: wave.id,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderBusinessType: true,
        },
      })

  const orderIds = orderRecords.map((order) => order.id)
  if (orderIds.length === 0) {
    throw new Error('波次下不存在订单')
  }

  const allocations = await prisma.allocationDetail.findMany({
    where: {
      tenantId: params.tenantId,
      referenceType: 'OUTBOUND_ORDER',
      referenceId: { in: orderIds },
      status: 'ALLOCATED',
    },
    orderBy: [{ referenceId: 'asc' }, { allocatedAt: 'asc' }],
    select: {
      id: true,
      bucketId: true,
      locationId: true,
      skuId: true,
      batchNumber: true,
      lpn: true,
      allocatedQty: true,
      referenceId: true,
      referenceLineId: true,
      allocatedAt: true,
    },
  })

  if (allocations.length === 0) {
    throw new Error('波次下订单没有可释放的分配明细')
  }

  const locationIds = Array.from(new Set(allocations.map((item) => item.locationId)))
  const locations = await prisma.binLocation.findMany({
    where: { id: { in: locationIds } },
    select: {
      id: true,
      zoneId: true,
      locationCode: true,
    },
  })
  const locationMap = new Map(locations.map((location) => [location.id, location]))

  const orderLineIds = allocations
    .map((item) => item.referenceLineId)
    .filter((id): id is string => Boolean(id))
  if (orderLineIds.length === 0) {
    throw new Error('分配明细缺少订单行信息，无法释放波次')
  }
  const orderLines = await prisma.outboundOrderLine.findMany({
    where: {
      tenantId: params.tenantId,
      id: { in: orderLineIds },
    },
    select: {
      id: true,
      skuCode: true,
    },
  })
  const orderLineMap = new Map(orderLines.map((line) => [line.id, line]))

  const configSnapshot = wave.configSnapshot as {
    pickConfig?: {
      crossZoneSplitMode?: 'BY_ZONE' | 'NO_SPLIT'
      enableMaxOrderLimit?: boolean
      maxOrdersPerPickOrder?: number | null
    }
    releaseConfig?: {
      autoAssignPicker?: boolean
    }
  } | null

  const pickConfig = configSnapshot?.pickConfig
  const releaseConfig = configSnapshot?.releaseConfig

  const crossZoneSplitMode = pickConfig?.crossZoneSplitMode ?? 'NO_SPLIT'
  const enableMaxOrderLimit = pickConfig?.enableMaxOrderLimit ?? false
  const maxOrdersPerPickOrder = pickConfig?.maxOrdersPerPickOrder ?? null
  const autoAssignPicker = releaseConfig?.autoAssignPicker ?? false
  const orderBusinessTypeByOrderId = new Map(orderRecords.map((item) => [item.id, item.orderBusinessType]))

  const groupedAllocations = new Map<string, typeof allocations>()
  for (const allocation of allocations) {
    const location = locationMap.get(allocation.locationId)
    const groupKey = crossZoneSplitMode === 'BY_ZONE' ? (location?.zoneId || 'NO_ZONE') : 'ALL'
    const group = groupedAllocations.get(groupKey) || []
    group.push(allocation)
    groupedAllocations.set(groupKey, group)
  }

  const pickGroups: typeof allocations[] = []
  for (const allocationsInGroup of groupedAllocations.values()) {
    if (!enableMaxOrderLimit || !maxOrdersPerPickOrder || maxOrdersPerPickOrder <= 0) {
      pickGroups.push(allocationsInGroup)
      continue
    }

    const uniqueOrderIds = Array.from(new Set(allocationsInGroup.map((item) => item.referenceId)))
    for (let index = 0; index < uniqueOrderIds.length; index += maxOrdersPerPickOrder) {
      const chunkOrderIds = new Set(uniqueOrderIds.slice(index, index + maxOrdersPerPickOrder))
      pickGroups.push(allocationsInGroup.filter((item) => chunkOrderIds.has(item.referenceId)))
    }
  }

  const createdPickOrders = [] as Array<{ id: string; taskNumber: string }>
  await prisma.$transaction(async (tx) => {
    const processedAt = new Date()
    const preparedGroups = pickGroups.map((group) => {
      const sortedGroup = [...group].sort((left, right) => {
        const leftLocation = locationMap.get(left.locationId)?.locationCode || ''
        const rightLocation = locationMap.get(right.locationId)?.locationCode || ''
        return leftLocation.localeCompare(rightLocation)
      })
      const validLines = sortedGroup.filter((line) => line.referenceLineId && orderLineMap.has(line.referenceLineId))
      if (validLines.length === 0) {
        throw new Error('分配明细缺少有效订单行，无法创建拣货单')
      }
      const groupOrderIds = Array.from(new Set(validLines.map((line) => line.referenceId)))
      const orderBusinessTypes = Array.from(
        new Set(groupOrderIds.map((orderId) => orderBusinessTypeByOrderId.get(orderId)).filter(Boolean))
      )
      const orderBusinessType = orderBusinessTypes.length === 1 ? orderBusinessTypes[0] : 'STANDARD'
      return {
        groupOrderIds,
        orderBusinessType,
        validLines,
      }
    })

    const taskNumbers = await generatePickTaskNumbers(
      params.tenantId,
      wave.warehouse.warehouseCode,
      preparedGroups.length,
      tx
    )
    const pickOrderRows = preparedGroups.map((group, index) => ({
      id: randomUUID(),
      tenantId: params.tenantId,
      warehouseId: wave.warehouseId,
      taskNumber: taskNumbers[index],
      waveId: wave.id,
      strategyRunId: wave.strategyRunId,
      waveTypeCode: wave.waveTypeCode,
      taskType: wave.waveTypeCode || 'MULTI_NON_FIXED',
      order_business_type: group.orderBusinessType,
      status: 'PENDING',
      priority: wave.priority,
      pickMethod: 'PAPER',
      pickMode: wave.pickMode,
      downstreamMode: wave.downstreamMode,
      totalLines: group.validLines.length,
      totalQty: group.validLines.reduce((sum, line) => sum + line.allocatedQty, 0),
      createdBy: operationUserId,
      updatedBy: operationUserId,
    }))

    await tx.pickOrder.createMany({
      data: pickOrderRows,
    })

    await tx.pickOrderLine.createMany({
      data: preparedGroups.flatMap((group, groupIndex) =>
        group.validLines.map((line, lineIndex) => ({
          tenantId: params.tenantId,
          pickOrderId: pickOrderRows[groupIndex].id,
          lineNumber: lineIndex + 1,
          orderId: line.referenceId,
          orderLineId: line.referenceLineId!,
          skuId: line.skuId,
          skuCode: orderLineMap.get(line.referenceLineId!)?.skuCode || '',
          locationId: line.locationId,
          bucketId: line.bucketId,
          batchNumber: line.batchNumber || null,
          lpn: line.lpn || null,
          expectedQty: line.allocatedQty,
          createdBy: operationUserId,
          updatedBy: operationUserId,
        }))
      ),
    })

    createdPickOrders.push(
      ...pickOrderRows.map((item) => ({
        id: item.id,
        taskNumber: item.taskNumber,
      }))
    )

    await tx.wave.update({
      where: { id: wave.id },
      data: {
        status: 'RELEASED',
        releaseStatus: 'RELEASED',
        updatedBy: operationUserId,
      },
    })

    const releasedOrders = await tx.outboundOrder.updateMany({
      where: {
        id: { in: orderIds },
        tenantId: params.tenantId,
        waveId: wave.id,
        status: { in: ['IN_WAVE', 'ALLOCATED', 'PENDING_WAVE'] },
      },
      data: {
        status: 'PENDING_PICK',
        updatedBy: operationUserId,
      },
    })

    if (releasedOrders.count !== orderIds.length) {
      throw new Error(`波次 ${wave.waveNumber} 释放时存在订单状态异常，已回滚本次释放`)
    }

    const existingContexts = await tx.outboundOrderWaveContext.findMany({
      where: {
        orderId: { in: orderIds },
      },
      select: {
        orderId: true,
      },
    })
    const existingContextOrderIds = new Set(existingContexts.map((item) => item.orderId))
    const newContextRows = orderIds
      .filter((orderId) => !existingContextOrderIds.has(orderId))
      .map((orderId) => ({
        tenantId: params.tenantId,
        orderId,
        strategyRunId: wave.strategyRunId,
        pickMode: wave.pickMode,
        releaseMode: wave.releaseMode,
        releaseStatus: 'RELEASED',
        lastWaveEvaluatedAt: processedAt,
      }))

    if (newContextRows.length > 0) {
      await tx.outboundOrderWaveContext.createMany({
        data: newContextRows,
      })
    }

    if (existingContextOrderIds.size > 0) {
      await tx.outboundOrderWaveContext.updateMany({
        where: {
          orderId: {
            in: Array.from(existingContextOrderIds),
          },
        },
        data: {
          strategyRunId: wave.strategyRunId,
          pickMode: wave.pickMode,
          releaseMode: wave.releaseMode,
          releaseStatus: 'RELEASED',
          lastWaveEvaluatedAt: processedAt,
        },
      })
    }

    const existingTimelines = await tx.orderTimeline.findMany({
      where: {
        orderId: { in: orderIds },
      },
      select: {
        orderId: true,
      },
    })
    const existingTimelineOrderIds = new Set(existingTimelines.map((item) => item.orderId))
    const newTimelineRows = orderIds
      .filter((orderId) => !existingTimelineOrderIds.has(orderId))
      .map((orderId) => ({
        tenantId: params.tenantId,
        orderId,
        pendingPickAt: processedAt,
      }))

    if (newTimelineRows.length > 0) {
      await tx.orderTimeline.createMany({
        data: newTimelineRows,
      })
    }

    if (existingTimelineOrderIds.size > 0) {
      await tx.orderTimeline.updateMany({
        where: {
          orderId: {
            in: Array.from(existingTimelineOrderIds),
          },
        },
        data: {
          pendingPickAt: processedAt,
        },
      })
    }

    if (autoAssignPicker && createdPickOrders.length > 0) {
      await assignPickOrdersBatch({
        tenantId: params.tenantId,
        pickOrderIds: createdPickOrders.map((item) => item.id),
        operatorId: params.operatorId,
        db: tx,
      })
    }
  })

  await operationLogService.logOperation({
    tenantId: params.tenantId,
    entityType: 'WAVE',
    entityId: wave.id,
    entityNumber: wave.waveNumber,
    operationType: WAVE_OPERATION_TYPES.RELEASE.type,
    operationName: WAVE_OPERATION_TYPES.RELEASE.name,
    beforeStatus: wave.status,
    afterStatus: 'RELEASED',
    remark: `波次释放，生成 ${createdPickOrders.length} 张拣货单`,
    operatorId: params.operatorId || undefined,
    operatorName: params.operatorName || undefined,
    metadata: {
      pickOrderIds: createdPickOrders.map((item) => item.id),
      pickOrderNumbers: createdPickOrders.map((item) => item.taskNumber),
    },
  })

  for (const order of orderRecords) {
    await operationLogService.logOperation({
      tenantId: params.tenantId,
      entityType: 'OUTBOUND_ORDER',
      entityId: order.id,
      entityNumber: order.orderNumber,
      operationType: ORDER_OPERATION_TYPES.RELEASE_WAVE.type,
      operationName: ORDER_OPERATION_TYPES.RELEASE_WAVE.name,
      beforeStatus: order.status,
      afterStatus: 'PENDING_PICK',
      remark: `从波次 ${wave.waveNumber} 释放进入待拣货`,
      operatorId: params.operatorId || undefined,
      operatorName: params.operatorName || undefined,
      metadata: {
        waveId: wave.id,
        waveNumber: wave.waveNumber,
      },
    })
  }

  return {
    waveId: wave.id,
    waveNumber: wave.waveNumber,
    pickOrders: createdPickOrders,
  }
}
