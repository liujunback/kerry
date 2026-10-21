import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/containers/lookup - 根据容器编码查找容器
export const GET = createAuthHandler(async (request, auth) => {
  const searchParams = request.nextUrl.searchParams
  const containerCode = searchParams.get('containerCode')
  const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))

  if (!containerCode) {
    return NextResponse.json(
      { success: false, message: '容器编码不能为空' },
      { status: 400 }
    )
  }

  // 构建查询条件
  const where: Record<string, unknown> = {
    tenantId: auth.user.tenantId,
    containerCode,
  }

  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  // 查找容器
  const container = await prisma.container.findFirst({
    where,
    select: {
      id: true,
      containerCode: true,
      containerType: true,
      usage: true,
      enabledStatus: true,
      workStatus: true,
      warehouseId: true,
      currentAsnId: true,
      closedAt: true,
      warehouse: {
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
  })

  if (!container) {
    return NextResponse.json(
      { success: false, message: '容器不存在' },
      { status: 404 }
    )
  }

  // 转换字段名以匹配前端期望的格式
  return NextResponse.json({
    success: true,
    data: {
      id: container.id,
      containerCode: container.containerCode,
      containerType: container.containerType,
      purpose: container.usage,
      status: container.workStatus,
      isEnabled: container.enabledStatus === 'ENABLED',
      warehouseId: container.warehouseId,
      currentAsnId: container.currentAsnId,
      closedAt: container.closedAt,
      warehouse: container.warehouse,
    },
  })
})
