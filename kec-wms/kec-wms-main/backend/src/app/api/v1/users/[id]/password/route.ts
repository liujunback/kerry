import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/security/password'
import { resetPasswordSchema } from '@/lib/validations/user'
import { createAuthHandler } from '@/lib/api/create-handler'

// PUT /api/v1/users/[id]/password - 重置用户密码
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = resetPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { newPassword } = validationResult.data

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

    const passwordHash = await hashPassword(newPassword)

    const passwordExpiresAt = new Date()
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90)

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        failedLoginCount: 0,
        lockedAt: null,
        lockedUntil: null,
        status: existingUser.status === 'LOCKED' ? 'ACTIVE' : existingUser.status,
        isActive: existingUser.status === 'LOCKED' ? true : existingUser.isActive,
        updatedBy: auth.user.id,
      },
    })

    await prisma.passwordHistory.create({
      data: {
        userId: id,
        passwordHash,
      },
    })

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    })
  } catch (error) {
    console.error('重置密码失败:', error)
    return NextResponse.json(
      { success: false, message: '重置密码失败' },
      { status: 500 }
    )
  }
})
