/**
 * Inventory allocation service
 */

import { prisma, type TransactionClient } from '@/lib/db/prisma'
import { createJob, JOB_TYPES } from '@/lib/queue'
import { operationLogService } from '@/lib/services/operation-log-service'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { extractInventoryCountLockMessage } from '@/lib/services/inventory-count-lock-guard'
import {
  updateBucketsInTransaction,
  checkInventoryAvailability,
} from './inventory-bucket-service'
import {
  createAllocateEvents,
  createDeallocateEvents,
  BucketType,
} from './inventory-event-service'
import { LockAcquisitionError, withAllocationLock, withInventoryLocks } from './inventory-lock-service'
import { Log } from '@/lib/logger'
import { parse } from '@/lib/utils/date-formatter'

type AllocationDetailWithAsnNumber = {
  id: string
  tenantId: string
  bucketId: string
  locationId: string
  skuId: string
  batchNumber: string
  lpn: string
  asnNumber: string
  allocatedQty: number
  shippedQty: number
  referenceType: string
  referenceId: string
  referenceNumber: string
  referenceLineId: string | null
  allocationType: string
  status: string
  allocatedAt: Date
  expiresAt: Date | null
  releasedAt: Date | null
  pickedAt: Date | null
  shippedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function parseDateString(value: unknown): Date | null {
  if (!value) return null
  let date: Date | null = null
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    date = parse(value, 'yyyy-MM-dd HH:mm:ss', new Date())
  }
  if (date) {
    date.setMilliseconds(0)
  }
  return date
}

type AllocationStrategy = 'FIFO' | 'FEFO' | 'LIFO'
type AllocationMode = 'FAST' | 'FAIR'

const SYNC_ALLOCATION_SKU_LOCK_OPTIONS = {
  ttlMs: 180000,
  retryCount: 300,
  retryDelayMs: 100,
} as const
const ALLOCATION_QUEUE_DISPATCH_MAX_RETRIES = 5
const ALLOCATION_QUEUE_DISPATCH_RETRY_DELAY_MS = 200

interface AllocationConfig {
  strategy: AllocationStrategy
  mode: AllocationMode
}

function getAvailableBucketOrderBy(strategy: AllocationStrategy): Array<Record<string, 'asc' | 'desc'>> {
  switch (strategy) {
    case 'FEFO':
      return [
        { expiryDate: 'asc' },
        { fifoDate: 'asc' },
        { asnNumber: 'asc' },
      ]
    case 'LIFO':
      return [
        { fifoDate: 'desc' },
        { asnNumber: 'desc' },
      ]
    case 'FIFO':
    default:
      return [
        { fifoDate: 'asc' },
        { asnNumber: 'asc' },
      ]
  }
}

const ALLOCATION_CONFIG_CACHE_TTL_MS = 30 * 1000
const allocationConfigCache = new Map<string, { value: AllocationConfig; expiresAt: number }>()

function buildAllocationConfigCacheKey(
  tenantId: string,
  clientId: string,
  warehouseId: string
): string {
  return `${tenantId}:${clientId}:${warehouseId}`
}

async function getAvailableBucketsInTransaction(
  client: TransactionClient,
  params: {
    tenantId: string
    warehouseId: string
    skuId: string
    clientId?: string
    strategy?: AllocationStrategy
    minQuantity?: number
    expiryDate?: Date | null
  }
) {
  const {
    tenantId,
    warehouseId,
    skuId,
    clientId,
    strategy = 'FIFO',
    minQuantity = 1,
    expiryDate,
  } = params

  const where: Record<string, unknown> = {
    tenantId,
    warehouseId,
    skuId,
    bucketType: BucketType.AVAILABLE,
    quantity: { gte: minQuantity },
  }

  if (clientId) {
    where.clientId = clientId
  }

  if (expiryDate) {
    where.expiryDate = expiryDate
  }

  return client.inventoryBucket.findMany({
    where,
    orderBy: getAvailableBucketOrderBy(strategy),
  })
}

