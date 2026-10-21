import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { ContainerLabelPdf } from '@/lib/pdf/templates/container-label'
import { generateBarcode } from '@/lib/pdf'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成容器标签PDF (60×40mm)
 */
export async function generateContainerLabelPdf(
  tenantId: string,
  containerId: string
): Promise<PdfResult> {
  const container = await prisma.container.findFirst({
    where: {
      id: containerId,
      tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseName: true,
        },
      },
    },
  })

  if (!container) {
    throw new Error('容器不存在')
  }

  // 容器类型标签映射
  const containerTypeLabels: Record<string, string> = {
    LARGE_BOX: '大箱',
    SMALL_BOX: '小箱',
    PALLET: '托盘',
    CAGE: '笼车',
    TOTE: '周转箱',
    OTHER: '其他',
  }

  // 生成条码图片
  const barcodeImage = await generateBarcode(container.containerCode, {
    bcid: 'code128',
    scale: 2,
    height: 10,
    includetext: true,
  })

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(ContainerLabelPdf, {
      containerCode: container.containerCode,
      containerType: container.containerType,
      containerTypeLabel: containerTypeLabels[container.containerType] || container.containerType,
      warehouseName: container.warehouse?.warehouseName || '',
      weightCapacityKg: container.weightCapacityKg?.toNumber() || null,
      barcodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${container.containerCode}-label.pdf`,
  }
}
