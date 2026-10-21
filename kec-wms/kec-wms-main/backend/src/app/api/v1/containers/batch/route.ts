import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
batchCreateContainerSchema,
ContainerTypeLabel,
ContainerTypePrefix,
ContainerUsagePrefix,
UsageLabel,
} from '@/lib/validations/container'
import dayjs from 'dayjs'
import { NextResponse } from 'next/server'

// 生成容器编码
async function generateContainerCode(
  tenantId: string,
  warehouseId: string,
  containerType: string,
  usage: string,
  offset: number = 0
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

  return `${prefix}${today}${(sequence + offset).toString().padStart(6, '0')}`
}

// POST /api/v1/containers/batch - 批量创建容器
export const POST = createAuthHandler(async (request, auth) => {
  const body = await request.json()
  const validationResult = batchCreateContainerSchema.safeParse(body)

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

  // 生成容器编码列表
  const containerCodes: string[] = []
  for (let i = 0; i < data.quantity; i++) {
    const code = await generateContainerCode(
      auth.user.tenantId,
      data.warehouseId,
      data.containerType,
      data.usage,
      i
    )
    containerCodes.push(code)
  }

  // 批量创建容器
  const containers = await prisma.$transaction(
    containerCodes.map((containerCode) =>
      prisma.container.create({
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
        },
      })
    )
  )

  return NextResponse.json({
    success: true,
    data: {
      total: data.quantity,
      successCount: containers.length,
      failedCount: 0,
      containerCodes: containers.map((c) => c.containerCode),
      containers: containers.map((c) => ({
        ...c,
        containerTypeLabel: ContainerTypeLabel[c.containerType],
        usageLabel: UsageLabel[c.usage],
      })),
    },
    message: `批量创建成功，共创建 ${containers.length} 个容器`,
  })
})
