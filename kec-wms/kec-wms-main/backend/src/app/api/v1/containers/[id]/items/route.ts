import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/containers/[id]/items - 获取容器内物品明细
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 检查容器是否存在
    const container = await prisma.container.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!container) {
      return NextResponse.json(
        { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取容器内物品
    const items = await prisma.containerItem.findMany({
      where: {
        containerId: id,
      },
      orderBy: {
        receivedAt: 'desc',
      },
    })

    // 计算汇总
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const skuSet = new Set(items.map(item => item.skuId))

    return NextResponse.json({
      success: true,
      data: {
        items,
        summary: {
          totalQuantity,
          skuCount: skuSet.size,
          itemCount: items.length,
        },
      },
    })
  } catch (error) {
    console.error('获取容器物品失败:', error)
    return NextResponse.json(
      { success: false, message: '获取容器物品失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/containers/[id]/items - 清空容器内物品（重新装箱）
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 检查容器是否存在
    const container = await prisma.container.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!container) {
      return NextResponse.json(
        { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 使用事务清空容器物品并更新相关数据
    await prisma.$transaction(async (tx) => {
      // 获取容器内所有物品
      const containerItems = await tx.containerItem.findMany({
        where: { containerId: id },
      })

      // 按 asnLineId 分组，计算每个行项目需要回退的数量
      const lineUpdates = new Map<string, { goodQty: number; damagedQty: number }>()

      for (const item of containerItems) {
        if (item.asnLineId) {
          const existing = lineUpdates.get(item.asnLineId) || { goodQty: 0, damagedQty: 0 }
          if (item.qualityType === 'GOOD') {
            existing.goodQty += item.quantity
          } else {
            existing.damagedQty += item.quantity
          }
          lineUpdates.set(item.asnLineId, existing)
        }
      }

      // 回退 ASN 行项目的收货数量
      for (const [lineId, updates] of lineUpdates) {
        const line = await tx.asnLine.findUnique({ where: { id: lineId } })
        if (line) {
          const newReceivedQty = Math.max(0, line.receivedQty - updates.goodQty - updates.damagedQty)
          const newReceivedGoodQty = Math.max(0, line.receivedGoodQty - updates.goodQty)
          const newReceivedDamagedQty = Math.max(0, line.receivedDamagedQty - updates.damagedQty)

          // 确定新状态
          let newStatus = line.status
          if (newReceivedQty === 0) {
            newStatus = 'PENDING'
          } else if (newReceivedQty < line.expectedQty) {
            newStatus = 'RECEIVING'
          }

          await tx.asnLine.update({
            where: { id: lineId },
            data: {
              receivedQty: newReceivedQty,
              receivedGoodQty: newReceivedGoodQty,
              receivedDamagedQty: newReceivedDamagedQty,
              status: newStatus,
            },
          })
        }
      }

      // 回退 ASN 汇总数据
      const asnIds = new Set(containerItems.map(item => item.asnId))

      for (const asnId of asnIds) {
        const asn = await tx.asn.findUnique({ where: { id: asnId } })
        if (asn) {
          const asnItemsQty = containerItems
            .filter(item => item.asnId === asnId)
            .reduce((sum, item) => sum + item.quantity, 0)

          await tx.asn.update({
            where: { id: asnId },
            data: {
              totalReceivedQty: Math.max(0, asn.totalReceivedQty - asnItemsQty),
            },
          })
        }
      }

      // 删除容器内所有物品
      await tx.containerItem.deleteMany({
        where: { containerId: id },
      })
    })

    return NextResponse.json({
      success: true,
      message: '容器已清空，可重新装箱',
    })
  } catch (error) {
    console.error('清空容器物品失败:', error)
    return NextResponse.json(
      { success: false, message: '清空容器物品失败' },
      { status: 500 }
    )
  }
})
