import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { PickOrderPdf } from '@/lib/pdf/templates/pick-order'
import { generateBarcode } from '@/lib/pdf'
import { PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成拣货单PDF，并将状态从待拣货变更为拣货中
 */
export async function generatePickOrderPdf(
  tenantId: string,
  taskId: string,
  userId?: string
): Promise<PdfResult> {
  const task = await prisma.pickOrder.findFirst({
    where: {
      id: taskId,
      tenantId,
    },
    include: {
      warehouse: {
        select: {
          id: true,
          warehouseName: true,
        },
      },
      wave: {
        select: {
          waveNumber: true,
        },
      },
      lines: {
        include: {
          location: {
            select: {
              locationCode: true,
            },
          },
          bucket: {
            select: {
              expiryDate: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
          sku: {
            select: {
              skuName: true,
              barcode: true,
            },
          },
        },
        orderBy: [
          { location: { locationCode: 'asc' } },
          { skuCode: 'asc' },
          { batchNumber: 'asc' },
        ],
      },
    },
  })

  if (!task) {
    throw new Error('拣货单不存在')
  }

  // 如果状态是待拣货，变更为拣货中
  if (task.status === 'PENDING') {
    await prisma.$transaction(async (tx) => {
      await tx.pickOrder.update({
        where: { id: taskId },
        data: {
          status: 'IN_PROGRESS',
          pickMethod: 'PAPER',
          startedAt: new Date(),
          updatedBy: userId || null,
        },
      })

      // 创建操作日志
      await tx.operationLog.create({
        data: {
          tenantId,
          entityType: 'PICK_TASK',
          entityId: taskId,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.START_PICK.type,
          operationName: PICK_TASK_OPERATION_TYPES.START_PICK.name,
          beforeStatus: 'PENDING',
          afterStatus: 'IN_PROGRESS',
          remark: '打印拣货单，开始拣货',
          operatorId: userId || null,
        },
      })
    })
  } else {
    // 重复打印也记录操作日志
    await prisma.operationLog.create({
      data: {
        tenantId,
        entityType: 'PICK_TASK',
        entityId: taskId,
        entityNumber: task.taskNumber,
        operationType: PICK_TASK_OPERATION_TYPES.PRINT.type,
        operationName: PICK_TASK_OPERATION_TYPES.PRINT.name,
        beforeStatus: task.status,
        afterStatus: task.status,
        remark: '打印拣货单',
        operatorId: userId || null,
      },
    })
  }

  // 按库位、SKU、批次、效期合并汇总
  const groupMap = new Map<string, {
    locationCode: string
    skuCode: string
    skuName: string
    barcode: string
    batchNumber: string
    expiryDate: Date | null
    expectedQty: number
  }>()

  for (const line of task.lines) {
    const expiryDateStr = line.bucket?.expiryDate
      ? (line.bucket.expiryDate instanceof Date
          ? line.bucket.expiryDate.toISOString().split('T')[0]
          : String(line.bucket.expiryDate).split(' ')[0])
      : ''
    const key = `${line.location?.locationCode || ''}_${line.skuCode}_${line.batchNumber || ''}_${expiryDateStr}`

    const existing = groupMap.get(key)
    if (existing) {
      existing.expectedQty += line.expectedQty
    } else {
      groupMap.set(key, {
        locationCode: line.location?.locationCode || '',
        skuCode: line.skuCode,
        skuName: line.sku?.skuName || '',
        barcode: line.sku?.barcode || '',
        batchNumber: line.batchNumber || '',
        expiryDate: line.bucket?.expiryDate || null,
        expectedQty: line.expectedQty,
      })
    }
  }

  // 转换为数组并按库位、SKU排序
  const grouped = Array.from(groupMap.values())
    .sort((a, b) =>
      a.locationCode.localeCompare(b.locationCode) ||
      a.skuCode.localeCompare(b.skuCode) ||
      (a.batchNumber || '').localeCompare(b.batchNumber || '')
    )

  // 计算统计数据
  const totalQty = grouped.reduce((sum, item) => sum + item.expectedQty, 0)
  const totalSkus = new Set(grouped.map(item => item.skuCode)).size
  const totalLocations = new Set(grouped.map(item => item.locationCode).filter(Boolean)).size

  // 构建拣货行数据
  const lines = grouped.map((item, index) => ({
    lineNumber: index + 1,
    locationCode: item.locationCode,
    skuCode: item.skuCode,
    skuName: item.skuName,
    barcode: item.barcode,
    batchNumber: item.batchNumber,
    expiryDate: item.expiryDate
      ? (item.expiryDate instanceof Date
          ? item.expiryDate.toISOString().split('T')[0]
          : String(item.expiryDate).split(' ')[0])
      : '',
    expectedQty: item.expectedQty,
  }))

  // 生成条码图片
  const barcodeImage = await generateBarcode(task.taskNumber)

  const matchedTemplate = await prisma.printTemplate.findFirst({
    where: {
      tenantId,
      scenarioType: 'PICK_ORDER',
      warehouseId: task.warehouse?.id ?? null,
      isDefault: true,
      isActive: true,
    },
    select: { labelSpecCode: true },
  }) ?? await prisma.printTemplate.findFirst({
    where: {
      tenantId,
      scenarioType: 'PICK_ORDER',
      warehouseId: null,
      isDefault: true,
      isActive: true,
    },
    select: { labelSpecCode: true },
  })

  const layout = matchedTemplate?.labelSpecCode === 'LABEL_100X150' ? 'LABEL_100X150' : 'A4_DOCUMENT'

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(PickOrderPdf, {
      layout,
      taskNumber: task.taskNumber,
      taskType: task.taskType,
      pickMode: task.pickMode || '',
      warehouseName: task.warehouse?.warehouseName || '',
      waveNumber: task.wave?.waveNumber || '',
      totalQty,
      totalSkus,
      totalLocations,
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : new Date(task.createdAt as string).toISOString(),
      lines,
      barcodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${task.taskNumber}-pick-order.pdf`,
  }
}
