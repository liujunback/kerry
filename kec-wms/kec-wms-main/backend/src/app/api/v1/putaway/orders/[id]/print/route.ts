import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export const GET = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const tenantId = auth.user.tenantId

  const order = await prisma.putawayOrder.findFirst({
    where: {
      id,
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
          id: true,
          lineNumber: true,
          skuCode: true,
          skuName: true,
          quantity: true,
          batchNumber: true,
          lotNumber: true,
          expiryDate: true,
          sourceLocation: true,
          targetLocation: true,
          container: {
            select: {
              containerCode: true,
            },
          },
        },
        orderBy: {
          lineNumber: 'asc',
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ success: false, message: '上架单不存在' }, { status: 404 })
  }

  // 生成打印数据
  const printData = {
    // 文档类型
    documentType: 'PUTAWAY_ORDER',
    // 模板名称
    templateName: 'putaway_order_label',
    // 打印份数
    copies: 1,
    // 标签尺寸 (mm)
    labelSize: {
      width: 100,
      height: 150,
    },
    // 上架单信息
    orderNumber: order.putawayOrderNumber,
    asnNumber: order.asn.asnNumber,
    warehouseCode: order.warehouse.warehouseCode,
    warehouseName: order.warehouse.warehouseName,
    clientCode: order.client.clientCode,
    clientName: order.client.clientName,
    putawayMode: order.putawayMode,
    totalQty: order.totalQty,
    skuCount: order.skuCount,
    containerCount: order.containerCount,
    lineCount: order.lineCount,
    createdAt: order.createdAt.toISOString(),
    // 条码
    barcodeType: 'CODE128',
    barcodeContent: order.putawayOrderNumber,
    // 行明细
    lines: order.lines.map((line) => ({
      lineNumber: line.lineNumber,
      skuCode: line.skuCode,
      skuName: line.skuName,
      quantity: line.quantity,
      batchNumber: line.batchNumber,
      lotNumber: line.lotNumber,
      expiryDate: line.expiryDate?.toISOString().split('T')[0] || null,
      sourceLocation: line.sourceLocation,
      targetLocation: line.targetLocation,
      containerCode: line.container?.containerCode || null,
    })),
  }

  return NextResponse.json({
    success: true,
    data: printData,
  })
})
