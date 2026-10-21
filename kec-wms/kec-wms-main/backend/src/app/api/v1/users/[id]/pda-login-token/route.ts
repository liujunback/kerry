/**
 * PDA 登录令牌生成 API
 *
 * POST /api/v1/users/[id]/pda-login-token
 * 为指定用户生成 PDA 扫码登录的一次性临时令牌
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generatePdaLoginToken } from '@/lib/auth/pda-token'
import { generateQRCode } from '@/lib/pdf/barcode'
import { createAuthHandler } from '@/lib/api/create-handler'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id: userId } = await context!.params

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        userType: true,
        status: true,
        isActive: true,
        pdaLoginQrExpiresAt: true,
        tenant: {
          select: {
            id: true,
            tenantCode: true,
            tenantName: true,
            status: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    if (!user.isActive || user.status === 'DISABLED') {
      return NextResponse.json(
        { success: false, message: '该用户已被禁用，无法生成登录二维码' },
        { status: 400 }
      )
    }

    if (user.status === 'LOCKED') {
      return NextResponse.json(
        { success: false, message: '该用户已被锁定，无法生成登录二维码' },
        { status: 400 }
      )
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: '该用户已被暂停，无法生成登录二维码' },
        { status: 400 }
      )
    }

    if (user.tenant.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: '租户已被禁用，无法生成登录二维码' },
        { status: 400 }
      )
    }

    const rawPdaLoginQrExpiresAt = user.pdaLoginQrExpiresAt as Date | string | null
    const pdaLoginQrExpiresAt = rawPdaLoginQrExpiresAt
      ? rawPdaLoginQrExpiresAt instanceof Date
        ? new Date(rawPdaLoginQrExpiresAt.getTime())
        : new Date(rawPdaLoginQrExpiresAt)
      : null

    if (pdaLoginQrExpiresAt && Number.isNaN(pdaLoginQrExpiresAt.getTime())) {
      return NextResponse.json(
        { success: false, message: '该用户的 PDA 快捷登录二维码过期时间无效，请管理员重新设置' },
        { status: 400 }
      )
    }

    if (pdaLoginQrExpiresAt && pdaLoginQrExpiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, message: '该用户的 PDA 快捷登录二维码过期时间已过期，请管理员重新设置' },
        { status: 400 }
      )
    }

    const { token, expiresAt, qrCodeData } = await generatePdaLoginToken({
      userId: user.id,
      tenantId: user.tenant.id,
      tenantCode: user.tenant.tenantCode,
      username: user.username,
      userType: user.userType,
      expiresAt: pdaLoginQrExpiresAt ?? undefined,
    })

    const qrCodeImage = await generateQRCode(qrCodeData, {
      scale: 5,
      eclevel: 'M',
    })

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        qrCodeData,
        qrCodeImage,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        },
      },
    })
  } catch (error) {
    console.error('生成 PDA 登录令牌失败:', error)
    return NextResponse.json(
      { success: false, message: '生成登录二维码失败，请稍后重试' },
      { status: 500 }
    )
  }
})
