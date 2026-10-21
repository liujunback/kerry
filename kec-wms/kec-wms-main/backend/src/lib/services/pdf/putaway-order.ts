import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { PutawayOrderPdf } from '@/lib/pdf/templates/putaway-order'
import { generateBarcode } from '@/lib/pdf'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成上架单PDF
 */
export async function generatePutawayOrderPdf(
  tenantId: string,
  orderId: string
): Promise<PdfResult> {
  // 查询上架单数据
  const order = await prisma.putawayOrder.findFirst({
    where: {
      id: orderId,
      tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
      client: {
        select: {
          clientCode: true,
          clientName: true,
        },
      },
      asn: {
        select: {
          asnNumber: true,
        },
      },
      lines: {
        select: {
          skuCode: true,
          skuName: true,
          quantity: true,
          targetLocation: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  if (!order) {
    // 添加更详细的错误信息用于调试
    console.error('上架单查询失败:', { orderId, tenantId })

    // 检查是否存在该ID的上架单（不考虑租户）
    const orderExists = await prisma.putawayOrder.findUnique({
      where: { id: orderId },
      select: { id: true, tenantId: true, putawayOrderNumber: true },
    })

    if (orderExists) {
      console.error('上架单存在但租户不匹配:', orderExists)
      throw new Error(`上架单不存在或无权访问 (ID: ${orderId})`)
    }

    throw new Error(`上架单不存在 (ID: ${orderId})`)
  }

  // 生成条码图片
  const barcodeImage = await generateBarcode(order.putawayOrderNumber)

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(PutawayOrderPdf, {
      orderNumber: order.putawayOrderNumber,
      asnNumber: order.asn.asnNumber,
      warehouseName: order.warehouse.warehouseName,
      clientName: order.client.clientName,
      totalQty: order.totalQty,
      skuCount: order.skuCount,
      tasks: order.lines,
      barcodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${order.putawayOrderNumber}.pdf`,
  }
}
