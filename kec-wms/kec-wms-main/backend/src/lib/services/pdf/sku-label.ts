import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { SkuLabelPdf } from '@/lib/pdf/templates/sku-label'
import { generateBarcode } from '@/lib/pdf'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成 SKU 标签 PDF (60×40mm)
 */
export async function generateSkuLabelPdf(
  tenantId: string,
  skuId: string
): Promise<PdfResult> {
  const sku = await prisma.sku.findFirst({
    where: {
      id: skuId,
      tenantId,
    },
    include: {
      client: {
        select: {
          clientName: true,
        },
      },
    },
  })

  if (!sku) {
    throw new Error('SKU 不存在')
  }

  // 生成条码图片（优先使用 barcode，否则使用 skuCode）
  const barcodeText = sku.barcode || sku.skuCode
  const barcodeImage = await generateBarcode(barcodeText, {
    bcid: 'code128',
    scale: 2,
    height: 10,
    includetext: true,
  })

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(SkuLabelPdf, {
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      clientName: sku.client?.clientName,
      lengthCm: sku.lengthCm?.toNumber() || null,
      widthCm: sku.widthCm?.toNumber() || null,
      heightCm: sku.heightCm?.toNumber() || null,
      weightKg: sku.weightKg?.toNumber() || null,
      barcodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${sku.skuCode}-label.pdf`,
  }
}
