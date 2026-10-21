import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeEnabledStatusSchema } from '@/lib/validations/container'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// 工作状态更新验证
// 支持 IDLE, OCCUPIED, CLOSED 状态转换
const changeWorkStatusSchema = z.object({
  workStatus: z.enum(['IDLE', 'OCCUPIED', 'CLOSED']),
})

// PUT /api/v1/containers/[id]/status - 修改容器启用状态
export const PUT = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const validationResult = changeEnabledStatusSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const { enabledStatus } = validationResult.data

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

  // 检查当前状态
  if (existingContainer.enabledStatus === enabledStatus) {
    const statusText = enabledStatus === 'ENABLED' ? '启用' : '禁用'
    return NextResponse.json(
      { success: false, message: `容器已${statusText}`, code: `CONTAINER_ALREADY_${enabledStatus}` },
      { status: 400 }
    )
  }

  // 禁用时检查工作状态
  if (enabledStatus === 'DISABLED' && existingContainer.workStatus !== 'IDLE') {
    return NextResponse.json(
      { success: false, message: '容器正在使用中，无法禁用', code: 'CONTAINER_OCCUPIED' },
      { status: 400 }
    )
  }

  // 更新状态
  const container = await prisma.container.update({
    where: { id },
    data: {
      enabledStatus,
      updatedBy: auth.user.id,
    },
    select: {
      id: true,
      containerCode: true,
      enabledStatus: true,
      workStatus: true,
    },
  })

  const statusText = enabledStatus === 'ENABLED' ? '启用' : '禁用'
  return NextResponse.json({
    success: true,
    data: container,
    message: `容器已${statusText}`,
  })
})

// PATCH /api/v1/containers/[id]/status - 修改容器工作状态（关箱/释放）
export const PATCH = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
  const validationResult = changeWorkStatusSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const { workStatus } = validationResult.data

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

  // 检查当前状态
  if (existingContainer.workStatus === workStatus) {
    const statusText = workStatus === 'OCCUPIED' ? '占用' : '空闲'
    return NextResponse.json(
      { success: false, message: `容器已是${statusText}状态`, code: `CONTAINER_ALREADY_${workStatus}` },
      { status: 400 }
    )
  }

  // 更新工作状态
  // 注意：existingContainer.lastOccupiedTime 可能是格式化后的字符串，需要转换
  const lastOccupiedTimeValue = workStatus === 'OCCUPIED'
    ? new Date()
    : (existingContainer.lastOccupiedTime
        ? new Date(existingContainer.lastOccupiedTime)
        : null)

  const container = await prisma.container.update({
    where: { id },
    data: {
      workStatus,
      lastOccupiedTime: lastOccupiedTimeValue,
      // 当状态变为 IDLE 时，清理相关字段
      ...(workStatus === 'IDLE' && {
        closedAt: null,
        currentAsnId: null,
        currentBatchNumber: null,
        currentQualityStatus: null,
        currentSkuId: null,
      }),
      updatedBy: auth.user.id,
    },
    select: {
      id: true,
      containerCode: true,
      enabledStatus: true,
      workStatus: true,
    },
  })

  const statusText = workStatus === 'IDLE' ? '已重置' : workStatus === 'OCCUPIED' ? '已关箱' : '状态已更新'
    return NextResponse.json({
      success: true,
      data: container,
      message: `容器${statusText}`,
    })
  } catch (error) {
    console.error('PATCH /api/v1/containers/[id]/status 错误:', error)
    return NextResponse.json(
      { success: false, message: `更新容器状态失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
})
