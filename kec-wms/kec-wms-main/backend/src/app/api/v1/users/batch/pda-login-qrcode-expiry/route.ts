import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { batchSetPdaLoginQrExpirySchema } from '@/lib/validations/user'

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = batchSetPdaLoginQrExpirySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { userIds, expiresAt } = validationResult.data
    const tenantId = auth.user.tenantId
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null

    if (expiresAtDate && expiresAtDate <= new Date()) {
      return NextResponse.json(
        { success: false, message: 'PDA 快捷登录二维码过期时间必须晚于当前时间' },
        { status: 400 }
      )
    }

    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        tenantId,
      },
      select: {
        id: true,
      },
    })

    const existingUserIds = new Set(existingUsers.map((user) => user.id))
    const missingCount = userIds.length - existingUsers.length

    if (existingUsers.length > 0) {
      await prisma.user.updateMany({
        where: {
          id: { in: existingUsers.map((user) => user.id) },
          tenantId,
        },
        data: {
          pdaLoginQrExpiresAt: expiresAtDate,
          updatedBy: auth.user.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: '批量设置 PDA 快捷登录二维码过期时间完成',
      data: {
        summary: {
          totalUsers: userIds.length,
          successful: existingUsers.length,
          failed: missingCount,
        },
        updatedUserIds: Array.from(existingUserIds),
        expiresAt: expiresAtDate?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error('批量设置 PDA 快捷登录二维码过期时间失败:', error)
    return NextResponse.json(
      { success: false, message: '批量设置 PDA 快捷登录二维码过期时间失败' },
      { status: 500 }
    )
  }
})
