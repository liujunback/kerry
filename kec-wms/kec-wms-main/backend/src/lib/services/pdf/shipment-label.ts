import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { ShipmentLabelPdf } from '@/lib/pdf/templates/shipment-label'
import { generateBarcode } from '@/lib/pdf'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成发货标签PDF (10×15cm)
 */
export async function generateShipmentLabelPdf(
  tenantId: string,
  shipmentId: string
): Promise<PdfResult> {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseName: true,
        },
      },
      order: {
        select: {
          orderNumber: true,
          referenceNumber: true,
          outbound_order_address: true,
        },
      },
    },
  })

  if (!shipment) {
    throw new Error('发货单不存在')
  }

  const address = shipment.order?.outbound_order_address

  // 生成条码图片
  const barcodeImage = await generateBarcode(shipment.shipmentNumber, {
    bcid: 'code128',
    scale: 3,
    height: 12,
    includetext: true,
  })

  // 构建收货地址
  const recipientAddress = [
    address?.shippingProvince,
    address?.shippingCity,
    address?.shippingLine1,
    address?.shippingLine2,
  ].filter(Boolean).join('')

  // 转换重量为数字
  const weight = shipment.totalWeightKg
    ? (typeof shipment.totalWeightKg === 'object' && 'toNumber' in shipment.totalWeightKg
        ? shipment.totalWeightKg.toNumber()
        : Number(shipment.totalWeightKg))
    : 0

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(ShipmentLabelPdf, {
      shipmentNumber: shipment.shipmentNumber,
      orderNumber: shipment.order?.orderNumber || '',
      referenceNumber: shipment.order?.referenceNumber,
      recipientName: address?.shippingName || '',
      recipientPhone: address?.shippingPhone || '',
      recipientAddress,
      recipientPostalCode: address?.shippingPostalCode || undefined,
      warehouseName: shipment.warehouse?.warehouseName || '',
      weight,
      packageCount: shipment.packageCount || 1,
      barcodeImage,
      printTime: new Date().toISOString(),
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${shipment.shipmentNumber}-label.pdf`,
  }
}
