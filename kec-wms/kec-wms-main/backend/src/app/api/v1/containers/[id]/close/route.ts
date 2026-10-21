import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { asnStateMachine,AsnStatus } from '@/lib/services/asn-state-machine'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/containers/[id]/close - 关闭容器（关箱）
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 检查容器是否存在
    const existingContainer = await prisma.container.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingContainer) {
      return NextResponse.json(
        { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查容器是否启用
    if (existingContainer.enabledStatus !== 'ENABLED') {
      return NextResponse.json(
        { success: false, message: '容器已禁用', code: 'CONTAINER_DISABLED' },
        { status: 400 }
      )
    }

    // 检查容器内是否有物品（containerItem 表示当前容器内的物品）
    const containerItems = await prisma.containerItem.findMany({
      where: {
        containerId: id,
        tenantId: auth.user.tenantId,
      },
      include: {
        sku: {
          select: {
            id: true,
            skuCode: true,
            skuName: true,
            isExpiryManaged: true,
          },
        },
      },
    })

    if (containerItems.length === 0) {
      return NextResponse.json(
        { success: false, message: '容器内没有物品，无法关箱', code: 'CONTAINER_EMPTY' },
        { status: 400 }
      )
    }

    // 为了检查效期，我们需要获取容器内物品关联的收货记录
    const receivingRecords = await prisma.receivingRecord.findMany({
      where: {
        containerId: id,
        tenantId: auth.user.tenantId,
      },
      include: {
        sku: {
          select: {
            id: true,
            skuCode: true,
            skuName: true,
            isExpiryManaged: true,
          },
        },
      },
    })

    // 检查需要效期管理的 SKU 是否都填写了效期
    const missingExpirySkus: Array<{ skuCode: string; skuName: string | null }> = []

    for (const record of receivingRecords) {
      if (record.sku.isExpiryManaged && !record.expiryDate) {
        // 避免重复添加同一个 SKU
        if (!missingExpirySkus.find(s => s.skuCode === record.sku.skuCode)) {
          missingExpirySkus.push({
            skuCode: record.sku.skuCode,
            skuName: record.sku.skuName,
          })
        }
      }
    }

    if (missingExpirySkus.length > 0) {
      const skuList = missingExpirySkus
        .map(s => `${s.skuCode}${s.skuName ? ` (${s.skuName})` : ''}`)
        .join('、')

      return NextResponse.json(
        {
          success: false,
          message: `以下SKU需要效期管理，请填写效期后再关箱：${skuList}`,
          code: 'MISSING_EXPIRY_DATE',
          data: { missingExpirySkus },
        },
        { status: 400 }
      )
    }

    // 获取容器关联的 ASN
    const currentAsnId = existingContainer.currentAsnId
    let asnUpdated = false
    let asnInfo: { id: string; asnNumber: string; previousStatus: string; newStatus: string } | null = null

    if (currentAsnId) {
      // 获取 ASN 信息
      const asn = await prisma.asn.findFirst({
        where: {
          id: currentAsnId,
          tenantId: auth.user.tenantId,
        },
        include: {
          asnLines: {
            select: {
              id: true,
              expectedQty: true,
              receivedQty: true,
            },
          },
        },
      })

      if (asn && asn.status === 'RECEIVING') {
        // 检查是否所有行项目都已收货完成
        const allCompleted = asn.asnLines.every((line) => line.receivedQty >= line.expectedQty)

        if (allCompleted) {
          // 更新 ASN 状态为 RECEIVED
          await prisma.asn.update({
            where: { id: currentAsnId },
            data: {
              status: 'RECEIVED',
              receivingEndAt: new Date(),
            },
          })

          asnUpdated = true
          asnInfo = {
            id: asn.id,
            asnNumber: asn.asnNumber,
            previousStatus: asn.status,
            newStatus: 'RECEIVED',
          }

          // 记录操作日志（使用状态机）
          const ctx = {
            tenantId: auth.user.tenantId,
            userId: auth.user.id,
            userName: auth.user.name || undefined,
          }
          asnStateMachine.logStatusChange(
            asn.id,
            asn.asnNumber,
            'COMPLETE_RECEIVE',
            asn.status as AsnStatus,
            'RECEIVED' as AsnStatus,
            ctx
          )
        }
      }
    }

    // 更新工作状态为 CLOSED（关箱），并设置关箱时间
    // 注意：不删除 ContainerItem 数据，因为上架单创建需要用到这些数据
    // ContainerItem 会在上架完成后清理
    const container = await prisma.container.update({
      where: { id },
      data: {
        workStatus: 'CLOSED',
        currentAsnId: null,
        closedAt: new Date(),
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        containerCode: true,
        enabledStatus: true,
        workStatus: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...container,
        asnUpdated,
        asnInfo,
      },
      message: asnUpdated ? '容器已关箱，ASN收货已完成' : '容器已关箱',
    })
  } catch (error) {
    console.error('关闭容器失败:', error)
    return NextResponse.json(
      { success: false, message: '关闭容器失败' },
      { status: 500 }
    )
  }
})
