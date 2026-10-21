import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { batchChangeEnabledStatusSchema } from '@/lib/validations/container'
import { NextResponse } from 'next/server'

// PUT /api/v1/containers/batch/status - 批量修改容器启用状态
export const PUT = createAuthHandler(async (request, auth) => {
  const body = await request.json()
  const validationResult = batchChangeEnabledStatusSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const { containerIds, enabledStatus } = validationResult.data

  // 获取所有容器
  const containers = await prisma.container.findMany({
    where: {
      id: { in: containerIds },
      tenantId: auth.user.tenantId,
    },
    select: {
      id: true,
      containerCode: true,
      enabledStatus: true,
      workStatus: true,
    },
  })

  const results = {
    total: containerIds.length,
    successCount: 0,
    failedCount: 0,
    failedItems: [] as { containerId: string; containerCode: string; reason: string }[],
  }

  // 处理每个容器
  for (const container of containers) {
    // 检查当前状态
    if (container.enabledStatus === enabledStatus) {
      results.failedCount++
      results.failedItems.push({
        containerId: container.id,
        containerCode: container.containerCode,
        reason: enabledStatus === 'ENABLED' ? '容器已启用' : '容器已禁用',
      })
      continue
    }

    // 禁用时检查工作状态
    if (enabledStatus === 'DISABLED' && container.workStatus !== 'IDLE') {
      results.failedCount++
      results.failedItems.push({
        containerId: container.id,
        containerCode: container.containerCode,
        reason: '容器正在使用中，无法禁用',
      })
      continue
    }

    // 更新状态
    try {
      await prisma.container.update({
        where: { id: container.id },
        data: {
          enabledStatus,
          updatedBy: auth.user.id,
        },
      })
      results.successCount++
    } catch {
      results.failedCount++
      results.failedItems.push({
        containerId: container.id,
        containerCode: container.containerCode,
        reason: '更新失败',
      })
    }
  }

  // 检查是否有未找到的容器
  const foundIds = containers.map((c) => c.id)
  const notFoundIds = containerIds.filter((id) => !foundIds.includes(id))
  for (const id of notFoundIds) {
    results.failedCount++
    results.failedItems.push({
      containerId: id,
      containerCode: '',
      reason: '容器不存在',
    })
  }

  const statusText = enabledStatus === 'ENABLED' ? '启用' : '禁用'
  return NextResponse.json({
    success: true,
    data: results,
    message: `批量${statusText}完成：成功 ${results.successCount} 个，失败 ${results.failedCount} 个`,
  })
})
