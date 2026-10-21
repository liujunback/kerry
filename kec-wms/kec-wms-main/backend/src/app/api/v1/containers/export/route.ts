import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prismaRead } from '@/lib/db/prisma'
import {
containerListQuerySchema,
ContainerTypeLabel,
EnabledStatusLabel,
UsageLabel,
WorkStatusLabel,
} from '@/lib/validations/container'
import { NextResponse } from 'next/server'

// GET /api/v1/containers/export - 导出容器数据
export const GET = createAuthHandler(async (request, auth) => {
  const searchParams = request.nextUrl.searchParams
  const queryResult = containerListQuerySchema.safeParse({
    page: 1,
    pageSize: 1000,
    search: searchParams.get('search'),
    containerType: searchParams.get('containerType'),
    usage: searchParams.get('usage'),
    enabledStatus: searchParams.get('enabledStatus'),
    workStatus: searchParams.get('workStatus'),
    warehouseId: searchParams.get('warehouseId'),
    sortBy: searchParams.get('sortBy'),
    sortOrder: searchParams.get('sortOrder'),
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: queryResult.error.errors },
      { status: 400 }
    )
  }

  const {
    search,
    containerType,
    usage,
    enabledStatus,
    workStatus,
    warehouseId: requestedWarehouseId,
    sortBy,
    sortOrder,
  } = queryResult.data
  const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

  // 构建查询条件
  const where: Record<string, unknown> = {
    tenantId: auth.user.tenantId,
  }

  if (search) {
    where.containerCode = { contains: search }
  }

  if (containerType) {
    where.containerType = containerType
  }

  if (usage) {
    where.usage = usage
  }

  if (enabledStatus) {
    where.enabledStatus = enabledStatus
  }

  if (workStatus) {
    where.workStatus = workStatus
  }

  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  // 查询容器列表（最多1000条）
  const containers = await prismaRead.container.findMany({
    where,
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
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
    take: 1000,
  })

  // 转换为导出格式
  const exportData = containers.map((container) => ({
    containerCode: container.containerCode,
    containerType: ContainerTypeLabel[container.containerType] || container.containerType,
    usage: UsageLabel[container.usage] || container.usage,
    enabledStatus: EnabledStatusLabel[container.enabledStatus] || container.enabledStatus,
    workStatus: WorkStatusLabel[container.workStatus] || container.workStatus,
    weightCapacityKg: container.weightCapacityKg?.toString() || '',
    dimensions: container.lengthCm && container.widthCm && container.heightCm
      ? `${container.lengthCm} × ${container.widthCm} × ${container.heightCm}`
      : '',
    lastOccupiedTime: container.lastOccupiedTime?.toISOString() || '',
    warehouseName: container.warehouse?.warehouseName || '',
    createdAt: container.createdAt.toISOString(),
    remarks: container.remarks || '',
  }))

  return NextResponse.json({
    success: true,
    data: exportData,
    total: exportData.length,
  })
})
