import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { asnStateMachine,AsnStatus } from '@/lib/services/asn-state-machine'
import { generatePutawayOrderNumber } from '@/lib/utils/number-generator'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

// 质量类型常量
const QUALITY_TYPE = {
  GOOD: 'GOOD',
  DAMAGED: 'DAMAGED',
} as const

// 创建上架单 Schema
const createOrderSchema = z.object({
  putawayMode: z.enum(['CONTAINER_MODE', 'TASK_MODE']),
  // SKU 收货模式：选择 ASN Line
  asnLineIds: z.array(z.string()).optional(),
  // 容器收货模式：选择容器
  containerIds: z.array(z.string()).optional(),
  // 是否按质量类型分组创建上架单（默认true）
  separateByQuality: z.boolean().optional().default(true),
})

// POST /api/v1/putaway/orders - 创建上架单
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId
    const userId = auth.user.id
    const body = await request.json()

    const parseResult = createOrderSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { putawayMode, asnLineIds, containerIds } = parseResult.data

    // 验证至少选择了一种数据
    if ((!asnLineIds || asnLineIds.length === 0) && (!containerIds || containerIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: '请至少选择一项待上架数据' },
        { status: 400 }
      )
    }

    // 根据模式处理
    if (asnLineIds && asnLineIds.length > 0) {
      // SKU 收货模式：基于 ReceivingRecord 创建上架单
      // 查询未分配到上架单的收货记录
      const receivingRecords = await prisma.receivingRecord.findMany({
        where: {
          tenantId,
          asnLineId: { in: asnLineIds },
          isPutawayAllocated: false,  // 只查询未分配的收货记录
          status: 'COMPLETED',  // 只查询已完成的收货记录
          asn: {
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
          },
        },
        include: {
          asn: {
            include: {
              warehouse: true,
              client: true,
            },
          },
          asnLine: true,
          sku: true,
        },
      })

      if (receivingRecords.length === 0) {
        return NextResponse.json(
          { success: false, message: '未找到有效的待上架收货记录' },
          { status: 400 }
        )
      }

      // 按 ASN 分组收货记录
      interface RecordGroup {
        record: typeof receivingRecords[0]
        qty: number
        qualityType: string
      }
      const asnGroups = new Map<string, RecordGroup[]>()

      for (const record of receivingRecords) {
        const asnId = record.asnId
        const group = asnGroups.get(asnId) || []

        // 每个收货记录只有一种质量类型（良品或次品）
        if (record.goodQty > 0) {
          group.push({
            record,
            qty: record.goodQty,
            qualityType: QUALITY_TYPE.GOOD,
          })
        }
        if (record.damagedQty > 0) {
          group.push({
            record,
            qty: record.damagedQty,
            qualityType: QUALITY_TYPE.DAMAGED,
          })
        }

        asnGroups.set(asnId, group)
      }

      const createdOrders = []
      const processedAsnIds = new Set<string>()
      // 收集需要记录日志的 ASN 信息（在事务外记录）
      const asnLogsToRecord: Array<{
        asnId: string
        asnNumber: string
        previousStatus: string
      }> = []

      for (const [asnId, recordGroups] of asnGroups) {
        const firstRecord = recordGroups[0].record
        const warehouse = firstRecord.asn.warehouse
        const client = firstRecord.asn.client

        // 计算总数量
        const totalQty = recordGroups.reduce((sum, rg) => sum + rg.qty, 0)
        const skuCount = new Set(recordGroups.map(rg => rg.record.skuId)).size
        const totalLineCount = recordGroups.length

        // 生成上架单号
        const putawayOrderNumber = await generatePutawayOrderNumber(tenantId, warehouse.warehouseCode)

        // 使用事务创建上架单及相关数据
        const order = await prisma.$transaction(async (tx) => {
          // 在事务内使用 FOR UPDATE 锁定相关的 ReceivingRecord，并重新查询最新数据
          const recordIds = recordGroups.map(rg => rg.record.id)
          const lockedRecords = await tx.$queryRaw<Array<{
            id: string
            isPutawayAllocated: boolean
            status: string
          }>>`
            SELECT id, is_putaway_allocated as isPutawayAllocated, status
            FROM receiving_record
            WHERE id IN (${Prisma.join(recordIds)})
            AND tenant_id = ${tenantId}
            FOR UPDATE
          `

          // 校验收货记录状态
          for (const recordGroup of recordGroups) {
            const lockedRecord = lockedRecords.find(r => r.id === recordGroup.record.id)
            if (!lockedRecord) {
              throw new Error(`收货记录 ${recordGroup.record.skuCode} 不存在`)
            }

            // 检查是否已分配
            if (lockedRecord.isPutawayAllocated) {
              throw new Error(`收货记录 ${recordGroup.record.skuCode} 已创建上架单，请勿重复创建`)
            }

            // 检查状态
            if (lockedRecord.status !== 'COMPLETED') {
              throw new Error(`收货记录 ${recordGroup.record.skuCode} 状态不是已完成，无法创建上架单`)
            }
          }

          // 创建上架单
          const order = await tx.putawayOrder.create({
            data: {
              tenantId,
              putawayOrderNumber,
              warehouseId: warehouse.id,
              clientId: client.id,
              asnId,
              asnType: firstRecord.asn.asnType,
              putawayMode,
              status: 'PENDING',
              totalQty,
              pendingQty: totalQty,
              putawayQty: 0,
              skuCount,
              lineCount: totalLineCount,
              containerCount: 0,
              createdBy: userId,
            },
          })

          // 创建上架单行并更新收货记录
          let lineNumber = 0
          const processedAsnLineIds = new Set<string>()

          for (const recordGroup of recordGroups) {
            const { record, qty, qualityType } = recordGroup
            if (qty > 0) {
              lineNumber++
              await tx.putawayOrderLine.create({
                data: {
                  tenantId,
                  putawayOrderId: order.id,
                  lineNumber,
                  asnId: record.asnId,
                  asnLineId: record.asnLineId,
                  receivingRecordId: record.id,  // 关联收货记录
                  skuId: record.skuId,
                  skuCode: record.skuCode,
                  skuName: record.skuName,
                  quantity: qty,
                  remainingQty: qty,
                  putawayQty: 0,
                  batchNumber: record.batchNumber,
                  expiryDate: record.expiryDate instanceof Date ? record.expiryDate : (record.expiryDate ? new Date(record.expiryDate as string) : null),
                  qualityType,
                  status: 'PENDING',
                  priority: 'MEDIUM',
                  createdBy: userId,
                },
              })

              // 更新收货记录为已分配
              await tx.receivingRecord.update({
                where: { id: record.id },
                data: { isPutawayAllocated: true },
              })

              // 锁定序列号到上架单
              const serialNumbers = record.serialNumbers as string[] | null
              if (serialNumbers && serialNumbers.length > 0) {
                await tx.serialNumber.updateMany({
                  where: {
                    tenantId,
                    serialNumber: { in: serialNumbers },
                    status: 'IN_STOCK',
                  },
                  data: {
                    putawayOrderId: order.id,
                  },
                })
              }

              // 收集需要更新状态的 ASN Line
              if (record.asnLineId) {
                processedAsnLineIds.add(record.asnLineId)
              }
            }
          }

          // 更新 ASN Line 状态为上架中
          for (const asnLineId of processedAsnLineIds) {
            await tx.asnLine.update({
              where: { id: asnLineId },
              data: { status: 'PUTAWAY' },
            })
          }

          // 只对每个 ASN 记录一次状态变更
          if (!processedAsnIds.has(asnId)) {
            processedAsnIds.add(asnId)

            // 更新 ASN 状态为上架中（仅当收货已完成时）
            const previousStatus = firstRecord.asn.status
            const isReceivingCompleted = firstRecord.asn.receivingEndAt !== null
            if (isReceivingCompleted && previousStatus === 'RECEIVED') {
              await tx.asn.update({
                where: { id: asnId },
                data: { status: 'PUTTING_AWAY' },
              })

              // 记录需要写日志的 ASN 信息（稍后在事务外记录）
              asnLogsToRecord.push({
                asnId,
                asnNumber: firstRecord.asn.asnNumber,
                previousStatus,
              })
            }
          }

          return order
        })

        createdOrders.push(order)
      }

      // 在事务外记录操作日志（避免日志失败影响业务）
      for (const logInfo of asnLogsToRecord) {
        asnStateMachine.logStatusChange(
          logInfo.asnId,
          logInfo.asnNumber,
          'START_PUTAWAY',
          logInfo.previousStatus as AsnStatus,
          'PUTTING_AWAY',
          {
            tenantId,
            userId,
            userName: auth.user.name || undefined,
          }
        )
      }

      return NextResponse.json({
        success: true,
        data: createdOrders,
        message: `成功创建 ${createdOrders.length} 个上架单`,
      })
    }

    if (containerIds && containerIds.length > 0) {
      // 容器收货模式：基于容器创建上架单
      // 首先校验所有容器是否已关箱
      const containers = await prisma.container.findMany({
        where: {
          id: { in: containerIds },
          tenantId,
        },
        select: { id: true, containerCode: true, workStatus: true },
      })

      // 检查是否有未关箱的容器
      const notClosedContainers = containers.filter(c => c.workStatus !== 'CLOSED')
      if (notClosedContainers.length > 0) {
        const codes = notClosedContainers.map(c => c.containerCode).join(', ')
        return NextResponse.json(
          { success: false, message: `容器 ${codes} 未关箱，请先关箱后再创建上架单` },
          { status: 400 }
        )
      }

      // 获取所有选中容器的物品（只获取未关联上架单行的物品）
      const containerItems = await prisma.containerItem.findMany({
        where: {
          containerId: { in: containerIds },
          tenantId,
          putawayOrderLineId: null, // 只获取未关联上架单行的物品
          asn: {
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
          },
        },
        include: {
          container: {
            include: { warehouse: true },
          },
          asn: {
            include: { client: true },
          },
        },
      })

      if (containerItems.length === 0) {
        return NextResponse.json(
          { success: false, message: '未找到有效的容器物品或物品已创建上架单' },
          { status: 400 }
        )
      }

      // 按 ASN 分组容器物品
      const asnGroups = new Map<string, typeof containerItems>()
      for (const item of containerItems) {
        const group = asnGroups.get(item.asnId) || []
        group.push(item)
        asnGroups.set(item.asnId, group)
      }

      const createdOrders = []
      // 记录已处理的 ASN，避免重复记录状态变更日志
      const processedAsnIds = new Set<string>()
      // 收集需要记录日志的 ASN 信息（在事务外记录）
      const asnLogsToRecord: Array<{
        asnId: string
        asnNumber: string
        previousStatus: string
      }> = []

      for (const [asnId, items] of asnGroups) {
        const firstItem = items[0]
        const warehouse = firstItem.container.warehouse
        const asn = firstItem.asn
        const client = asn.client

        // 计算总数量和统计信息
        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
        const skuCount = new Set(items.map(i => i.skuId)).size
        const containerCount = new Set(items.map(i => i.containerId)).size

        // 生成上架单号
        const putawayOrderNumber = await generatePutawayOrderNumber(tenantId, warehouse.warehouseCode)

        // 使用事务创建上架单及相关数据
        const order = await prisma.$transaction(async (tx) => {
          // 在事务内使用 FOR UPDATE 锁定相关的容器物品，并重新查询最新数据
          const lockedItems = await tx.$queryRaw<Array<{
            id: string
            putaway_order_line_id: string | null
          }>>`
            SELECT id, putaway_order_line_id
            FROM container_item
            WHERE id IN (${Prisma.join(items.map(item => item.id))})
            AND tenant_id = ${tenantId}
            FOR UPDATE
          `

          // 校验容器物品状态
          for (const item of items) {
            const lockedItem = lockedItems.find(l => l.id === item.id)
            if (!lockedItem) {
              throw new Error(`容器物品 ${item.skuCode} 不存在`)
            }

            // 检查是否已关联上架单行
            if (lockedItem.putaway_order_line_id) {
              throw new Error(`容器物品 ${item.skuCode} 已创建上架单，请勿重复创建`)
            }
          }

          // 创建上架单
          const order = await tx.putawayOrder.create({
            data: {
              tenantId,
              putawayOrderNumber,
              warehouseId: warehouse.id,
              clientId: client.id,
              asnId,
              asnType: asn.asnType,
              putawayMode: 'CONTAINER_MODE',
              status: 'PENDING',
              totalQty,
              pendingQty: totalQty,
              putawayQty: 0,
              skuCount,
              lineCount: items.length,
              containerCount,
              createdBy: userId,
            },
          })

          // 为每个容器物品创建上架单行
          let lineNumber = 0
          for (const item of items) {
            lineNumber++
            const putawayLine = await tx.putawayOrderLine.create({
              data: {
                tenantId,
                putawayOrderId: order.id,
                lineNumber,
                asnId: item.asnId,
                asnLineId: item.asnLineId,
                skuId: item.skuId,
                skuCode: item.skuCode,
                skuName: item.skuName,
                quantity: item.quantity,
                remainingQty: item.quantity,
                putawayQty: 0,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate instanceof Date ? item.expiryDate : (item.expiryDate ? new Date(item.expiryDate as string) : null),
                containerId: item.containerId,
                qualityType: item.qualityType || 'GOOD',
                status: 'PENDING',
                priority: 'MEDIUM',
                createdBy: userId,
              },
            })

            // 更新 ContainerItem 关联上架单行
            await tx.containerItem.update({
              where: { id: item.id },
              data: { putawayOrderLineId: putawayLine.id },
            })

            // 从容器物品的序列号列表锁定
            const itemSerials = item.serialNumbers as string[] | null
            if (itemSerials && itemSerials.length > 0) {
              await tx.serialNumber.updateMany({
                where: {
                  tenantId,
                  serialNumber: { in: itemSerials },
                  status: 'IN_STOCK',
                },
                data: {
                  putawayOrderId: order.id,
                },
              })
            }
          }

          // 只对每个 ASN 记录一次状态变更
          if (!processedAsnIds.has(asn.id)) {
            processedAsnIds.add(asn.id)

            // 更新 ASN 状态为上架中（仅当收货已完成时）
            const previousStatus = asn.status
            const isReceivingCompleted = asn.receivingEndAt !== null
            if (isReceivingCompleted && previousStatus === 'RECEIVED') {
              await tx.asn.update({
                where: { id: asn.id },
                data: { status: 'PUTTING_AWAY' },
              })

              // 记录需要写日志的 ASN 信息（稍后在事务外记录）
              asnLogsToRecord.push({
                asnId: asn.id,
                asnNumber: asn.asnNumber,
                previousStatus,
              })
            }
          }

          return order
        })

        createdOrders.push(order)
      }

      // 在事务外记录操作日志（避免日志失败影响业务）
      for (const logInfo of asnLogsToRecord) {
        asnStateMachine.logStatusChange(
          logInfo.asnId,
          logInfo.asnNumber,
          'START_PUTAWAY',
          logInfo.previousStatus as AsnStatus,
          'PUTTING_AWAY',
          {
            tenantId,
            userId,
            userName: auth.user.name || undefined,
          }
        )
      }

      return NextResponse.json({
        success: true,
        data: createdOrders,
        message: `成功创建 ${createdOrders.length} 个上架单（按ASN分组）`,
      })
    }

    return NextResponse.json(
      { success: false, message: '请选择待上架数据' },
      { status: 400 }
    )
  } catch (error) {
    console.error('创建上架单失败:', error)
    const message = error instanceof Error ? error.message : '创建上架单失败'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
})
