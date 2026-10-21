import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { changeStatusSchema } from '@/lib/validations/user'
import { createAuthHandler } from '@/lib/api/create-handler'

// PUT /api/v1/users/[id]/status - 修改用户状态
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = changeStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status } = validationResult.data

    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    if (id === auth.user.id) {
      return NextResponse.json(
        { success: false, message: '不能修改自己的状态' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      status,
      isActive: status === 'ACTIVE',
      updatedBy: auth.user.id,
    }

    if (status === 'ACTIVE' && existingUser.status === 'LOCKED') {
      updateData.lockedAt = null
      updateData.lockedUntil = null
      updateData.failedLoginCount = 0
    }

    if (status === 'LOCKED') {
      updateData.lockedAt = new Date()
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        status: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: '状态更新成功',
    })
  } catch (error) {
    console.error('更新用户状态失败:', error)
    return NextResponse.json(
      { success: false, message: '更新用户状态失败' },
      { status: 500 }
    )
  }
})
