import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

// 状态优先级：IN_PROGRESS 最优先显示，然后 PENDING，最后 COMPLETED
// 逻辑：有任一行在上架中，整体就是上架中；否则有待上架就是待上架；全部完成才是完成
const STATUS_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,  // 最优先：有一个在上架中，整体就是上架中
  PENDING: 1,      // 其次：有待上架的
  COMPLETED: 2,    // 最后：全部完成
  CANCELLED: 3,
}

// 按 SKU + 属性合并上架单行（用于显示）
function mergeLinesBySkuAndAttributes(lines: Array<{
  id: string
  lineNumber: number
  skuCode: string
  skuName: string | null
  status: string
  priority: string
  quantity: number
  putawayQty: number
  remainingQty: number
  batchNumber: string | null
  lotNumber: string | null
  expiryDate: string | Date | null
  sourceLocation: string | null
  targetLocation: string | null
  qualityType: string
  createdAt: string | Date
  startedAt: string | Date | null
  completedAt: string | Date | null
  container: { containerCode: string } | null
  details: Array<{
    id: string
    detailNumber: string
    quantity: number
    locationCode: string
    containerCode: string | null
    serialNumbers: string[] | null
    putawayAt: string | Date
    putawayBy: string
    deviceType: string
  }>
}>) {
  // 分组 key: skuCode + batchNumber + expiryDate + qualityType + containerId
  // containerId 加入分组，避免容器上架模式下不同容器的同 SKU 被误合并
  const groupMap = new Map<string, typeof lines>()

  for (const line of lines) {
    const containerId = line.container?.containerCode ?? ''
    const key = `${line.skuCode}|${line.batchNumber ?? ''}|${line.expiryDate ?? ''}|${line.qualityType}|${containerId}`
    const group = groupMap.get(key) || []
    group.push(line)
    groupMap.set(key, group)
  }

  // 合并每个分组
  const mergedLines: typeof lines = []
  let newLineNumber = 0

  for (const group of groupMap.values()) {
    newLineNumber++
    const first = group[0]

    // 数量求和
    const totalQuantity = group.reduce((sum, l) => sum + l.quantity, 0)
    const totalPutawayQty = group.reduce((sum, l) => sum + l.putawayQty, 0)
    const totalRemainingQty = group.reduce((sum, l) => sum + l.remainingQty, 0)

    // 状态取优先级最高的（IN_PROGRESS > PENDING > COMPLETED）
    const mergedStatus = group.reduce((current, l) => {
      const linePriority = STATUS_PRIORITY[l.status] ?? 99
      const currentPriority = STATUS_PRIORITY[current] ?? 99
      return linePriority < currentPriority ? l.status : current
    }, group[0].status)

    // 合并所有 details
    const mergedDetails = group.flatMap(l => l.details)

    // 原始行 IDs（供调试或后续操作使用）
    const originalLineIds = group.map(l => l.id)

    mergedLines.push({
      id: originalLineIds.join(','), // 合并后的虚拟 ID
      lineNumber: newLineNumber,
      skuCode: first.skuCode,
      skuName: first.skuName,
      status: mergedStatus,
      priority: first.priority,
      quantity: totalQuantity,
      putawayQty: totalPutawayQty,
      remainingQty: totalRemainingQty,
      batchNumber: first.batchNumber,
      lotNumber: first.lotNumber,
      expiryDate: first.expiryDate,
      sourceLocation: first.sourceLocation,
      targetLocation: first.targetLocation,
      qualityType: first.qualityType,
      createdAt: first.createdAt, // 取第一条的创建时间
      startedAt: group.find(l => l.startedAt)?.startedAt ?? null,
      completedAt: group.every(l => l.completedAt) ? group[group.length - 1].completedAt : null,
      container: first.container,
      details: mergedDetails,
    })
  }

  return mergedLines
}

export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const tenantId = auth.user.tenantId

    const order = await prisma.putawayOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        warehouse: {
          select: {
            warehouseCode: true,
            warehouseName: true,
          },
        },
        client: {
          select: {
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
            skuCode: true,
            skuName: true,
            status: true,
            priority: true,
            quantity: true,
            putawayQty: true,
            remainingQty: true,
            batchNumber: true,
            lotNumber: true,
            expiryDate: true,
            sourceLocation: true,
            targetLocation: true,
            qualityType: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
            container: {
              select: {
                containerCode: true,
              },
            },
            details: {
              select: {
                id: true,
                detailNumber: true,
                quantity: true,
                locationCode: true,
                containerCode: true,
                serialNumbers: true,
                putawayAt: true,
                putawayBy: true,
                deviceType: true,
              },
              orderBy: {
                putawayAt: 'asc',
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

    // 按 SKU + 属性合并上架单行（用于显示）
    const mergedLines = mergeLinesBySkuAndAttributes(order.lines as Parameters<typeof mergeLinesBySkuAndAttributes>[0])

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        lines: mergedLines,
      },
    })
  } catch (error) {
    console.error('获取上架单详情失败:', error)
    return NextResponse.json({ success: false, message: '获取上架单详情失败' }, { status: 500 })
  }
})
