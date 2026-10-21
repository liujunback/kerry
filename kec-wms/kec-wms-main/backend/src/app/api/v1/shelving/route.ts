import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { generatePutawayDetailNumber } from '@/lib/utils/number-generator'
import { z } from 'zod'
import { asnStateMachine, AsnStatus } from '@/lib/services/asn-state-machine'
import { withSkuLock } from '@/lib/services/inventory-lock-service'
import { putaway } from '@/lib/services/inventory-operation-service'
import { BucketType, type BucketTypeValue } from '@/lib/services/inventory-event-service'
import { getBucket } from '@/lib/services/inventory-bucket-service'
import { triggerSnapshotUpdate, updateLocationSnapshot, updateSkuSummary } from '@/lib/services/inventory-snapshot-service'

// 容器上架请求验证
const containerShelvingSchema = z.object({
  mode: z.literal('container').optional().default('container'),
  containerId: z.string().min(1, '容器ID不能为空'),
  containerCode: z.string().min(1, '容器编码不能为空'),
  locationId: z.string().min(1, '货位ID不能为空'),
  locationCode: z.string().min(1, '货位编码不能为空'),
  skuId: z.string().min(1, 'SKU ID不能为空'),
  skuCode: z.string().min(1, 'SKU编码不能为空'),
  batchNumber: z.string().nullable().optional(),
  qualityStatus: z.enum(['GOOD', 'DAMAGED']),
  quantity: z.number().int().positive('数量必须大于0'),
  serialNumbers: z.array(z.string()).default([]),
  deviceType: z.enum(['WEB', 'PDA']).optional().default('WEB'),
})

// SKU上架请求验证
const skuShelvingSchema = z.object({
  mode: z.literal('sku'),
  locationId: z.string().min(1, '货位ID不能为空'),
  locationCode: z.string().min(1, '货位编码不能为空'),
  skuId: z.string().min(1, 'SKU ID不能为空'),
  skuCode: z.string().min(1, 'SKU编码不能为空'),
  quantity: z.number().int().positive('数量必须大于0'),
  serialNumbers: z.array(z.string()).default([]),
  warehouseId: z.string().min(1, '仓库ID不能为空'),
  clientId: z.string().min(1, '客户ID不能为空'),
  putawayOrderId: z.string().optional(),
  // 指定上架单行ID（用于精确匹配效期/批次）
  putawayLineId: z.string().optional(),
  // 效期和批次信息（用于校验）
  batchNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  deviceType: z.enum(['WEB', 'PDA']).optional().default('WEB'),
})

// POST /api/v1/shelving - 提交上架记录
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const tenantId = auth.user.tenantId
    const userId = auth.user.id

    // 判断上架模式
    const mode = body.mode || 'container'

    if (mode === 'sku') {
      // SKU上架模式
      const validationResult = skuShelvingSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: validationResult.error.errors[0].message },
          { status: 400 }
        )
      }

      const data = validationResult.data
      const result = await handleSkuShelving(tenantId, userId, data, auth.user.name || undefined)
      return NextResponse.json({
        success: true,
        data: { inventoryId: result.inventoryId, detailId: result.detailId },
        message: '上架成功',
      })
    } else {
      // 容器上架模式
      const validationResult = containerShelvingSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: validationResult.error.errors[0].message },
          { status: 400 }
        )
      }

      const data = validationResult.data
      const result = await handleContainerShelving(tenantId, userId, data, auth.user.name || undefined)
      return NextResponse.json({
        success: true,
        data: { inventoryId: result.inventoryId, detailId: result.detailId },
        message: '上架成功',
      })
    }
  } catch (error) {
    console.error('上架失败:', error)
    const message = error instanceof Error ? error.message : '上架失败'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
})

