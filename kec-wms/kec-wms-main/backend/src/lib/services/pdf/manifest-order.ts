import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { ManifestOrderPdf } from '@/lib/pdf/templates/manifest-order'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成出库总单PDF
 */
export async function generateManifestOrderPdf(
  tenantId: string,
  manifestOrderId: string
): Promise<PdfResult> {
  const manifestOrder = await prisma.manifestOrder.findFirst({
    where: {
      id: manifestOrderId,
      tenantId,
    },
    include: {
      warehouse: {
        select: { warehouseName: true },
      },
      client: {
        select: { clientName: true },
      },
      checkoutOrders: {
        select: {
          checkoutNumber: true,
          checkoutType: true,
          orderCount: true,
          parcelCount: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!manifestOrder) {
    throw new Error('Manifest order not found')
  }

  const pdfData = {
    manifestNumber: manifestOrder.manifestNumber,
    status: manifestOrder.status,
    warehouseName: manifestOrder.warehouse?.warehouseName || null,
    channelName: manifestOrder.channelName,
    clientName: manifestOrder.client?.clientName || null,
    orderCount: manifestOrder.orderCount,
    parcelCount: manifestOrder.parcelCount,
    containerCount: manifestOrder.containerCount,
    totalWeightKg: manifestOrder.totalWeightKg?.toString() || null,
    createdAt: manifestOrder.createdAt,
    completedAt: manifestOrder.completedAt,
    checkoutOrders: manifestOrder.checkoutOrders,
  }

  const buffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(React.createElement(ManifestOrderPdf, { data: pdfData }))

  return {
    buffer,
    filename: `manifest-${manifestOrder.manifestNumber}.pdf`,
  }
}
