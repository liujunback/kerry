import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/containers/[id]/repack - 重新装箱（清空容器并回滚收货记录）
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id: containerId } = await params
    const body = await request.json()
    const { asnId } = body

    if (!asnId) {
      return NextResponse.json(
        { success: false, message: 'ASN ID不能为空', code: 'ASN_ID_REQUIRED' },
        { status: 400 }
      )
    }

    // 检查容器是否存在
    const container = await prisma.container.findFirst({
      where: {
        id: containerId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!container) {
      return NextResponse.json(
        { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查ASN是否存在
    const asn = await prisma.asn.findFirst({
      where: {
        id: asnId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取该容器在该ASN下的所有收货记录
    const receivingRecords = await prisma.receivingRecord.findMany({
      where: {
        containerId: containerId,
        asnId: asnId,
        tenantId: auth.user.tenantId,
      },
    })

    if (receivingRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: '该容器在此ASN下没有收货记录', code: 'NO_RECEIVING_RECORDS' },
        { status: 400 }
      )
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 按ASN行汇总需要回滚的数量
      const rollbackByLine: Record<string, number> = {}
      for (const record of receivingRecords) {
        if (record.asnLineId) {
          rollbackByLine[record.asnLineId] = (rollbackByLine[record.asnLineId] || 0) + record.receivedQty
        }
      }

      // 2. 回滚ASN行的收货数量
      for (const [asnLineId, qty] of Object.entries(rollbackByLine)) {
        const asnLine = await tx.asnLine.findUnique({
          where: { id: asnLineId },
        })
        if (asnLine) {
          const newReceivedQty = Math.max(0, asnLine.receivedQty - qty)
          const newReceivedGoodQty = Math.max(0, asnLine.receivedGoodQty - qty)
          await tx.asnLine.update({
            where: { id: asnLineId },
            data: {
              receivedQty: newReceivedQty,
              receivedGoodQty: newReceivedGoodQty,
              status: newReceivedQty === 0 ? 'PENDING' : newReceivedQty < asnLine.expectedQty ? 'RECEIVING' : 'RECEIVED',
              updatedBy: auth.user.id,
            },
          })
        }
      }

      // 3. 计算总回滚数量
      const totalRollbackQty = receivingRecords.reduce((sum, r) => sum + r.receivedQty, 0)

      // 4. 更新ASN的收货数量
      const newTotalReceivedQty = Math.max(0, asn.totalReceivedQty - totalRollbackQty)

      // 重新计算已收货行数
      const receivedLinesCount = await tx.asnLine.count({
        where: {
          asnId: asnId,
          receivedQty: { gt: 0 },
        },
      })

      await tx.asn.update({
        where: { id: asnId },
        data: {
          totalReceivedQty: newTotalReceivedQty,
          totalReceivedLines: receivedLinesCount,
          updatedBy: auth.user.id,
        },
      })

      // 5. 删除该容器在该ASN下的ContainerItem
      await tx.containerItem.deleteMany({
        where: {
          containerId: containerId,
          asnId: asnId,
        },
      })

      // 6. 删除收货记录
      await tx.receivingRecord.deleteMany({
        where: {
          containerId: containerId,
          asnId: asnId,
          tenantId: auth.user.tenantId,
        },
      })

      // 7. 检查容器是否还有其他物品，如果没有则释放容器
      const remainingItems = await tx.containerItem.count({
        where: { containerId: containerId },
      })

      if (remainingItems === 0) {
        // 容器已清空，重置所有状态
        await tx.container.update({
          where: { id: containerId },
          data: {
            workStatus: 'IDLE',
            currentAsnId: null,
            currentBatchNumber: null,
            currentQualityStatus: null,
            currentSkuId: null,
            closedAt: null,
            updatedBy: auth.user.id,
          },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: '重新装箱成功，已清空容器并回滚收货记录',
    })
  } catch (error) {
    console.error('重新装箱失败:', error)
    return NextResponse.json(
      { success: false, message: '重新装箱失败' },
      { status: 500 }
    )
  }
})
