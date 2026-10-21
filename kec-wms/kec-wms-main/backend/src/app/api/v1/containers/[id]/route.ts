import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
ContainerTypeLabel,
EnabledStatusLabel,
updateContainerSchema,
UsageLabel,
WorkStatusLabel,
} from '@/lib/validations/container'
import { NextResponse } from 'next/server'

// GET /api/v1/containers/[id] - 获取容器详情
export const GET = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params

  const container = await prisma.container.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
    select: {
      id: true,
      containerCode: true,
      containerType: true,
      usage: true,
      enabledStatus: true,
      workStatus: true,
      lastOccupiedTime: true,
      weightCapacityKg: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      remarks: true,
      createdAt: true,
      updatedAt: true,
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
      { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      ...container,
      containerTypeLabel: ContainerTypeLabel[container.containerType] || container.containerType,
      usageLabel: UsageLabel[container.usage] || container.usage,
      enabledStatusLabel: EnabledStatusLabel[container.enabledStatus] || container.enabledStatus,
      workStatusLabel: WorkStatusLabel[container.workStatus] || container.workStatus,
    },
  })
})

// PUT /api/v1/containers/[id] - 更新容器
export const PUT = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const validationResult = updateContainerSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const data = validationResult.data

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

  // 如果更新仓库，验证仓库是否存在
  if (data.warehouseId) {
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: data.warehouseId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
        { status: 404 }
      )
    }
  }

  // 更新容器
  const container = await prisma.container.update({
    where: { id },
    data: {
      ...data,
      updatedBy: auth.user.id,
    },
    select: {
      id: true,
      containerCode: true,
      containerType: true,
      usage: true,
      enabledStatus: true,
      workStatus: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...container,
      containerTypeLabel: ContainerTypeLabel[container.containerType],
      usageLabel: UsageLabel[container.usage],
    },
    message: '容器更新成功',
  })
})

// DELETE /api/v1/containers/[id] - 删除容器
export const DELETE = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params

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

  // 检查是否可以删除（必须是禁用且空闲状态）
  if (existingContainer.enabledStatus !== 'DISABLED') {
    return NextResponse.json(
      { success: false, message: '只能删除已禁用的容器', code: 'CONTAINER_CANNOT_DELETE' },
      { status: 400 }
    )
  }

  if (existingContainer.workStatus !== 'IDLE') {
    return NextResponse.json(
      { success: false, message: '容器正在使用中，无法删除', code: 'CONTAINER_OCCUPIED' },
      { status: 400 }
    )
  }

  // 删除容器
  await prisma.container.delete({
    where: { id },
  })

  return NextResponse.json({
    success: true,
    message: '容器删除成功',
  })
})
