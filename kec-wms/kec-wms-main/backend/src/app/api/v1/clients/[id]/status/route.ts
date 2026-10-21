import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeClientStatusSchema } from '@/lib/validations/client'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/v1/clients/[id]/status - 修改客户状态
export const PUT = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const validationResult = changeClientStatusSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const existingClient = await prisma.client.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
  })

  if (!existingClient) {
    return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  const { isActive } = validationResult.data

  const client = await prisma.client.update({
    where: { id },
    data: { isActive, updatedBy: auth.user.id },
    select: {
      id: true,
      clientCode: true,
      clientName: true,
      isActive: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: client,
    message: isActive ? '客户已启用' : '客户已停用',
  })
})