export async function getAllocationConfig(
  tenantId: string,
  clientId: string,
  warehouseId: string
): Promise<AllocationConfig> {
  const cacheKey = buildAllocationConfigCacheKey(tenantId, clientId, warehouseId)
  const now = Date.now()
  const cached = allocationConfigCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const clientWarehouse = await prisma.clientWarehouse.findFirst({
    where: { tenantId, clientId, warehouseId, isActive: true },
    select: { config: true },
  })

  const cwConfig = clientWarehouse?.config as Record<string, unknown> | null

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { config: true },
  })

  const clientConfig = client?.config as Record<string, unknown> | null

  const resolved: AllocationConfig = {
    strategy:
      (cwConfig?.allocationStrategy as AllocationStrategy) ||
      (clientConfig?.allocationStrategy as AllocationStrategy) ||
      'FIFO',
    mode:
      (cwConfig?.allocationMode as AllocationMode) ||
      (clientConfig?.allocationMode as AllocationMode) ||
      'FAST',
  }

  allocationConfigCache.set(cacheKey, {
    value: resolved,
    expiresAt: now + ALLOCATION_CONFIG_CACHE_TTL_MS,
  })

  return resolved
}

export async function getAllocationStrategy(
  tenantId: string,
  clientId: string,
  warehouseId: string
): Promise<AllocationStrategy> {
  const config = await getAllocationConfig(tenantId, clientId, warehouseId)
  return config.strategy
}

export async function queueInventoryAllocation(
  order: { id: string; orderNumber: string; warehouseId: string; clientId: string },
  tenantId: string,
  userId: string
): Promise<void> {
  const config = await getAllocationConfig(tenantId, order.clientId, order.warehouseId)

  await createJob(
    {
      jobType: JOB_TYPES.INVENTORY_ALLOCATION,
      jobName: `库存分配 - ${order.orderNumber}`,
      inputData: {
        orderIds: [order.id],
        warehouseId: order.warehouseId,
        allocationStrategy: config.strategy,
        allocationMode: config.mode,
      },
      warehouseId: order.warehouseId,
      clientId: order.clientId,
    },
    tenantId,
    userId
  )
}

