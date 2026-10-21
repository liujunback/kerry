import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/containers/[id]/reset - 重置容器状态
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 使用统一认证中间件（支持 Session 和 JWT）
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { user } = authResult

    const { id: containerId } = await params

    // 检查容器是否存在
    const container = await prisma.container.findFirst({
      where: {
        id: containerId,
        tenantId: user.tenantId,
      },
    })

    if (!container) {
      return NextResponse.json(
        { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查容器是否为空（没有 container_item）
    const itemCount = await prisma.containerItem.count({
      where: { containerId: containerId },
    })

    if (itemCount > 0) {
      return NextResponse.json(
        { success: false, message: '容器内还有物品，无法重置状态', code: 'CONTAINER_NOT_EMPTY' },
        { status: 400 }
      )
    }

    // 重置容器状态
    const updatedContainer = await prisma.container.update({
      where: { id: containerId },
      data: {
        workStatus: 'IDLE',
        currentAsnId: null,
        currentBatchNumber: null,
        currentQualityStatus: null,
        currentSkuId: null,
        closedAt: null,
        updatedBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: '容器状态已重置',
      data: updatedContainer,
    })
  } catch (error) {
    console.error('Reset container error:', error)
    const errorMessage = error instanceof Error ? error.message : '重置容器状态失败'
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}
