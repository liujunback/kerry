import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { ContainerTypePrefix,ContainerUsagePrefix,generateCodeSchema } from '@/lib/validations/container'
import dayjs from 'dayjs'
import { NextResponse } from 'next/server'

// POST /api/v1/containers/generate-code - 生成容器编码
export const POST = createAuthHandler(async (request, auth) => {
  const body = await request.json()
  const validationResult = generateCodeSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const { containerType, usage } = validationResult.data
  const typePrefix = ContainerTypePrefix[containerType] || 'CT'
  const usagePrefix = ContainerUsagePrefix[usage] || ''
  const prefix = `${typePrefix}${usagePrefix}`
  const today = dayjs().format('YYYYMMDD')

  // 获取今天该类型和用途的最后一个容器编码
  const lastContainer = await prisma.container.findFirst({
    where: {
      tenantId: auth.user.tenantId,
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

  const containerCode = `${prefix}${today}${sequence.toString().padStart(6, '0')}`

  return NextResponse.json({
    success: true,
    data: {
      containerCode,
      prefix,
      date: today,
      sequence,
    },
  })
})