export async function queueInventoryAllocationWithRetry(
  order: { id: string; orderNumber: string; warehouseId: string; clientId: string },
  tenantId: string,
  userId: string
): Promise<void> {
  let lastError: unknown

  for (let attempt = 0; attempt < ALLOCATION_QUEUE_DISPATCH_MAX_RETRIES; attempt++) {
    try {
      await queueInventoryAllocation(order, tenantId, userId)
      return
    } catch (error) {
      lastError = error
      const errorMessage = error instanceof Error ? error.message : '未知错误'

      Log.warning('[AllocationQueue] 加入库存分配队列失败，准备重试', {
        order_id: order.id,
        order_number: order.orderNumber,
        warehouse_id: order.warehouseId,
        tenant_id: tenantId,
        attempt: attempt + 1,
        max_attempts: ALLOCATION_QUEUE_DISPATCH_MAX_RETRIES,
        error_message: errorMessage,
      })

      if (attempt === ALLOCATION_QUEUE_DISPATCH_MAX_RETRIES - 1) {
        break
      }

      await new Promise((resolve) =>
        setTimeout(resolve, ALLOCATION_QUEUE_DISPATCH_RETRY_DELAY_MS * (attempt + 1))
      )
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('加入库存分配队列失败')
}

export async function allocateInventorySync(
  orderId: string,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; message?: string; allocatedQty?: number }> {
  return withAllocationLock(tenantId, orderId, async () => {
    const order = await prisma.outboundOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        lines: {
          select: {
            id: true,
            skuId: true,
            sku: { select: { skuCode: true } },
            orderedQty: true,
            allocatedQty: true,
          },
        },
      },
    })

    if (!order) {
      return { success: false, message: '订单不存在' }
    }

    if (!['CREATED', 'PENDING'].includes(order.status)) {
      return { success: false, message: '订单状态不允许分配库存' }
    }

    const config = await getAllocationConfig(tenantId, order.clientId, order.warehouseId)
    const skuIds = [...new Set(
      order.lines
        .filter((line) => line.orderedQty - line.allocatedQty > 0)
        .map((line) => line.skuId)
    )].sort()

    if (skuIds.length === 0) {
      return { success: true, allocatedQty: 0 }
    }

    try {
      return await withInventoryLocks(
        skuIds.map((skuId) => ({
          type: 'SKU' as const,
          tenantId,
          warehouseId: order.warehouseId,
          skuId,
        })),
        async () => {

          for (const line of order.lines) {
            const requiredQty = line.orderedQty - line.allocatedQty
            if (requiredQty <= 0) continue

            const availability = await checkInventoryAvailability({
              tenantId,
              warehouseId: order.warehouseId,
              skuId: line.skuId,
              clientId: order.clientId,
              requiredQuantity: requiredQty,
            })

            if (!availability.sufficient) {
              operationLogService.logOperation({
                tenantId,
                entityType: 'OUTBOUND_ORDER',
                entityId: orderId,
                entityNumber: order.orderNumber,
                operationType: ORDER_OPERATION_TYPES.ALLOCATE_FAIL.type,
                operationName: ORDER_OPERATION_TYPES.ALLOCATE_FAIL.name,
                beforeStatus: order.status,
                afterStatus: order.status,
                remark: `SKU ${line.sku.skuCode} 库存不足，需要 ${requiredQty}，可用 ${availability.available}`,
                operatorId: userId,
              })

              await prisma.outboundOrder.update({
                where: { id: orderId },
                data: { status: 'OUT_OF_STOCK' },
              })

              operationLogService.logOperation({
                tenantId,
                entityType: 'OUTBOUND_ORDER',
                entityId: orderId,
                entityNumber: order.orderNumber,
                operationType: ORDER_OPERATION_TYPES.MARK_OUT_OF_STOCK.type,
                operationName: ORDER_OPERATION_TYPES.MARK_OUT_OF_STOCK.name,
                beforeStatus: order.status,
                afterStatus: 'OUT_OF_STOCK',
                remark: `SKU ${line.sku.skuCode} 库存不足，缺少 ${availability.shortage}`,
                operatorId: userId,
              })

              return {
                success: false,
                message: `SKU ${line.sku.skuCode} 库存不足，缺少 ${availability.shortage}`,
              }
            }
          }

          let totalAllocated = 0

          try {
            await prisma.$transaction(async (tx) => {
        const latestOrder = await tx.outboundOrder.findFirst({
          where: { id: orderId, tenantId },
          include: {
            lines: {
              select: {
                id: true,
                skuId: true,
                sku: { select: { skuCode: true } },
                orderedQty: true,
                allocatedQty: true,
              },
            },
          },
        })

        if (!latestOrder) {
          throw new Error('ORDER_NOT_FOUND')
        }

        if (!['CREATED', 'PENDING'].includes(latestOrder.status)) {
          throw new Error('ORDER_STATUS_INVALID')
        }

        for (const line of latestOrder.lines) {
          const requiredQty = line.orderedQty - line.allocatedQty
          if (requiredQty <= 0) continue

          const buckets = await getAvailableBucketsInTransaction(tx, {
            tenantId,
            warehouseId: latestOrder.warehouseId,
            skuId: line.skuId,
            clientId: latestOrder.clientId,
            strategy: config.strategy,
            minQuantity: 1,
          })

          let remainingQty = requiredQty
          let lineAllocatedQty = 0

          for (const bucket of buckets) {
            if (remainingQty <= 0) break

            const allocateQty = Math.min(remainingQty, bucket.quantity)
            if (allocateQty <= 0) continue

            const fifoDate = parseDateString(bucket.fifoDate)
            const expiryDate = parseDateString(bucket.expiryDate)

            const eventResult = await createAllocateEvents(
              {
                tenantId,
                clientId: latestOrder.clientId,
                warehouseId: latestOrder.warehouseId,
                locationId: bucket.locationId,
                skuId: bucket.skuId,
                skuCode: bucket.skuCode,
                batchNumber: bucket.batchNumber,
                lpn: bucket.lpn,
                asnNumber: bucket.asnNumber,
                quantity: allocateQty,
                referenceType: 'OUTBOUND_ORDER',
                referenceId: orderId,
                referenceNumber: latestOrder.orderNumber,
                referenceLineId: line.id,
                fifoDate,
                expiryDate,
                operatorId: userId,
              },
              tx
            )

            if (eventResult.count !== 2) {
              Log.warning('[AllocationService] 分配事件创建异常', {
                sku_code: bucket.skuCode,
                expected: 2,
                actual: eventResult.count,
              })
            }

            await updateBucketsInTransaction(
              [
                {
                  tenantId,
                  warehouseId: latestOrder.warehouseId,
                  locationId: bucket.locationId,
                  skuId: bucket.skuId,
                  skuCode: bucket.skuCode,
                  clientId: latestOrder.clientId,
                  batchNumber: bucket.batchNumber,
                  lpn: bucket.lpn,
                  asnNumber: bucket.asnNumber,
                  bucketType: BucketType.AVAILABLE,
                  quantityDelta: -allocateQty,
                },
                {
                  tenantId,
                  warehouseId: latestOrder.warehouseId,
                  locationId: bucket.locationId,
                  skuId: bucket.skuId,
                  skuCode: bucket.skuCode,
                  clientId: latestOrder.clientId,
                  batchNumber: bucket.batchNumber,
                  lpn: bucket.lpn,
                  asnNumber: bucket.asnNumber,
                  bucketType: BucketType.ALLOCATED,
                  quantityDelta: allocateQty,
                  fifoDate,
                  expiryDate,
                },
              ],
              tx
            )

            await tx.allocationDetail.create({
              data: {
                tenantId,
                bucketId: bucket.id,
                locationId: bucket.locationId,
                skuId: bucket.skuId,
                batchNumber: bucket.batchNumber || '',
                lpn: bucket.lpn || '',
                asnNumber: bucket.asnNumber || '',
                allocatedQty: allocateQty,
                referenceType: 'OUTBOUND_ORDER',
                referenceId: orderId,
                referenceNumber: latestOrder.orderNumber,
                referenceLineId: line.id,
                allocationType: 'SOFT',
                status: 'ALLOCATED',
              } as never,
            })

            remainingQty -= allocateQty
            lineAllocatedQty += allocateQty
            totalAllocated += allocateQty
          }

          if (remainingQty > 0) {
            throw new Error(`INSUFFICIENT_INVENTORY:${line.sku.skuCode}:${remainingQty}`)
          }

          await tx.outboundOrderLine.update({
            where: { id: line.id },
            data: {
              allocatedQty: line.allocatedQty + lineAllocatedQty,
              status: 'ALLOCATED',
            },
          })
        }

        await tx.outboundOrder.update({
          where: { id: orderId },
          data: {
            totalAllocatedQty: { increment: totalAllocated },
            status: 'ALLOCATED',
          },
        })

        await tx.orderTimeline.upsert({
          where: { orderId },
          create: {
            tenantId,
            orderId,
            allocatedAt: new Date(),
            allocatedBy: userId,
          },
          update: {
            allocatedAt: new Date(),
            allocatedBy: userId,
          },
        })
            }, { timeout: 30000 })
          } catch (error) {
            if (error instanceof Error && error.message.startsWith('INSUFFICIENT_INVENTORY:')) {
              const [, skuCode, shortageQty] = error.message.split(':')

              operationLogService.logOperation({
                tenantId,
                entityType: 'OUTBOUND_ORDER',
                entityId: orderId,
                entityNumber: order.orderNumber,
                operationType: ORDER_OPERATION_TYPES.ALLOCATE_FAIL.type,
                operationName: ORDER_OPERATION_TYPES.ALLOCATE_FAIL.name,
                beforeStatus: order.status,
                afterStatus: order.status,
                remark: `SKU ${skuCode} 库存不足，缺少 ${shortageQty}`,
                operatorId: userId,
              })

              await prisma.outboundOrder.update({
                where: { id: orderId },
                data: { status: 'OUT_OF_STOCK' },
              })

              operationLogService.logOperation({
                tenantId,
                entityType: 'OUTBOUND_ORDER',
                entityId: orderId,
                entityNumber: order.orderNumber,
                operationType: ORDER_OPERATION_TYPES.MARK_OUT_OF_STOCK.type,
                operationName: ORDER_OPERATION_TYPES.MARK_OUT_OF_STOCK.name,
                beforeStatus: order.status,
                afterStatus: 'OUT_OF_STOCK',
                remark: `SKU ${skuCode} 库存不足，缺少 ${shortageQty}`,
                operatorId: userId,
              })

              return {
                success: false,
                message: `SKU ${skuCode} 库存不足，缺少 ${shortageQty}`,
              }
            }

            if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
              return { success: false, message: '订单不存在' }
            }

            if (error instanceof Error && error.message === 'ORDER_STATUS_INVALID') {
              return { success: false, message: '订单状态不允许分配库存' }
            }

            throw error
          }

          operationLogService.logOperation({
            tenantId,
            entityType: 'OUTBOUND_ORDER',
            entityId: orderId,
            entityNumber: order.orderNumber,
            operationType: ORDER_OPERATION_TYPES.ALLOCATE.type,
            operationName: ORDER_OPERATION_TYPES.ALLOCATE.name,
            beforeStatus: order.status,
            afterStatus: 'ALLOCATED',
            operatorId: userId,
          })

          Log.info('[AllocationService] 订单分配成功', {
            order_number: order.orderNumber,
            order_id: orderId,
            allocated_qty: totalAllocated,
            sku_lock_count: skuIds.length,
          })
          return { success: true, allocatedQty: totalAllocated }
        },
        SYNC_ALLOCATION_SKU_LOCK_OPTIONS
      )
    } catch (error) {
      const countLockMessage = extractInventoryCountLockMessage(error)
      if (countLockMessage) {
        return { success: false, message: countLockMessage }
      }

      if (error instanceof LockAcquisitionError) {
        return { success: false, message: '热点SKU锁等待超时，请稍后重试' }
      }

      throw error
    }
  })
}

