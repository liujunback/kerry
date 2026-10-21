import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { getAvailableCells, updateCellStatus, resetCellsStatus } from '@/lib/services/sorting-cell-service'
import { acquireLock } from '@/lib/db/distributed-lock'

const startSchema = z.object({
  scanCode: z.string().min(1, '扫描码不能为空'),
  sortingWallId: z.string().min(1, '请选择播种墙'),
})

// 生成分拣任务号
async function generateTaskNumber(tenantId: string): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `ST-${dateStr}-`

  const lastTask = await prisma.sortingTask.findFirst({
    where: {
      tenantId,
      taskNumber: { startsWith: prefix },
    },
    orderBy: { taskNumber: 'desc' },
    select: { taskNumber: true },
  })

  let seq = 1
  if (lastTask) {
    const lastSeq = parseInt(lastTask.taskNumber.slice(-4), 10)
    seq = lastSeq + 1
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`
}

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validation = startSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { scanCode, sortingWallId } = validation.data

    // 获取播种墙信息
    const sortingWall = await prisma.sortingWall.findFirst({
      where: {
        id: sortingWallId,
        tenantId: auth.user.tenantId,
        isActive: true,
      },
    })

    if (!sortingWall) {
      return NextResponse.json(
        { success: false, message: '播种墙不存在或未启用' },
        { status: 404 }
      )
    }

    // 查找拣货单
    let pickOrder = await prisma.pickOrder.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        taskNumber: scanCode,
      },
      include: {
        lines: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
            sku: {
              select: {
                skuCode: true,
                skuName: true,
                barcode: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            warehouseName: true,
          },
        },
      },
    })

    // 如果不是拣货单号，尝试按容器号查找
    if (!pickOrder) {
      const pickOrderLine = await prisma.pickOrderLine.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          lpn: scanCode,
        },
        select: { pickOrderId: true },
      })

      if (pickOrderLine) {
        pickOrder = await prisma.pickOrder.findFirst({
          where: {
            id: pickOrderLine.pickOrderId,
              tenantId: auth.user.tenantId,
            },
          include: {
            lines: {
              include: {
                order: {
                  select: {
                    id: true,
                    orderNumber: true,
                  },
                },
                sku: {
                  select: {
                    skuCode: true,
                    skuName: true,
                    barcode: true,
                  },
                },
              },
            },
            warehouse: {
              select: {
                warehouseName: true,
              },
            },
          },
        })
      }
    }

    if (!pickOrder) {
      return NextResponse.json(
        { success: false, message: '未找到拣货单' },
        { status: 404 }
      )
    }

    // 验证拣货单状态
    if (pickOrder.status === 'SORTING') {
      // 拣货单已在分拣中，查找对应的进行中任务
      const existingTask = await prisma.sortingTask.findFirst({
        where: {
          pickOrderId: pickOrder.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          lines: true,
        },
      })

      if (existingTask) {
        // 如果任务绑定到当前播种墙，返回现有任务信息继续分拣
        if (existingTask.sortingWallId === sortingWallId) {
          // 获取格口分配信息
          const cellAllocations = await prisma.sortingCellAllocation.findMany({
            where: {
              sortingTaskId: existingTask.id,
            },
            select: {
              cellCode: true,
              orderId: true,
              orderNumber: true,
              expectedQty: true,
              sortedQty: true,
              status: true,
            },
          })

          return NextResponse.json({
            success: true,
            data: {
              task: {
                id: existingTask.id,
                taskNumber: existingTask.taskNumber,
                pickOrderId: pickOrder.id,
                pickOrderNumber: pickOrder.taskNumber,
                sortingWallId,
                status: existingTask.status,
                totalItems: existingTask.totalItems,
                completedItems: existingTask.completedItems,
                totalOrders: cellAllocations.length,
                completedOrders: cellAllocations.filter(c => c.status === 'COMPLETED').length,
              },
              wall: {
                id: sortingWall.id,
                wallCode: sortingWall.wallCode,
                wallName: sortingWall.wallName,
                horizontalCells: sortingWall.horizontalCells,
                verticalCells: sortingWall.verticalCells,
                totalCells: sortingWall.totalCells,
                warehouseId: sortingWall.warehouseId,
                warehouseName: pickOrder.warehouse?.warehouseName || '',
              },
              cellAllocations,
            },
          })
        }

        // 如果任务绑定到其他播种墙，返回错误
        return NextResponse.json(
          { success: false, message: '该拣货单已在其他播种墙分拣中，请前往对应播种墙继续操作' },
          { status: 400 }
        )
      }

      // 状态异常：标记为 SORTING 但没有进行中的任务，重置状态
      await prisma.pickOrder.update({
        where: { id: pickOrder.id },
        data: { status: 'PICKED' },
      })
    }

    if (pickOrder.downstreamMode === 'PACK_DIRECT') {
      return NextResponse.json(
        { success: false, message: '该拣货单配置为直接打包，不允许进入系统分拣' },
        { status: 400 }
      )
    }

    if (!['PICKED', 'IN_PROGRESS', 'COMPLETED'].includes(pickOrder.status)) {
      return NextResponse.json(
        { success: false, message: `拣货单状态不正确，当前状态：${pickOrder.status}` },
        { status: 400 }
      )
    }

    // 使用分布式锁防止并发创建任务
    const lockKey = `pickOrder:${pickOrder.id}`
    const lock = await acquireLock(lockKey, {
      ttlMs: 5000,
      retryCount: 3,
      retryDelayMs: 100,
      prefix: 'sorting',
    })

    if (!lock.acquired) {
      return NextResponse.json(
        { success: false, message: '系统繁忙，请稍后重试' },
        { status: 503 }
      )
    }

    try {
      // Double-check：再次检查拣货单状态（防止并发）
      const freshPickOrder = await prisma.pickOrder.findUnique({
        where: { id: pickOrder.id },
        select: { status: true },
      })

      if (freshPickOrder?.status === 'SORTING') {
        return NextResponse.json(
          { success: false, message: '该拣货单已在分拣中' },
          { status: 400 }
        )
      }

    // 统计订单信息
    const orderMap = new Map<string, {
      orderId: string
      orderNumber: string
      totalQty: number
      lines: Array<{
        skuId: string
        skuCode: string
        expectedQty: number
      }>
    }>()

    for (const line of pickOrder.lines) {
      const orderId = line.orderId
      const existing = orderMap.get(orderId)
      if (existing) {
        existing.totalQty += line.expectedQty
        existing.lines.push({
          skuId: line.skuId,
          skuCode: line.skuCode,
          expectedQty: line.expectedQty,
        })
      } else {
        orderMap.set(orderId, {
          orderId,
          orderNumber: line.order?.orderNumber || '',
          totalQty: line.expectedQty,
          lines: [{
            skuId: line.skuId,
            skuCode: line.skuCode,
            expectedQty: line.expectedQty,
          }],
        })
      }
    }

    const orders = Array.from(orderMap.values())

    // 检查格口数量是否足够
    if (orders.length > sortingWall.totalCells) {
      return NextResponse.json(
        { success: false, message: `订单数(${orders.length})超过播种墙格口数(${sortingWall.totalCells})` },
        { status: 400 }
      )
    }

    // 从 SortingCell 表获取可用格口
    // 如果播种墙处于 SORTING 状态但无进行中任务（异常中断），自动重置格口
    if (sortingWall.sortStatus === 'SORTING') {
      const inProgressTask = await prisma.sortingTask.findFirst({
        where: { sortingWallId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        select: { id: true },
      })
      if (!inProgressTask) {
        await resetCellsStatus(sortingWallId)
        await prisma.sortingWall.update({
          where: { id: sortingWallId },
          data: { sortStatus: 'IDLE' },
        })
      }
    }

    const availableCells = await getAvailableCells(sortingWallId)

    if (availableCells.length < orders.length) {
      return NextResponse.json(
        { success: false, message: `可用格口数(${availableCells.length})不足，需要${orders.length}个格口` },
        { status: 400 }
      )
    }

    // 生成任务号
    const taskNumber = await generateTaskNumber(auth.user.tenantId)

    // 计算总件数
    const totalItems = pickOrder.lines.reduce((sum, line) => sum + line.expectedQty, 0)

    // 创建分拣任务
    const sortingTask = await prisma.sortingTask.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseId: pickOrder.warehouseId,
        taskNumber,
        pickOrderId: pickOrder.id,
        waveId: pickOrder.waveId,
        strategyRunId: pickOrder.strategyRunId,
        sortingWallId,
        status: 'IN_PROGRESS',
        totalItems,
        completedItems: 0,
        assignedUserId: auth.user.id,
        startedAt: new Date(),
        createdBy: auth.user.id,
      },
    })

    // 分配格口并创建明细
    const cellAllocations: Array<{
      cellCode: string
      orderId: string
      orderNumber: string
      expectedQty: number
      sortedQty: number
      status: string
    }> = []

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i]
      const cell = availableCells[i]

      // 更新格口状态为已分配
      await updateCellStatus(cell.id, 'ALLOCATED')

      // 创建格口分配记录
      await prisma.sortingCellAllocation.create({
        data: {
          tenantId: auth.user.tenantId,
          sortingWallId,
          cellCode: cell.cellPosition,
          sortingCellId: cell.id,
          sortingTaskId: sortingTask.id,
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          expectedQty: order.totalQty,
          sortedQty: 0,
          status: 'ALLOCATED',
        },
      })

      cellAllocations.push({
        cellCode: cell.cellPosition,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        expectedQty: order.totalQty,
        sortedQty: 0,
        status: 'ALLOCATED',
      })

      // 创建分拣任务明细
      for (const line of order.lines) {
        await prisma.sortingTaskLine.create({
          data: {
            tenantId: auth.user.tenantId,
            sortingTaskId: sortingTask.id,
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            skuId: line.skuId,
            skuCode: line.skuCode,
            cellCode: cell.cellPosition,
            expectedQty: line.expectedQty,
            sortedQty: 0,
            status: 'PENDING',
          },
        })
      }
    }

    // 更新播种墙状态
    await prisma.sortingWall.update({
      where: { id: sortingWallId },
      data: { sortStatus: 'SORTING' },
    })

    // 更新拣货单状态为分拣中
    await prisma.pickOrder.update({
      where: { id: pickOrder.id },
      data: { status: 'SORTING' },
    })

    // 更新出库订单状态为分拣中
    await prisma.outboundOrder.updateMany({
      where: {
        id: { in: orders.map((o) => o.orderId) },
      },
      data: { status: 'SORTING' },
    })

      return NextResponse.json({
        success: true,
        data: {
          task: {
            id: sortingTask.id,
            taskNumber: sortingTask.taskNumber,
            pickOrderId: pickOrder.id,
            pickOrderNumber: pickOrder.taskNumber,
            sortingWallId,
            status: sortingTask.status,
            totalItems,
            completedItems: 0,
            totalOrders: orders.length,
            completedOrders: 0,
          },
          wall: {
            id: sortingWall.id,
            wallCode: sortingWall.wallCode,
            wallName: sortingWall.wallName,
            horizontalCells: sortingWall.horizontalCells,
            verticalCells: sortingWall.verticalCells,
            totalCells: sortingWall.totalCells,
            warehouseId: sortingWall.warehouseId,
            warehouseName: pickOrder.warehouse?.warehouseName || '',
          },
          cellAllocations,
        },
      })
    } finally {
      await lock.release()
    }
  } catch (error) {
    console.error('开始分拣任务失败:', error)
    return NextResponse.json(
      { success: false, message: '开始分拣任务失败' },
      { status: 500 }
    )
  }
})
