import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'

// 状态优先级：IN_PROGRESS 最优先显示，然后 PENDING，最后 COMPLETED
// 逻辑：有任一行在上架中，整体就是上架中；否则有待上架就是待上架；全部完成才是完成
const STATUS_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,
  PENDING: 1,
  COMPLETED: 2,
  CANCELLED: 3,
}

// 按 SKU + 属性合并上架任务（用于显示）
interface PutawayTask {
  id: string
  putawayTaskNumber: string
  skuId: string
  skuCode: string
  skuName: string | null
  barcode?: string | null
  status: string
  quantity: number
  putawayQty: number
  remainingQty: number
  batchNumber: string | null
  expiryDate: string | Date | null
  qualityType: string
  containerId: string | null
  container: { id: string; containerCode: string } | null
  isSerialManaged: boolean
  serialNumbers: string[]
}

function mergeTasksBySkuAndAttributes(tasks: PutawayTask[]): PutawayTask[] {
  // 分组 key: skuCode + batchNumber + expiryDate + qualityType + containerId
  // containerId 加入分组，避免容器上架模式下不同容器的同 SKU 被误合并
  const groupMap = new Map<string, PutawayTask[]>()

  for (const task of tasks) {
    const expiryDateStr = task.expiryDate
      ? (task.expiryDate instanceof Date ? task.expiryDate.toISOString() : task.expiryDate)
      : ''
    const containerId = task.containerId ?? ''
    const key = `${task.skuCode}|${task.batchNumber ?? ''}|${expiryDateStr}|${task.qualityType}|${containerId}`
    const group = groupMap.get(key) || []
    group.push(task)
    groupMap.set(key, group)
  }

  // 合并每个分组
  const mergedTasks: PutawayTask[] = []
  let newLineNumber = 0

  for (const group of groupMap.values()) {
    newLineNumber++
    const first = group[0]

    // 数量求和
    const totalQuantity = group.reduce((sum, t) => sum + t.quantity, 0)
    const totalPutawayQty = group.reduce((sum, t) => sum + t.putawayQty, 0)
    const totalRemainingQty = group.reduce((sum, t) => sum + t.remainingQty, 0)

    // 状态取优先级最高的（IN_PROGRESS > PENDING > COMPLETED）
    const mergedStatus = group.reduce((current, t) => {
      const taskPriority = STATUS_PRIORITY[t.status] ?? 99
      const currentPriority = STATUS_PRIORITY[current] ?? 99
      return taskPriority < currentPriority ? t.status : current
    }, group[0].status)

    // 合并序列号
    const mergedSerialNumbers = group.flatMap(t => t.serialNumbers)

    // 原始行 IDs
    const originalIds = group.map(t => t.id)

    mergedTasks.push({
      id: originalIds.join(','),
      putawayTaskNumber: `TASK-${newLineNumber}`,
      skuId: first.skuId,
      skuCode: first.skuCode,
      skuName: first.skuName,
      barcode: first.barcode,
      status: mergedStatus,
      quantity: totalQuantity,
      putawayQty: totalPutawayQty,
      remainingQty: totalRemainingQty,
      batchNumber: first.batchNumber,
      expiryDate: first.expiryDate,
      qualityType: first.qualityType,
      containerId: first.containerId,
      container: first.container,
      isSerialManaged: first.isSerialManaged,
      serialNumbers: mergedSerialNumbers,
    })
  }

  return mergedTasks
}

// GET /api/v1/shelving/putaway-order?orderNumber=xxx - 根据上架单号查询上架单
// 可选参数: merge=false 跳过任务合并（用于 E2E 测试等需要操作单独任务的场景）
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('orderNumber')
    const shouldMerge = searchParams.get('merge') !== 'false' // 默认合并

    if (!orderNumber) {
      return NextResponse.json({ success: false, message: '上架单号不能为空' }, { status: 400 })
    }

    const tenantId = auth.user.tenantId

    const order = await prisma.putawayOrder.findFirst({
      where: {
        putawayOrderNumber: orderNumber,
        tenantId,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        asn: {
          select: {
            asnNumber: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            asnId: true,
            skuId: true,
            skuCode: true,
            skuName: true,
            status: true,
            priority: true,
            quantity: true,
            putawayQty: true,
            remainingQty: true,
            batchNumber: true,
            expiryDate: true,
            qualityType: true,
            containerId: true,
            container: {
              select: {
                id: true,
                containerCode: true,
              },
            },
            sku: {
              select: {
                barcode: true,
                isSerialManaged: true,
              },
            },
          },
          orderBy: {
            lineNumber: 'asc',
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, message: '上架单不存在' }, { status: 404 })
    }

    // 查询序列号管理的SKU的待上架序列号
    const serialManagedSkuIds = order.lines
      .filter(line => line.sku?.isSerialManaged && line.remainingQty > 0)
      .map(line => line.skuId)

    let serialNumbersMap: Record<string, string[]> = {}
    if (serialManagedSkuIds.length > 0) {
      const serialNumbers = await prisma.serialNumber.findMany({
        where: {
          tenantId,
          skuId: { in: serialManagedSkuIds },
          receivedAsnId: order.asnId,
          status: 'IN_STOCK',
          putawayAt: null,
        },
        select: {
          skuId: true,
          serialNumber: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      // 按SKU分组序列号
      serialNumbersMap = serialNumbers.reduce((acc, sn) => {
        if (!acc[sn.skuId]) {
          acc[sn.skuId] = []
        }
        acc[sn.skuId].push(sn.serialNumber)
        return acc
      }, {} as Record<string, string[]>)
    }

    // 计算进度
    const progress = {
      totalQty: order.totalQty,
      putawayQty: order.putawayQty,
      pendingQty: order.pendingQty,
      percentage: order.totalQty > 0 ? Math.round((order.putawayQty / order.totalQty) * 100) : 0,
      taskCount: order.lines.length,
      completedTaskCount: order.lines.filter(l => l.status === 'COMPLETED').length,
    }

    // 转换 lines 为 putawayTasks 以匹配前端期望的数据结构
    const rawPutawayTasks = order.lines.map(line => ({
      id: line.id,
      putawayTaskNumber: `TASK-${line.lineNumber}`,
      skuId: line.skuId,
      skuCode: line.skuCode,
      skuName: line.skuName,
      status: line.status,
      quantity: line.quantity,
      putawayQty: line.putawayQty,
      remainingQty: line.remainingQty,
      batchNumber: line.batchNumber,
      expiryDate: line.expiryDate,
      qualityType: line.qualityType,
      containerId: line.containerId,
      container: line.container,
      barcode: line.sku?.barcode || null,
      isSerialManaged: line.sku?.isSerialManaged || false,
      serialNumbers: serialNumbersMap[line.skuId] || [],
    }))

    // 按 SKU + 属性合并任务（用于显示），可通过 merge=false 跳过
    const putawayTasks = shouldMerge ? mergeTasksBySkuAndAttributes(rawPutawayTasks) : rawPutawayTasks

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        putawayOrderNumber: order.putawayOrderNumber,
        status: order.status,
        totalQty: order.totalQty,
        putawayQty: order.putawayQty,
        pendingQty: order.pendingQty,
        warehouse: order.warehouse,
        client: order.client,
        asn: order.asn,
        putawayTasks,
        progress,
      },
    })
  } catch (error) {
    console.error('查询上架单失败:', error)
    return NextResponse.json({ success: false, message: '查询上架单失败' }, { status: 500 })
  }
})