export async function deallocateInventorySync(
  orderId: string,
  tenantId: string,
  userId: string,
  options?: {
    allowedStatuses?: string[]
    resetProgressQuantities?: boolean
    clearWaveContext?: boolean
    cancelShipments?: boolean
  }
): Promise<{ success: boolean; message?: string; deallocatedQty?: number }> {
  const allowedStatuses = options?.allowedStatuses || ['ALLOCATED', 'OUT_OF_STOCK']

  return withAllocationLock(tenantId, orderId, async () => {
    const order = await prisma.outboundOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        lines: {
          select: {
            id: true,
            skuId: true,
            sku: { select: { skuCode: true } },
            allocatedQty: true,
          },
        },
      },
    })

    if (!order) {
      return { success: false, message: '订单不存在' }
    }

    if (!allowedStatuses.includes(order.status)) {
      return { success: false, message: '订单状态不允许取消分配' }
    }

    let totalDeallocated = 0

    try {
      await prisma.$transaction(async (tx) => {
        const latestOrder = await tx.outboundOrder.findFirst({
          where: { id: orderId, tenantId },
          include: {
            lines: {
              select: {
                id: true,
                skuId: true,
                sku: { select: { skuCode: true } },
                allocatedQty: true,
              },
            },
          },
        })

        if (!latestOrder) {
          throw new Error('ORDER_NOT_FOUND')
        }

        if (!allowedStatuses.includes(latestOrder.status)) {
          throw new Error('ORDER_STATUS_INVALID')
        }

        for (const line of latestOrder.lines) {
          if (line.allocatedQty <= 0) continue

          const allocations = await tx.allocationDetail.findMany({
            where: {
              tenantId,
              referenceType: 'OUTBOUND_ORDER',
              referenceId: orderId,
              referenceLineId: line.id,
              status: { in: ['ALLOCATED', 'PICKING', 'PICKED'] },
            },
            orderBy: [{ allocatedAt: 'asc' }, { createdAt: 'asc' }],
          }) as AllocationDetailWithAsnNumber[]

          let releasedQty = 0

          for (const allocation of allocations) {
            const remainingAllocationQty = allocation.allocatedQty - allocation.shippedQty
            if (remainingAllocationQty <= 0) continue

            const sourceBucketType = ['PICKING', 'PICKED'].includes(allocation.status)
              ? BucketType.PICKING
              : BucketType.ALLOCATED

            const bucket = await tx.inventoryBucket.findFirst({
              where: {
                tenantId,
                warehouseId: latestOrder.warehouseId,
                locationId: allocation.locationId,
                skuId: allocation.skuId,
                batchNumber: allocation.batchNumber,
                lpn: allocation.lpn,
                asnNumber: allocation.asnNumber,
                bucketType: sourceBucketType,
                quantity: { gt: 0 },
              },
              select: {
                id: true,
                locationId: true,
                skuId: true,
                skuCode: true,
                batchNumber: true,
                lpn: true,
                asnNumber: true,
                expiryDate: true,
                fifoDate: true,
                quantity: true,
              },
            })

            if (!bucket) {
              throw new Error(`ALLOCATED_BUCKET_NOT_FOUND:${line.sku.skuCode}:${allocation.id}`)
            }

            const deallocateQty = Math.min(remainingAllocationQty, bucket.quantity)
            if (deallocateQty <= 0) continue

            await createDeallocateEvents(
              {
                tenantId,
                clientId: latestOrder.clientId,
                warehouseId: latestOrder.warehouseId,
                locationId: bucket.locationId,
                skuId: bucket.skuId,
                skuCode: bucket.skuCode,
                batchNumber: bucket.batchNumber,
                lpn: bucket.lpn,
                asnNumber: allocation.asnNumber,
                quantity: deallocateQty,
                referenceType: 'OUTBOUND_ORDER',
                referenceId: orderId,
                referenceNumber: latestOrder.orderNumber,
                referenceLineId: line.id,
                operatorId: userId,
              },
              tx
            )

            await updateBucketsInTransaction(
              [
                {
                  tenantId,
                  warehouseId: latestOrder.warehouseId,
                  locationId: bucket.locationId,
                  skuId: bucket.skuId,
                  skuCode: bucket.skuCode,
                  clientId: latestOrder.clientId,
                  batchNumber: bucket.batchNumber,
                  lpn: bucket.lpn,
                  asnNumber: allocation.asnNumber,
                  bucketType: sourceBucketType,
                  quantityDelta: -deallocateQty,
                },
                {
                  tenantId,
                  warehouseId: latestOrder.warehouseId,
                  locationId: bucket.locationId,
                  skuId: bucket.skuId,
                  skuCode: bucket.skuCode,
                  clientId: latestOrder.clientId,
                  batchNumber: bucket.batchNumber,
                  lpn: bucket.lpn,
                  asnNumber: allocation.asnNumber,
                  bucketType: BucketType.AVAILABLE,
                  quantityDelta: deallocateQty,
                  fifoDate: parseDateString(bucket.fifoDate),
                  expiryDate: parseDateString(bucket.expiryDate),
                },
              ],
              tx
            )

            releasedQty += deallocateQty
            totalDeallocated += deallocateQty

            await tx.allocationDetail.update({
              where: { id: allocation.id },
              data: {
                status: 'RELEASED',
                releasedAt: new Date(),
              },
            })
          }

          await tx.outboundOrderLine.update({
            where: { id: line.id },
            data: {
              allocatedQty: Math.max(0, line.allocatedQty - releasedQty),
              ...(options?.resetProgressQuantities
                ? {
                    pickedQty: 0,
                    packedQty: 0,
                    shippedQty: 0,
                  }
                : {}),
              status: 'PENDING',
            },
          })
        }

        if (options?.cancelShipments) {
          await tx.shipment.updateMany({
            where: {
              tenantId,
              orderId,
              status: { in: ['CREATED', 'READY'] },
            },
            data: {
              status: 'CANCELLED',
              notes: '订单拦截回库后自动取消包裹',
              updatedBy: userId,
            },
          })
        }

        await tx.outboundOrder.update({
          where: { id: orderId },
          data: {
            totalAllocatedQty: 0,
            ...(options?.resetProgressQuantities
              ? {
                  totalPickedQty: 0,
                  totalPackedQty: 0,
                  totalShippedQty: 0,
                }
              : {}),
            ...(options?.clearWaveContext
              ? {
                  waveId: null,
                  waveStrategyId: null,
                  waveStrategyVersionId: null,
                  waveTypeCode: null,
                  downstreamMode: null,
                  manifestOrderId: null,
                }
              : {}),
            status: 'PENDING',
          },
        })
      })
    } catch (error) {
      const countLockMessage = extractInventoryCountLockMessage(error)
      if (countLockMessage) {
        return { success: false, message: countLockMessage }
      }

      if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
        return { success: false, message: '订单不存在' }
      }

      if (error instanceof Error && error.message === 'ORDER_STATUS_INVALID') {
        return { success: false, message: '订单状态不允许取消分配' }
      }

      if (error instanceof Error && error.message.startsWith('ALLOCATED_BUCKET_NOT_FOUND:')) {
        const [, skuCode] = error.message.split(':')
        return { success: false, message: `未找到已分配库存桶，无法回滚: ${skuCode}` }
      }

      throw error
    }

    operationLogService.logOperation({
      tenantId,
      entityType: 'OUTBOUND_ORDER',
      entityId: orderId,
      entityNumber: order.orderNumber,
      operationType: ORDER_OPERATION_TYPES.DEALLOCATE.type,
      operationName: ORDER_OPERATION_TYPES.DEALLOCATE.name,
      beforeStatus: order.status,
      afterStatus: 'PENDING',
      operatorId: userId,
    })

    return { success: true, deallocatedQty: totalDeallocated }
  })
}
