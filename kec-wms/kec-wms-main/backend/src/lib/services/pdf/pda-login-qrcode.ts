import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { PdaLoginQrcodePdf } from '@/lib/pdf/templates/pda-login-qrcode'
import { formatDateTime } from '@/lib/utils/date-formatter'

export interface PdaLoginQrcodePdfInput {
  fullName: string
  username: string
  expiresAt: Date
  qrCodeImage: string
}

export interface PdfResult {
  buffer: Buffer
  filename: string
}

export async function generatePdaLoginQrcodePdf({
  fullName,
  username,
  expiresAt,
  qrCodeImage,
}: PdaLoginQrcodePdfInput): Promise<PdfResult> {
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(PdaLoginQrcodePdf, {
      fullName,
      username,
      expiresAtText: formatDateTime(expiresAt),
      qrCodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${username}-pda-quick-login-qrcode.pdf`,
  }
}
