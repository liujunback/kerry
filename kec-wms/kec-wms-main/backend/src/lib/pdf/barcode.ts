import bwipjs from 'bwip-js'

/**
 * 生成二维码图片（Base64 PNG）
 * @param text - 二维码内容
 * @param options - 配置选项
 * @param options.scale - 缩放比例，默认 3
 * @param options.eclevel - 纠错级别 (L=7%, M=15%, Q=25%, H=30%)，默认 'M'
 * @returns Base64 编码的 PNG 图片（data:image/png;base64,...）
 */
export async function generateQRCode(
  text: string,
  options?: {
    scale?: number
    eclevel?: 'L' | 'M' | 'Q' | 'H'
  }
): Promise<string> {
  // eclevel 是 QR 码的有效选项，但 bwip-js 类型定义不完整，使用类型断言
  const buffer = await bwipjs.toBuffer({
    bcid: 'qrcode',
    text: text,
    scale: options?.scale || 3,
    eclevel: options?.eclevel || 'M',
  } as bwipjs.ToBufferOptions)

  return `data:image/png;base64,${buffer.toString('base64')}`
}

/**
 * 生成条码图片（Base64 PNG）
 */
export async function generateBarcode(
  text: string,
  options?: {
    bcid?: string
    scale?: number
    height?: number
    includetext?: boolean
  }
): Promise<string> {
  const buffer = await bwipjs.toBuffer({
    bcid: options?.bcid || 'code128',
    text: text,
    scale: options?.scale || 2,
    height: options?.height || 8,
    includetext: options?.includetext ?? true,
    textxalign: 'center',
    textsize: 8,
  })

  return `data:image/png;base64,${buffer.toString('base64')}`
}
