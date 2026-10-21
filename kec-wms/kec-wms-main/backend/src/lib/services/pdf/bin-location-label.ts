import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { BinLocationLabelPdf } from '@/lib/pdf/templates/bin-location-label'
import { generateBarcode } from '@/lib/pdf'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

// 货位类型标签映射
const locationTypeLabels: Record<string, string> = {
  STORAGE: '存储',
  PICKING: '拣货',
  RECEIVING: '收货',
  SHIPPING: '发货',
  STAGING: '暂存',
  QUALITY: '质检',
  RETURN: '退货',
  DAMAGE: '残损',
}

/**
 * 生成货位标签PDF (60×40mm)
 */
export async function generateBinLocationLabelPdf(
  tenantId: string,
  binLocationId: string
): Promise<PdfResult> {
  const binLocation = await prisma.binLocation.findFirst({
    where: {
      id: binLocationId,
      tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseName: true,
        },
      },
      zone: {
        select: {
          zoneName: true,
        },
      },
    },
  })

  if (!binLocation) {
    throw new Error('货位不存在')
  }

  // 生成条码图片
  const barcodeImage = await generateBarcode(binLocation.locationCode, {
    bcid: 'code128',
    scale: 2,
    height: 10,
    includetext: true,
  })

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(BinLocationLabelPdf, {
      locationCode: binLocation.locationCode,
      locationType: binLocation.locationType,
      locationTypeLabel: binLocation.locationType
        ? locationTypeLabels[binLocation.locationType] || binLocation.locationType
        : '',
      warehouseName: binLocation.warehouse?.warehouseName || '',
      zoneName: binLocation.zone?.zoneName || null,
      barcodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${binLocation.locationCode}-label.pdf`,
  }
}
