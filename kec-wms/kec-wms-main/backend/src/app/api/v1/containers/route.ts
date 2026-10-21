import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import {
containerListQuerySchema,
ContainerTypeLabel,
ContainerTypePrefix,
ContainerUsagePrefix,
createContainerSchema,
EnabledStatusLabel,
UsageLabel,
WorkStatusLabel,
} from '@/lib/validations/container'
import dayjs from 'dayjs'
import { NextRequest,NextResponse } from 'next/server'

// 生成容器编码
async function generateContainerCode(
  tenantId: string,
  warehouseId: string,
  containerType: string,
  usage: string
): Promise<string> {
  const typePrefix = ContainerTypePrefix[containerType] || 'CT'
  const usagePrefix = ContainerUsagePrefix[usage] || ''
  const prefix = `${typePrefix}${usagePrefix}`
  const today = dayjs().format('YYYYMMDD')

  // 获取今天该仓库、类型、用途的最后一个容器编码
  const lastContainer = await prisma.container.findFirst({
    where: {
      tenantId,
      warehouseId,
      containerCode: { startsWith: `${prefix}${today}` },
    },
    orderBy: { containerCode: 'desc' },
  })

  let sequence = 1
  if (lastContainer) {
    const lastSequence = parseInt(lastContainer.containerCode.slice(-6))
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${today}${sequence.toString().padStart(6, '0')}`
}

// GET /api/v1/containers - 获取容器列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = containerListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
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
      page,
      pageSize,
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

    // 查询总数
    const total = await prisma.container.count({ where })

    // 查询容器列表
    const containers = await prisma.container.findMany({
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
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 添加中文标签
    const containersWithLabels = containers.map((container) => ({
      ...container,
      containerTypeLabel: ContainerTypeLabel[container.containerType] || container.containerType,
      usageLabel: UsageLabel[container.usage] || container.usage,
      enabledStatusLabel: EnabledStatusLabel[container.enabledStatus] || container.enabledStatus,
      workStatusLabel: WorkStatusLabel[container.workStatus] || container.workStatus,
    }))

    return NextResponse.json({
      success: true,
      data: containersWithLabels,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取容器列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取容器列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/containers - 创建容器
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = createContainerSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 验证仓库是否存在
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

    // 生成或验证容器编码
    let containerCode = data.containerCode
    if (!containerCode) {
      containerCode = await generateContainerCode(
        auth.user.tenantId,
        data.warehouseId,
        data.containerType,
        data.usage
      )
    } else {
      // 检查编码是否已存在（租户 + 容器编码，全局唯一）
      const existingContainer = await prisma.container.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          containerCode,
        },
      })

      if (existingContainer) {
        return NextResponse.json(
          { success: false, message: '容器编码已存在', code: 'CONTAINER_CODE_DUPLICATE' },
          { status: 400 }
        )
      }
    }

    // 创建容器
    const container = await prisma.container.create({
      data: {
        tenantId: auth.user.tenantId,
        warehouseId: data.warehouseId,
        containerCode,
        containerType: data.containerType,
        usage: data.usage,
        enabledStatus: 'ENABLED',
        workStatus: 'IDLE',
        weightCapacityKg: data.weightCapacityKg || null,
        lengthCm: data.lengthCm || null,
        widthCm: data.widthCm || null,
        heightCm: data.heightCm || null,
        remarks: data.remarks || null,
        createdBy: auth.user.id,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        containerCode: true,
        containerType: true,
        usage: true,
        enabledStatus: true,
        workStatus: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...container,
        containerTypeLabel: ContainerTypeLabel[container.containerType],
        usageLabel: UsageLabel[container.usage],
      },
      message: '容器创建成功',
    })
  } catch (error) {
    console.error('创建容器失败:', error)
    return NextResponse.json(
      { success: false, message: '创建容器失败' },
      { status: 500 }
    )
  }
})
