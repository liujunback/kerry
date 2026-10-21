import { NextResponse } from 'next/server'
import { generateCaptcha } from '@/lib/security/captcha'
import { createHandler } from '@/lib/api/create-handler'

export const GET = createHandler(async () => {
  try {
    const captcha = await generateCaptcha()

    return NextResponse.json({
      success: true,
      data: {
        captchaId: captcha.captchaId,
        bgSvg: captcha.bgSvg,
        pieceSvg: captcha.pieceSvg,
        y: captcha.y,
      },
    })
  } catch (error) {
    console.error('生成验证码失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '生成验证码失败',
      },
      { status: 500 }
    )
  }
})
