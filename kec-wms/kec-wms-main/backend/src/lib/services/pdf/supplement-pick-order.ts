import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db/prisma'
import { generateBarcode } from '@/lib/pdf'
import { SupplementPickOrderPdf } from '@/lib/pdf/templates/supplement-pick-order'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

export async function generateSupplementPickOrderPdf(
  tenantId: string,
  supplementPickOrderId: string
): Promise<PdfResult> {
  const order = await prisma.supplementPickOrder.findFirst({
    where: {
      id: supplementPickOrderId,
      tenantId,
    },
  })

  if (!order) {
    throw new Error('补拣单不存在')
  }

  const [warehouse, lines] = await Promise.all([
    prisma.warehouse.findUnique({
      where: { id: order.warehouseId },
      select: { warehouseName: true },
    }),
    prisma.supplementPickOrderLine.findMany({
      where: {
        tenantId,
        supplementPickOrderId: order.id,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const barcodeImage = await generateBarcode(order.supplementPickNo)
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(SupplementPickOrderPdf, {
      supplementPickNo: order.supplementPickNo,
      orderNumber: order.orderNumber,
      warehouseName: warehouse?.warehouseName || '',
      allocationMethod: order.allocationMethod,
      totalSupplementQty: order.totalSupplementQty,
      createdAt: order.createdAt,
      barcodeImage,
      lines: lines.map((line) => ({
        skuCode: line.skuCode,
        sourceLocationCode: line.sourceLocationCode,
        batchNumber: line.batchNumber || '',
        supplementQty: line.supplementQty,
      })),
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${order.supplementPickNo}-supplement-pick-order.pdf`,
  }
}