// SKU上架处理
async function handleSkuShelving(
  tenantId: string,
  userId: string,
  data: z.infer<typeof skuShelvingSchema>,
  operatorName?: string
) {
  // 获取仓库信息用于生成单号
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: data.warehouseId },
    select: { warehouseCode: true },
  })

  // 预生成上架详情单号（避免在事务内调用，减少事务耗时）
  const detailNumber = await generatePutawayDetailNumber(tenantId, warehouse?.warehouseCode || 'WH')

  // 使用 SKU 级锁保护库存操作
  return await withSkuLock(tenantId, data.warehouseId, data.skuId, async () => {
  const txResult = await prisma.$transaction(async (tx) => {
    // 1. 获取SKU信息
    const sku = await tx.sku.findUnique({
      where: { id: data.skuId },
      select: { isSerialManaged: true, clientId: true, skuName: true },
    })

    if (!sku) {
      throw new Error('SKU不存在')
    }


    // 2. 验证序列号（如果是序列号管理SKU）
    if (sku.isSerialManaged) {
      if (data.serialNumbers.length !== data.quantity) {
        throw new Error(`序列号数量(${data.serialNumbers.length})与上架数量(${data.quantity})不一致`)
      }

      // 验证序列号是否存在且可用
      const validSerials = await tx.serialNumber.findMany({
        where: {
          serialNumber: { in: data.serialNumbers },
          skuId: data.skuId,
          status: 'IN_STOCK',
        },
      })

      if (validSerials.length !== data.serialNumbers.length) {
        const validSerialSet = new Set(validSerials.map(s => s.serialNumber))
        const invalidSerials = data.serialNumbers.filter(sn => !validSerialSet.has(sn))
        throw new Error(`无效的序列号: ${invalidSerials.join(', ')}`)
      }
    }

    // 3. 获取货位信息
    const location = await tx.binLocation.findUnique({
      where: { id: data.locationId },
      select: {
        zoneId: true,
        warehouseId: true,
        lockStatus: true,
        locationCode: true,
        isReceivable: true,
        zone: {
          select: { qualityType: true, zoneName: true },
        },
      },
    })

    if (!location) {
      throw new Error('货位不存在')
    }

    // 检查货位是否被锁定
    if (location.lockStatus === 'LOCKED') {
      throw new Error(`货位 ${location.locationCode} 已锁定，不允许上架`)
    }

    // 检查货位是否允许上架
    if (!location.isReceivable) {
      throw new Error(`货位 ${location.locationCode} 不允许上架，请选择可上架的货位`)
    }

    // 4. 查找上架单行
    // 优先使用指定的 putawayLineId（前端选择的效期/批次）
    // 否则按 SKU 和上架单/仓库匹配
    // 注意：前端传来的 putawayLineId 可能是合并后的多个ID，用逗号分隔，需要查询所有行
    const putawayLineInclude = {
      putawayOrder: true,
      asnLine: {
        include: {
          asn: {
            select: {
              asnNumber: true,
              signedAt: true,
              actualArrivalAt: true,
            }
          },
        },
      },
    } as const

    type PutawayLineWithRelations = Prisma.PutawayOrderLineGetPayload<{
      include: typeof putawayLineInclude
    }>

    let putawayLinesBasic: PutawayLineWithRelations[] = []

    if (data.putawayLineId) {
      // 如果指定了上架单行ID（用户选择了特定效期/批次），查询所有匹配的行
      const lineIds = data.putawayLineId.split(',')
      putawayLinesBasic = await tx.putawayOrderLine.findMany({
        where: {
          id: { in: lineIds },
          tenantId,
          skuId: data.skuId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: putawayLineInclude,
        orderBy: { remainingQty: 'desc' },
      })
    } else {
      // 否则按 SKU 和上架单/仓库匹配
      const putawayLineWhere: {
        tenantId: string
        skuId: string
        status: { in: string[] }
        putawayOrderId?: string
        putawayOrder?: { warehouseId: string }
      } = {
        tenantId,
        skuId: data.skuId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      }

      if (data.putawayOrderId) {
        putawayLineWhere.putawayOrderId = data.putawayOrderId
      } else {
        putawayLineWhere.putawayOrder = { warehouseId: data.warehouseId }
      }

      const singleLine = await tx.putawayOrderLine.findFirst({
        where: putawayLineWhere,
        include: putawayLineInclude,
        orderBy: { remainingQty: 'desc' },
      })
      if (singleLine) {
        putawayLinesBasic = [singleLine]
      }
    }

    if (putawayLinesBasic.length === 0) {
      throw new Error('未找到匹配的上架单行')
    }

    // 使用第一行作为基础信息（效期、批次、qualityType 等应该相同，因为是按这些字段合并的）
    const putawayLineBasic = putawayLinesBasic[0]

    // 5. 校验效期一致性：不同效期的 SKU 不允许上架到相同的库位
    // 检查目标库位是否已有该 SKU 的库存
    const existingInventory = await tx.inventoryBucket.findFirst({
      where: {
        tenantId,
        locationId: data.locationId,
        skuId: data.skuId,
        quantity: { gt: 0 },
      },
      select: {
        expiryDate: true,
        batchNumber: true,
      },
    })

    if (existingInventory) {
      // 库位上已有该 SKU 的库存，检查效期是否一致
      const existingExpiry = existingInventory.expiryDate
        ? new Date(existingInventory.expiryDate).toISOString().split('T')[0]
        : null
      const newExpiry = putawayLineBasic.expiryDate
        ? new Date(putawayLineBasic.expiryDate).toISOString().split('T')[0]
        : null

      if (existingExpiry !== newExpiry) {
        throw new Error(
          `该库位已有效期为 ${existingExpiry || '无'} 的库存，` +
          `不能上架效期为 ${newExpiry || '无'} 的商品。` +
          `请选择其他库位或相同效期的商品。`
        )
      }

      // 检查批次是否一致
      const existingBatch = existingInventory.batchNumber || ''
      const newBatch = putawayLineBasic.batchNumber || ''

      if (existingBatch !== newBatch) {
        throw new Error(
          `该库位已有批次为 ${existingBatch || '无'} 的库存，` +
          `不能上架批次为 ${newBatch || '无'} 的商品。` +
          `请选择其他库位或相同批次的商品。`
        )
      }
    }

    // 在事务内使用 FOR UPDATE 锁定所有上架单行，并重新查询最新数据
    const allLineIds = putawayLinesBasic.map(line => line.id)
    const lockedLines = await tx.$queryRaw<Array<{
      id: string
      remainingQty: number
      putawayQty: number
      status: string
    }>>`
      SELECT id, remaining_qty as "remainingQty", putaway_qty as "putawayQty", status
      FROM putaway_order_line
      WHERE id IN (${Prisma.join(allLineIds)})
      AND tenant_id = ${tenantId}
      FOR UPDATE
    `

    if (lockedLines.length === 0) {
      throw new Error('上架单行不存在')
    }

    // 过滤掉已完成的行，只保留可用的行
    const availableLockedLines = lockedLines.filter(line =>
      line.status !== 'COMPLETED' && line.remainingQty > 0
    )

    if (availableLockedLines.length === 0) {
      throw new Error('该上架单行已完成或没有剩余待上架数量')
    }

    // 计算所有可用行的总剩余数量
    const totalRemainingQty = availableLockedLines.reduce((sum, line) => sum + line.remainingQty, 0)

    // 校验请求数量不超过总剩余数量
    if (data.quantity > totalRemainingQty) {
      throw new Error(`上架数量(${data.quantity})超过剩余待上架数量(${totalRemainingQty})`)
    }

    // 使用第一行作为基础信息（用于效期、批次等校验）
    const firstLockedLine = availableLockedLines[0]
    const putawayLine = {
      ...putawayLineBasic,
      remainingQty: firstLockedLine.remainingQty,
      putawayQty: firstLockedLine.putawayQty,
      status: firstLockedLine.status,
    }

    // 构建行ID到基础数据的映射
    const basicLineMap = new Map(putawayLinesBasic.map(line => [line.id, line]))

    // 验证库区质量类型与商品质量类型是否匹配
    const zoneQualityType = location.zone?.qualityType || 'GOOD'
    const itemQualityType = putawayLine?.qualityType || 'GOOD'

    // 良品只能放到良品库区，不良品只能放到不良品库区
    if (itemQualityType === 'GOOD' && zoneQualityType !== 'GOOD') {
      throw new Error(`良品不能上架到${location.zone?.zoneName || '非良品'}库区`)
    }
    if (itemQualityType === 'DAMAGED' && zoneQualityType === 'GOOD') {
      throw new Error(`不良品不能上架到${location.zone?.zoneName || '良品'}库区，请选择不良品库区`)
    }

    // 5. 使用事件溯源系统上架（传递批次信息和质量类型）
    // FIFO日期使用ASN签收时间，如果没有则使用实际到货时间，都没有则使用当前时间
    const asnFifoDate = putawayLine?.asnLine?.asn?.signedAt
      || putawayLine?.asnLine?.asn?.actualArrivalAt
      || new Date()

    // 将 expiryDate 转换为 Date 对象（如果是字符串）
    const expiryDate = putawayLine?.expiryDate
      ? (putawayLine.expiryDate instanceof Date ? putawayLine.expiryDate : new Date(putawayLine.expiryDate))
      : null

    const putawayResult = await putaway({
      tenantId,
      clientId: data.clientId,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      skuId: data.skuId,
      skuCode: data.skuCode,
      quantity: data.quantity,
      batchNumber: putawayLine?.batchNumber,
      asnNumber: putawayLine?.asnLine?.asn?.asnNumber,
      expiryDate,
      fifoDate: asnFifoDate,
      referenceType: 'SKU_SHELVING',
      referenceId: putawayLine?.asnLine?.asnId,
      referenceNumber: putawayLine?.asnLine?.asn?.asnNumber,
      referenceLineId: putawayLine?.asnLineId,
      operatorId: userId,
      qualityType: itemQualityType as 'GOOD' | 'DAMAGED',
    }, tx)

    // 6. 更新序列号位置信息（如果是序列号管理SKU）
    if (sku.isSerialManaged && data.serialNumbers.length > 0) {
      await tx.serialNumber.updateMany({
        where: {
          serialNumber: { in: data.serialNumbers },
          skuId: data.skuId,
        },
        data: {
          warehouseId: data.warehouseId,
          putawayAt: new Date(),
          putawayOrderId: putawayLine?.putawayOrderId || null,
          updatedBy: userId,
        },
      })
    }

    let detailId: string | null = null

    if (putawayLine) {
      // 获取库存桶ID（需要传递批次信息和质量类型以正确匹配）
      const bucketType = itemQualityType === 'DAMAGED' ? BucketType.DEFECTIVE : BucketType.AVAILABLE

      // 将 expiryDate 转换为 Date 对象（如果是字符串）
      const expiryDateForBucket = putawayLine.expiryDate
        ? (putawayLine.expiryDate instanceof Date ? putawayLine.expiryDate : new Date(putawayLine.expiryDate))
        : null

      const bucket = await getBucket({
        tenantId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        skuId: data.skuId,
        batchNumber: putawayLine.batchNumber,
        expiryDate: expiryDateForBucket,
        bucketType,
      })

      // 7. 创建上架详情记录
      const putawayDetail = await tx.putawayDetail.create({
        data: {
          tenantId,
          detailNumber,
          putawayOrderId: putawayLine.putawayOrderId,
          putawayLineId: putawayLine.id,
          skuId: data.skuId,
          skuCode: data.skuCode,
          skuName: sku.skuName,
          batchNumber: putawayLine.batchNumber,
          lotNumber: putawayLine.lotNumber,
          expiryDate: putawayLine.expiryDate
            ? (putawayLine.expiryDate instanceof Date ? putawayLine.expiryDate : new Date(putawayLine.expiryDate))
            : null,
          qualityType: putawayLine.qualityType,
          quantity: data.quantity,
          locationId: data.locationId,
          locationCode: data.locationCode,
          bucketId: bucket?.id,
          serialNumbers: data.serialNumbers.length > 0 ? data.serialNumbers : undefined,
          putawayAt: new Date(),
          putawayBy: userId,
          deviceType: data.deviceType || 'WEB',
        },
      })
      detailId = putawayDetail.id

      // 8. 更新上架单行（支持跨多行消耗）
      // 按 remainingQty 降序排列可用行，优先消耗剩余数量最多的行
      const sortedAvailableLines = [...availableLockedLines].sort((a, b) => b.remainingQty - a.remainingQty)
      let remainingToAllocate = data.quantity
      const updatedLineIds: string[] = []

      for (const lockedLine of sortedAvailableLines) {
        if (remainingToAllocate <= 0) break

        const basicLine = basicLineMap.get(lockedLine.id)
        if (!basicLine) continue

        const allocateQty = Math.min(remainingToAllocate, lockedLine.remainingQty)
        const newPutawayQty = lockedLine.putawayQty + allocateQty
        const newRemainingQty = lockedLine.remainingQty - allocateQty
        const isLineCompleted = newRemainingQty <= 0

        await tx.putawayOrderLine.update({
          where: { id: lockedLine.id },
          data: {
            putawayQty: newPutawayQty,
            remainingQty: Math.max(0, newRemainingQty),
            status: isLineCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            startedAt: basicLine.startedAt ? undefined : new Date(),
            completedAt: isLineCompleted ? new Date() : null,
            updatedBy: userId,
          },
        })

        if (basicLine.containerId) {
          const containerItem = await tx.containerItem.findFirst({
            where: {
              tenantId,
              putawayOrderLineId: lockedLine.id,
            },
            select: {
              id: true,
              quantity: true,
            },
          })

          if (containerItem) {
            const newContainerItemQty = containerItem.quantity - allocateQty
            if (newContainerItemQty <= 0) {
              await tx.containerItem.delete({
                where: { id: containerItem.id },
              })
            } else {
              await tx.containerItem.update({
                where: { id: containerItem.id },
                data: { quantity: newContainerItemQty },
              })
            }
          }
        }

        updatedLineIds.push(lockedLine.id)
        remainingToAllocate -= allocateQty

        // 更新对应的 ASN 行（如果有）
        if (basicLine.asnLineId) {
          const lockedAsnLineRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM asn_line
            WHERE id = ${basicLine.asnLineId}
            FOR UPDATE
          `

          if (lockedAsnLineRows.length === 0) {
            throw new Error('ASN行不存在')
          }

          const asnLine = await tx.asnLine.findUnique({
            where: { id: basicLine.asnLineId },
            select: {
              id: true,
              putawayQty: true,
              receivedQty: true,
            },
          })

          if (asnLine) {
            const newAsnLinePutawayQty = asnLine.putawayQty + allocateQty
            const isAsnLineCompleted = newAsnLinePutawayQty >= asnLine.receivedQty

            await tx.asnLine.update({
              where: { id: asnLine.id },
              data: {
                putawayQty: newAsnLinePutawayQty,
                status: isAsnLineCompleted ? 'COMPLETED' : 'PUTAWAY',
                updatedBy: userId,
              },
            })
          }
        }
      }

      const affectedContainerIds = [
        ...new Set(
          putawayLinesBasic
            .map((line) => line.containerId)
            .filter((containerId): containerId is string => Boolean(containerId))
        ),
      ]

      for (const containerId of affectedContainerIds) {
        const pendingContainerItems = await tx.containerItem.count({
          where: {
            containerId,
            OR: [
              { putawayOrderLineId: null },
              { putawayOrderLine: { is: { status: { not: 'COMPLETED' } } } },
              { putawayOrderLine: { is: { remainingQty: { gt: 0 } } } },
            ],
          },
        })

        if (pendingContainerItems === 0) {
          await tx.container.update({
            where: { id: containerId },
            data: {
              workStatus: 'IDLE',
              currentAsnId: null,
              currentBatchNumber: null,
              currentQualityStatus: null,
              currentSkuId: null,
              closedAt: null,
            },
          })
        }
      }

      // 9. 更新上架单
      const lockedOrderRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM putaway_order
        WHERE id = ${putawayLine.putawayOrderId}
        AND tenant_id = ${tenantId}
        FOR UPDATE
      `

      if (lockedOrderRows.length === 0) {
        throw new Error('上架单不存在')
      }

      const putawayOrder = await tx.putawayOrder.findUnique({
        where: { id: putawayLine.putawayOrderId },
        select: {
          id: true,
          putawayQty: true,
          pendingQty: true,
          putawayStartTime: true,
        },
      })

      if (!putawayOrder) {
        throw new Error('上架单不存在')
      }

      const newOrderPutawayQty = putawayOrder.putawayQty + data.quantity
      const newOrderPendingQty = putawayOrder.pendingQty - data.quantity

      // 检查所有行是否完成（排除本次更新的行，因为它们的状态已经在上面更新了）
      const incompleteLines = await tx.putawayOrderLine.count({
        where: {
          putawayOrderId: putawayOrder.id,
          id: { notIn: updatedLineIds },
          status: { not: 'COMPLETED' },
        },
      })

      // 检查本次更新的行是否全部完成
      const updatedLinesAllCompleted = await tx.putawayOrderLine.count({
        where: {
          id: { in: updatedLineIds },
          status: { not: 'COMPLETED' },
        },
      }) === 0

      // 只有当所有行都完成时，上架单才能标记为完成
      const isOrderCompleted = incompleteLines === 0 && updatedLinesAllCompleted
      const orderStatus = isOrderCompleted ? 'COMPLETED' : 'PARTIAL'

      await tx.putawayOrder.update({
        where: { id: putawayOrder.id },
        data: {
          putawayQty: newOrderPutawayQty,
          pendingQty: Math.max(0, newOrderPendingQty),
          status: orderStatus,
          putawayStartTime: putawayOrder.putawayStartTime ? undefined : new Date(),
          putawayEndTime: isOrderCompleted ? new Date() : null,
          updatedBy: userId,
        },
      })

      // 10. 更新ASN（ASN行已经在上面的循环中更新了）
      // 找一个有 asnLineId 的行来获取 ASN 信息
      const lineWithAsn = putawayLinesBasic.find(line => line.asnLineId)
      if (lineWithAsn?.asnLineId) {
        const asnLine = await tx.asnLine.findUnique({
          where: { id: lineWithAsn.asnLineId },
        })

        if (asnLine) {
          // 11. 更新ASN
          const lockedAsnRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM asn
            WHERE id = ${asnLine.asnId}
            AND tenant_id = ${tenantId}
            FOR UPDATE
          `

          if (lockedAsnRows.length === 0) {
            throw new Error('ASN不存在')
          }

          const asn = await tx.asn.findUnique({
            where: { id: asnLine.asnId },
            select: {
              id: true,
              asnNumber: true,
              status: true,
              totalPutawayQty: true,
              totalReceivedQty: true,
              receivingEndAt: true,
              putawayStartAt: true,
            },
          })

          if (asn) {
            const newAsnPutawayQty = asn.totalPutawayQty + data.quantity
            const isAsnPutawayQtyReached = newAsnPutawayQty >= asn.totalReceivedQty

            // 检查该ASN下的所有上架单是否都完成
            const incompletePutawayOrders = await tx.putawayOrder.count({
              where: {
                asnId: asn.id,
                status: { not: 'COMPLETED' },
              },
            })

            // ASN完成的条件：上架数量达到收货数量 且 所有上架单都完成
            const isAsnCompleted = isAsnPutawayQtyReached && incompletePutawayOrders === 0

            // 检查收货是否已完成 - 如果收货未完成，不能标记为已完成
            const isReceivingCompleted = asn.receivingEndAt !== null
            const canMarkAsCompleted = isAsnCompleted && isReceivingCompleted

            // 检查 ASN 状态转换的合法性
            // 允许 RECEIVING、RECEIVED 或 PUTTING_AWAY 状态下上架
            const isValidStateForPutaway = ['RECEIVING', 'RECEIVED', 'PUTTING_AWAY'].includes(asn.status)

            if (!isValidStateForPutaway) {
              throw new Error(
                `ASN ${asn.asnNumber} 状态为 ${asn.status}，不允许上架。`
              )
            }

            // 确定新状态 - 只有在收货完成后才能转换状态
            // RECEIVING 状态下上架不改变状态，只更新上架数量
            let newStatus = asn.status
            if (isReceivingCompleted && asn.status !== 'RECEIVING') {
              // 收货已完成，可以进行状态转换
              if (asn.status === 'RECEIVED' && !isAsnCompleted) {
                // 从 RECEIVED 转换到 PUTTING_AWAY
                newStatus = 'PUTTING_AWAY'
              } else if (canMarkAsCompleted) {
                // 上架完成
                newStatus = 'COMPLETED'
              }
            }
            // 如果收货未完成，保持当前状态不变，只更新上架数量

            await tx.asn.update({
              where: { id: asn.id },
              data: {
                totalPutawayQty: newAsnPutawayQty,
                status: newStatus,
                putawayStartAt: asn.putawayStartAt ? undefined : new Date(),
                putawayEndAt: canMarkAsCompleted ? new Date() : null,
                completedAt: canMarkAsCompleted ? new Date() : null,
                updatedBy: userId,
              },
            })

            // 返回ASN状态变更信息用于记录日志
            return {
              inventoryId: putawayResult.eventId,
              detailId,
              asnStatusChange: newStatus !== asn.status ? {
                asnId: asn.id,
                asnNumber: asn.asnNumber,
                beforeStatus: asn.status,
                afterStatus: newStatus,
              } : null,
            }
          }
        }
      }
    }

    return { inventoryId: putawayResult.eventId, detailId, asnStatusChange: null }
  }, { timeout: 15000 })

  // 事务完成后，触发快照异步更新
  triggerSnapshotUpdate({
    tenantId,
    clientId: data.clientId,
    warehouseId: data.warehouseId,
    locationId: data.locationId,
    skuId: data.skuId,
    skuCode: data.skuCode,
  }).catch(async (err) => {
    console.error('[Shelving] 触发快照异步更新失败，尝试同步更新:', err)
    // 如果异步更新失败，立即执行同步更新
    try {
      await Promise.all([
        updateLocationSnapshot({
          tenantId,
          clientId: data.clientId,
          warehouseId: data.warehouseId,
          locationId: data.locationId,
          skuId: data.skuId,
          skuCode: data.skuCode,
        }),
        updateSkuSummary({
          tenantId,
          clientId: data.clientId,
          warehouseId: data.warehouseId,
          skuId: data.skuId,
          skuCode: data.skuCode,
        }),
      ])
      console.log('[Shelving] 同步快照更新成功')
    } catch (syncErr) {
      console.error('[Shelving] 同步快照更新也失败:', syncErr)
    }
  })

  // 记录操作日志（使用状态机）
  if (txResult.asnStatusChange) {
    asnStateMachine.logStatusChange(
      txResult.asnStatusChange.asnId,
      txResult.asnStatusChange.asnNumber,
      'COMPLETE_PUTAWAY',
      txResult.asnStatusChange.beforeStatus as AsnStatus,
      txResult.asnStatusChange.afterStatus as AsnStatus,
      {
        tenantId,
        userId,
        userName: operatorName,
      }
    )
  }

  return txResult
  })
}

// 容器上架处理
async function handleContainerShelving(
  tenantId: string,
  userId: string,
  data: z.infer<typeof containerShelvingSchema>,
  operatorName?: string
) {
  // 获取容器的仓库信息用于生成单号
  const container = await prisma.container.findUnique({
    where: { id: data.containerId },
    select: { warehouse: { select: { warehouseCode: true, id: true } } },
  })

  if (!container?.warehouse) {
    throw new Error('容器未关联仓库')
  }

  // 预生成上架详情单号（避免在事务内调用，减少事务耗时）
  const detailNumber = await generatePutawayDetailNumber(tenantId, container.warehouse.warehouseCode)

  // 使用 SKU 级锁保护库存操作
  return await withSkuLock(tenantId, container.warehouse.id, data.skuId, async () => {
  const txResult = await prisma.$transaction(async (tx) => {
    // 1. 验证容器物品
    const containerItem = await tx.containerItem.findFirst({
      where: {
        containerId: data.containerId,
        skuId: data.skuId,
        batchNumber: data.batchNumber || undefined,
        qualityType: data.qualityStatus,
        quantity: { gte: data.quantity },
      },
    })

    if (!containerItem) {
      throw new Error('容器中没有足够的库存')
    }

    // 2. 获取SKU信息
    const sku = await tx.sku.findUnique({
      where: { id: data.skuId },
      select: { isSerialManaged: true, clientId: true, skuName: true },
    })

    if (!sku) {
      throw new Error('SKU不存在')
    }

    // 3. 验证序列号（如果是序列号管理SKU）
    if (sku.isSerialManaged) {
      if (data.serialNumbers.length !== data.quantity) {
        throw new Error(`序列号数量(${data.serialNumbers.length})与上架数量(${data.quantity})不一致`)
      }

      // 验证序列号是否存在且可用
      const validSerials = await tx.serialNumber.findMany({
        where: {
          serialNumber: { in: data.serialNumbers },
          skuId: data.skuId,
          status: 'IN_STOCK',
        },
      })

      if (validSerials.length !== data.serialNumbers.length) {
        const validSerialSet = new Set(validSerials.map(s => s.serialNumber))
        const invalidSerials = data.serialNumbers.filter(sn => !validSerialSet.has(sn))
        throw new Error(`无效的序列号: ${invalidSerials.join(', ')}`)
      }
    }

    // 4. 获取货位信息
    const location = await tx.binLocation.findUnique({
      where: { id: data.locationId },
      select: {
        zoneId: true,
        warehouseId: true,
        lockStatus: true,
        locationCode: true,
        isReceivable: true,
        zone: {
          select: { qualityType: true, zoneName: true },
        },
      },
    })

    if (!location) {
      throw new Error('货位不存在')
    }

    // 检查货位是否被锁定
    if (location.lockStatus === 'LOCKED') {
      throw new Error(`货位 ${location.locationCode} 已锁定，不允许上架`)
    }

    // 检查货位是否允许上架
    if (!location.isReceivable) {
      throw new Error(`货位 ${location.locationCode} 不允许上架，请选择可上架的货位`)
    }

    // 验证库区质量类型与商品质量类型是否匹配
    const zoneQualityType = location.zone?.qualityType || 'GOOD'
    const itemQualityType = data.qualityStatus

    // 良品只能放到良品库区，不良品只能放到不良品库区
    if (itemQualityType === 'GOOD' && zoneQualityType !== 'GOOD') {
      throw new Error(`良品不能上架到${location.zone?.zoneName || '非良品'}库区`)
    }
    if (itemQualityType === 'DAMAGED' && zoneQualityType === 'GOOD') {
      throw new Error(`不良品不能上架到${location.zone?.zoneName || '良品'}库区，请选择不良品库区`)
    }

    // 根据质量状态决定桶类型
    const isGood = data.qualityStatus === 'GOOD'
    const bucketType: BucketTypeValue = isGood ? BucketType.AVAILABLE : BucketType.DEFECTIVE

    // 5. 查找上架单行（先查询基本信息，不加锁）
    // 按 remainingQty DESC 排序，优先使用剩余数量最多的行
    // 注意：需要匹配 qualityType，确保良品/不良品正确对应
    const putawayLineBasic = await tx.putawayOrderLine.findFirst({
      where: {
        containerId: data.containerId,
        skuId: data.skuId,
        qualityType: data.qualityStatus, // 匹配质量类型
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        putawayOrder: true,
        asnLine: {
          include: {
            asn: {
              select: {
                asnNumber: true,
                signedAt: true,
                actualArrivalAt: true,
              }
            },
          },
        },
      },
      orderBy: { remainingQty: 'desc' },
    })

    if (!putawayLineBasic) {
      // 检查是否有其他质量类型的上架单行，以提供更精确的错误信息
      const anyLineExists = await tx.putawayOrderLine.findFirst({
        where: {
          containerId: data.containerId,
          skuId: data.skuId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        select: { qualityType: true },
      })

      if (anyLineExists) {
        const qualityLabel = data.qualityStatus === 'GOOD' ? '良品' : '不良品'
        const existingLabel = anyLineExists.qualityType === 'GOOD' ? '良品' : '不良品'
        throw new Error(`未找到${qualityLabel}的上架单行，该容器只有${existingLabel}待上架`)
      }

      throw new Error('未找到匹配的上架单行，请先创建上架单')
    }

    // 在事务内使用 FOR UPDATE 锁定上架单行，并重新查询最新数据
    const lockedLines = await tx.$queryRaw<Array<{
      id: string
      remainingQty: number
      putawayQty: number
      status: string
    }>>`
      SELECT id, remaining_qty as remainingQty, putaway_qty as putawayQty, status
      FROM putaway_order_line
      WHERE id = ${putawayLineBasic.id}
      AND tenant_id = ${tenantId}
      FOR UPDATE
    `

    if (lockedLines.length === 0) {
      throw new Error('上架单行不存在')
    }

    const lockedLine = lockedLines[0]

    // 校验状态
    if (lockedLine.status === 'COMPLETED') {
      throw new Error('该上架单行已完成，无法继续上架')
    }

    // 校验剩余数量
    if (lockedLine.remainingQty <= 0) {
      throw new Error('该上架单行没有剩余待上架数量')
    }

    // 校验请求数量不超过剩余数量
    if (data.quantity > lockedLine.remainingQty) {
      throw new Error(`上架数量(${data.quantity})超过剩余待上架数量(${lockedLine.remainingQty})`)
    }

    // 使用基本信息，但数量使用锁定后的最新数据
    const putawayLine = {
      ...putawayLineBasic,
      remainingQty: lockedLine.remainingQty,
      putawayQty: lockedLine.putawayQty,
      status: lockedLine.status,
    }

    // 6. 校验效期一致性：不同效期的 SKU 不允许上架到相同的库位
    // 检查目标库位是否已有该 SKU 的库存
    const existingInventory = await tx.inventoryBucket.findFirst({
      where: {
        tenantId,
        locationId: data.locationId,
        skuId: data.skuId,
        quantity: { gt: 0 },
      },
      select: {
        expiryDate: true,
        batchNumber: true,
      },
    })

    if (existingInventory) {
      // 库位上已有该 SKU 的库存，检查效期是否一致
      const existingExpiry = existingInventory.expiryDate
        ? new Date(existingInventory.expiryDate).toISOString().split('T')[0]
        : null
      const newExpiry = putawayLine.expiryDate
        ? new Date(putawayLine.expiryDate).toISOString().split('T')[0]
        : null

      if (existingExpiry !== newExpiry) {
        throw new Error(
          `该库位已有效期为 ${existingExpiry || '无'} 的库存，` +
          `不能上架效期为 ${newExpiry || '无'} 的商品。` +
          `请选择其他库位或相同效期的商品。`
        )
      }

      // 检查批次是否一致
      const existingBatch = existingInventory.batchNumber || ''
      const newBatch = data.batchNumber || ''

      if (existingBatch !== newBatch) {
        throw new Error(
          `该库位已有批次为 ${existingBatch || '无'} 的库存，` +
          `不能上架批次为 ${newBatch || '无'} 的商品。` +
          `请选择其他库位或相同批次的商品。`
        )
      }
    }

    // 7. 使用事件溯源系统上架
    // FIFO日期使用ASN签收时间，如果没有则使用实际到货时间，都没有则使用当前时间
    const asnFifoDate = putawayLine?.asnLine?.asn?.signedAt
      || putawayLine?.asnLine?.asn?.actualArrivalAt
      || new Date()

    // 将 expiryDate 转换为 Date 对象（如果是字符串）
    const expiryDate = putawayLine?.expiryDate
      ? (putawayLine.expiryDate instanceof Date ? putawayLine.expiryDate : new Date(putawayLine.expiryDate))
      : null

    const putawayResult = await putaway({
      tenantId,
      clientId: sku.clientId,
      warehouseId: location.warehouseId,
      locationId: data.locationId,
      skuId: data.skuId,
      skuCode: data.skuCode,
      quantity: data.quantity,
      batchNumber: data.batchNumber,
      asnNumber: putawayLine?.asnLine?.asn?.asnNumber,
      expiryDate,
      fifoDate: asnFifoDate,
      referenceType: 'CONTAINER_SHELVING',
      referenceId: putawayLine?.asnLine?.asnId,
      referenceNumber: putawayLine?.asnLine?.asn?.asnNumber,
      referenceLineId: putawayLine?.asnLineId,
      operatorId: userId,
      qualityType: data.qualityStatus as 'GOOD' | 'DAMAGED',
    }, tx)

    // 8. 更新容器物品数量
    const newQuantity = containerItem.quantity - data.quantity
    if (newQuantity <= 0) {
      await tx.containerItem.delete({
        where: { id: containerItem.id },
      })
    } else {
      await tx.containerItem.update({
        where: { id: containerItem.id },
        data: { quantity: newQuantity },
      })
    }

    // 9. 检查容器是否还有物品，更新容器状态
    const remainingItems = await tx.containerItem.count({
      where: { containerId: data.containerId },
    })

    if (remainingItems === 0) {
      // 容器已清空，重置所有状态
      await tx.container.update({
        where: { id: data.containerId },
        data: {
          workStatus: 'IDLE',
          currentAsnId: null,
          currentBatchNumber: null,
          currentQualityStatus: null,
          currentSkuId: null,
          closedAt: null,
        },
      })
    }

    // 10. 更新序列号位置信息（如果是序列号管理SKU）
    if (sku.isSerialManaged && data.serialNumbers.length > 0) {
      await tx.serialNumber.updateMany({
        where: {
          serialNumber: { in: data.serialNumbers },
          skuId: data.skuId,
        },
        data: {
          warehouseId: location.warehouseId,
          putawayAt: new Date(),
          putawayOrderId: putawayLine?.putawayOrderId || null,
          updatedBy: userId,
        },
      })
    }

    let detailId: string | null = null

    if (putawayLine) {
      // 获取库存桶ID
      // 将 expiryDate 转换为 Date 对象（如果是字符串）
      const expiryDateForBucket = putawayLine.expiryDate
        ? (putawayLine.expiryDate instanceof Date ? putawayLine.expiryDate : new Date(putawayLine.expiryDate))
        : null

      const bucket = await getBucket({
        tenantId,
        warehouseId: location.warehouseId,
        locationId: data.locationId,
        skuId: data.skuId,
        batchNumber: data.batchNumber,
        expiryDate: expiryDateForBucket,
        bucketType,
      })

      // 11. 创建上架详情记录
      const putawayDetail = await tx.putawayDetail.create({
        data: {
          tenantId,
          detailNumber,
          putawayOrderId: putawayLine.putawayOrderId,
          putawayLineId: putawayLine.id,
          skuId: data.skuId,
          skuCode: data.skuCode,
          skuName: sku.skuName,
          batchNumber: data.batchNumber,
          qualityType: data.qualityStatus,
          quantity: data.quantity,
          locationId: data.locationId,
          locationCode: data.locationCode,
          bucketId: bucket?.id,
          containerId: data.containerId,
          containerCode: data.containerCode,
          serialNumbers: data.serialNumbers.length > 0 ? data.serialNumbers : undefined,
          putawayAt: new Date(),
          putawayBy: userId,
          deviceType: data.deviceType || 'WEB',
        },
      })
      detailId = putawayDetail.id

      // 12. 更新上架单行
      const newPutawayQty = putawayLine.putawayQty + data.quantity
      const newRemainingQty = putawayLine.remainingQty - data.quantity
      const isLineCompleted = newRemainingQty <= 0

      await tx.putawayOrderLine.update({
        where: { id: putawayLine.id },
        data: {
          putawayQty: newPutawayQty,
          remainingQty: Math.max(0, newRemainingQty),
          status: isLineCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          startedAt: putawayLine.startedAt ? undefined : new Date(),
          completedAt: isLineCompleted ? new Date() : null,
          updatedBy: userId,
        },
      })

      // 13. 更新上架单
      const lockedOrderRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM putaway_order
        WHERE id = ${putawayLine.putawayOrderId}
        AND tenant_id = ${tenantId}
        FOR UPDATE
      `

      if (lockedOrderRows.length === 0) {
        throw new Error('上架单不存在')
      }

      const putawayOrder = await tx.putawayOrder.findUnique({
        where: { id: putawayLine.putawayOrderId },
        select: {
          id: true,
          putawayQty: true,
          pendingQty: true,
          putawayStartTime: true,
        },
      })

      if (!putawayOrder) {
        throw new Error('上架单不存在')
      }

      const newOrderPutawayQty = putawayOrder.putawayQty + data.quantity
      const newOrderPendingQty = putawayOrder.pendingQty - data.quantity

      // 检查所有行是否完成（排除当前行，因为它可能刚被更新为COMPLETED）
      const incompleteLines = await tx.putawayOrderLine.count({
        where: {
          putawayOrderId: putawayOrder.id,
          id: { not: putawayLine.id },
          status: { not: 'COMPLETED' },
        },
      })

      // 只有当所有行都完成时，上架单才能标记为完成
      // 不能仅依赖 pendingQty，因为 pendingQty 只反映上架单的数量，不反映实际收货数量
      const isOrderCompleted = incompleteLines === 0 && isLineCompleted
      const orderStatus = isOrderCompleted ? 'COMPLETED' : 'PARTIAL'

      await tx.putawayOrder.update({
        where: { id: putawayOrder.id },
        data: {
          putawayQty: newOrderPutawayQty,
          pendingQty: Math.max(0, newOrderPendingQty),
          status: orderStatus,
          putawayStartTime: putawayOrder.putawayStartTime ? undefined : new Date(),
          putawayEndTime: isOrderCompleted ? new Date() : null,
          updatedBy: userId,
        },
      })

      // 14. 更新ASN行
      if (putawayLine.asnLineId) {
        const lockedAsnLineRows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM asn_line
          WHERE id = ${putawayLine.asnLineId}
          FOR UPDATE
        `

        if (lockedAsnLineRows.length === 0) {
          throw new Error('ASN行不存在')
        }

        const asnLine = await tx.asnLine.findUnique({
          where: { id: putawayLine.asnLineId },
          select: {
            id: true,
            asnId: true,
            putawayQty: true,
            receivedQty: true,
          },
        })

        if (asnLine) {
          const newAsnLinePutawayQty = asnLine.putawayQty + data.quantity
          const isAsnLineCompleted = newAsnLinePutawayQty >= asnLine.receivedQty

          await tx.asnLine.update({
            where: { id: asnLine.id },
            data: {
              putawayQty: newAsnLinePutawayQty,
              status: isAsnLineCompleted ? 'COMPLETED' : 'PUTAWAY',
              updatedBy: userId,
            },
          })

          // 15. 更新ASN
          const lockedAsnRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM asn
            WHERE id = ${asnLine.asnId}
            AND tenant_id = ${tenantId}
            FOR UPDATE
          `

          if (lockedAsnRows.length === 0) {
            throw new Error('ASN不存在')
          }

          const asn = await tx.asn.findUnique({
            where: { id: asnLine.asnId },
            select: {
              id: true,
              asnNumber: true,
              status: true,
              totalPutawayQty: true,
              totalReceivedQty: true,
              receivingEndAt: true,
              putawayStartAt: true,
            },
          })

          if (asn) {
            const newAsnPutawayQty = asn.totalPutawayQty + data.quantity
            const isAsnPutawayQtyReached = newAsnPutawayQty >= asn.totalReceivedQty

            // 检查该ASN下的所有上架单是否都完成
            const incompletePutawayOrders = await tx.putawayOrder.count({
              where: {
                asnId: asn.id,
                status: { not: 'COMPLETED' },
              },
            })

            // ASN完成的条件：上架数量达到收货数量 且 所有上架单都完成
            const isAsnCompleted = isAsnPutawayQtyReached && incompletePutawayOrders === 0

            // 检查收货是否已完成 - 如果收货未完成，不能标记为已完成
            const isReceivingCompleted = asn.receivingEndAt !== null
            const canMarkAsCompleted = isAsnCompleted && isReceivingCompleted

            // 检查 ASN 状态转换的合法性
            // 允许 RECEIVING、RECEIVED 或 PUTTING_AWAY 状态下上架
            const isValidStateForPutaway = ['RECEIVING', 'RECEIVED', 'PUTTING_AWAY'].includes(asn.status)

            console.log(
              `[Shelving] ASN ${asn.asnNumber} 状态检查: 当前状态=${asn.status}, 是否有效=${isValidStateForPutaway}, 收货完成=${isReceivingCompleted}`
            )

            if (!isValidStateForPutaway) {
              throw new Error(
                `ASN ${asn.asnNumber} 状态为 ${asn.status}，不允许上架。`
              )
            }

            // 确定新状态 - 只有在收货完成后才能转换状态
            // RECEIVING 状态下上架不改变状态，只更新上架数量
            let newStatus = asn.status
            if (isReceivingCompleted && asn.status !== 'RECEIVING') {
              // 收货已完成，可以进行状态转换
              if (asn.status === 'RECEIVED' && !isAsnCompleted) {
                // 从 RECEIVED 转换到 PUTTING_AWAY
                newStatus = 'PUTTING_AWAY'
              } else if (canMarkAsCompleted) {
                // 上架完成
                newStatus = 'COMPLETED'
              }
            }
            // 如果收货未完成，保持当前状态不变，只更新上架数量

            console.log(
              `[Shelving] ASN ${asn.asnNumber} 状态转换: ${asn.status} -> ${newStatus}, 收货完成=${isReceivingCompleted}`
            )

            await tx.asn.update({
              where: { id: asn.id },
              data: {
                totalPutawayQty: newAsnPutawayQty,
                status: newStatus,
                putawayStartAt: asn.putawayStartAt ? undefined : new Date(),
                putawayEndAt: canMarkAsCompleted ? new Date() : null,
                completedAt: canMarkAsCompleted ? new Date() : null,
                updatedBy: userId,
              },
            })

            return {
              inventoryId: putawayResult.eventId,
              detailId,
              clientId: sku.clientId,
              warehouseId: location.warehouseId,
              asnStatusChange: newStatus !== asn.status ? {
                asnId: asn.id,
                asnNumber: asn.asnNumber,
                beforeStatus: asn.status,
                afterStatus: newStatus,
              } : null,
            }
          }
        }
      }
    }

    return {
      inventoryId: putawayResult.eventId,
      detailId,
      clientId: sku.clientId,
      warehouseId: location.warehouseId,
      asnStatusChange: null,
    }
  }, { timeout: 15000 })

  // 事务完成后，触发快照异步更新
  triggerSnapshotUpdate({
    tenantId,
    clientId: txResult.clientId,
    warehouseId: txResult.warehouseId,
    locationId: data.locationId,
    skuId: data.skuId,
    skuCode: data.skuCode,
  }).catch(async (err) => {
    console.error('[Shelving] 触发快照异步更新失败，尝试同步更新:', err)
    // 如果异步更新失败，立即执行同步更新
    try {
      await Promise.all([
        updateLocationSnapshot({
          tenantId,
          clientId: txResult.clientId,
          warehouseId: txResult.warehouseId,
          locationId: data.locationId,
          skuId: data.skuId,
          skuCode: data.skuCode,
        }),
        updateSkuSummary({
          tenantId,
          clientId: txResult.clientId,
          warehouseId: txResult.warehouseId,
          skuId: data.skuId,
          skuCode: data.skuCode,
        }),
      ])
      console.log('[Shelving] 同步快照更新成功')
    } catch (syncErr) {
      console.error('[Shelving] 同步快照更新也失败:', syncErr)
    }
  })

  // 记录操作日志（使用状态机）
  if (txResult.asnStatusChange) {
    asnStateMachine.logStatusChange(
      txResult.asnStatusChange.asnId,
      txResult.asnStatusChange.asnNumber,
      'COMPLETE_PUTAWAY',
      txResult.asnStatusChange.beforeStatus as AsnStatus,
      txResult.asnStatusChange.afterStatus as AsnStatus,
      {
        tenantId,
        userId,
        userName: operatorName,
      }
    )
  }

  return txResult
  })
}
