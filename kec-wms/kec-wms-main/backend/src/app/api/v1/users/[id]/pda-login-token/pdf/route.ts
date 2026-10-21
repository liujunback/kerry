import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { generateQRCode } from '@/lib/pdf/barcode'
import { generatePdaLoginQrcodePdf } from '@/lib/services/pdf/pda-login-qrcode'

export const POST = createAuthHandler(async (request: NextRequest, auth, context) => {
  try {
    const { id: userId } = await context!.params
    const body = await request.json()
    const qrCodeData = typeof body.qrCodeData === 'string' ? body.qrCodeData : ''
    const expiresAt = typeof body.expiresAt === 'string' ? new Date(body.expiresAt) : null

    if (!qrCodeData || !expiresAt || Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        { success: false, message: '二维码数据或过期时间无效' },
        { status: 400 }
      )
    }

    if (expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, message: '二维码已过期，请重新生成后再打印' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: auth.user.tenantId,
      },
      select: {
        username: true,
        fullName: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    const qrCodeImage = await generateQRCode(qrCodeData, {
      scale: 6,
      eclevel: 'M',
    })

    const { buffer, filename } = await generatePdaLoginQrcodePdf({
      fullName: user.fullName,
      username: user.username,
      expiresAt,
      qrCodeImage,
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('生成 PDA 快捷登录二维码 PDF 失败:', error)
    const message = error instanceof Error ? error.message : '生成 PDA 快捷登录二维码 PDF 失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})
