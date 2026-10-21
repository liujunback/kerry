import { NextResponse } from 'next/server'
import { generateQRCode } from '@/lib/pdf/barcode'
import { resolvePublicOrigin } from '@/lib/utils/public-origin'

export async function GET(request: Request) {
  try {
    const origin = resolvePublicOrigin(request)
    const downloadUrl = new URL('/pda-download', origin).toString()
    const qrCodeImage = await generateQRCode(downloadUrl, {
      scale: 5,
      eclevel: 'M',
    })

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        qrCodeImage,
      },
    })
  } catch (error) {
    console.error('生成 PDA 下载二维码失败:', error)
    return NextResponse.json(
      { success: false, message: '生成下载二维码失败，请稍后重试' },
      { status: 500 }
    )
  }
}
