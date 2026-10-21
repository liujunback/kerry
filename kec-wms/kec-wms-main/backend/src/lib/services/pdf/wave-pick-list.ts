import { prisma } from '@/lib/db/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { WavePickListPdf } from '@/lib/pdf/templates/wave-pick-list'
import { generateBarcode } from '@/lib/pdf'
import React from 'react'

export interface PdfResult {
  buffer: Buffer
  filename: string
}

/**
 * 生成波次拣货清单PDF
 */
export async function generateWavePickListPdf(
  tenantId: string,
  waveId: string
): Promise<PdfResult> {
  const wave = await prisma.wave.findFirst({
    where: {
      id: waveId,
      tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseName: true,
        },
      },
      orders: {
        select: {
          orderNumber: true,
          lines: {
            select: {
              lineNumber: true,
              skuId: true,
              skuCode: true,
              skuName: true,
              orderedQty: true,
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
      },
      pickOrders: {
        include: {
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
              sku: {
                select: {
                  skuName: true,
                },
              },
            },
            orderBy: [
              { location: { locationCode: 'asc' } },
              { lineNumber: 'asc' },
            ],
          },
        },
      },
    },
  })

  if (!wave) {
    throw new Error('波次不存在')
  }

  // 构建拣货行数据
  type PickLine = {
    lineNumber: number
    locationCode: string
    skuCode: string
    skuName: string
    skuBarcode: string
    batchNumber: string
    expiryDate: string
    lpn: string
    expectedQty: number
  }

  let lines: PickLine[]

  const hasPickTasks = wave.pickOrders.length > 0 && wave.pickOrders.some(t => t.lines.length > 0)

  if (hasPickTasks) {
    // 从拣货任务获取数据，按库位+SKU+批次+LPN归类汇总
    const groupMap = new Map<string, {
      locationCode: string
      skuCode: string
      skuName: string
      batchNumber: string
      expiryDate: Date | null
      lpn: string
      expectedQty: number
    }>()

    for (const task of wave.pickOrders) {
      for (const line of task.lines) {
        const key = `${line.location?.locationCode || ''}_${line.skuCode}_${line.batchNumber || ''}_${line.lpn || ''}`
        const existing = groupMap.get(key)
        if (existing) {
          existing.expectedQty += line.expectedQty
        } else {
          groupMap.set(key, {
            locationCode: line.location?.locationCode || '',
            skuCode: line.skuCode,
            skuName: line.sku?.skuName || '',
            batchNumber: line.batchNumber || '',
            expiryDate: line.bucket?.expiryDate || null,
            lpn: line.lpn || '',
            expectedQty: line.expectedQty,
          })
        }
      }
    }

    // 转换为数组并按库位排序
    const grouped = Array.from(groupMap.values())
      .sort((a, b) => a.locationCode.localeCompare(b.locationCode) || a.skuCode.localeCompare(b.skuCode))

    // 为每个SKU生成条码
    const skuBarcodes = new Map<string, string>()
    for (const item of grouped) {
      if (!skuBarcodes.has(item.skuCode)) {
        skuBarcodes.set(item.skuCode, await generateBarcode(item.skuCode))
      }
    }

    lines = grouped.map((item, index) => ({
      lineNumber: index + 1,
      locationCode: item.locationCode,
      skuCode: item.skuCode,
      skuName: item.skuName,
      skuBarcode: skuBarcodes.get(item.skuCode) || '',
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate
        ? (item.expiryDate instanceof Date ? item.expiryDate.toISOString().split('T')[0] : String(item.expiryDate).split(' ')[0])
        : '',
      lpn: item.lpn,
      expectedQty: item.expectedQty,
    }))
  } else {
    // 从订单获取数据（波次未释放时），按SKU归类汇总
    const groupMap = new Map<string, {
      skuCode: string
      skuName: string
      expectedQty: number
    }>()

    for (const order of wave.orders) {
      for (const line of order.lines) {
        const key = line.skuCode
        const existing = groupMap.get(key)
        if (existing) {
          existing.expectedQty += line.orderedQty
        } else {
          groupMap.set(key, {
            skuCode: line.skuCode,
            skuName: line.skuName || '',
            expectedQty: line.orderedQty,
          })
        }
      }
    }

    // 转换为数组并按SKU排序
    const grouped = Array.from(groupMap.values())
      .sort((a, b) => a.skuCode.localeCompare(b.skuCode))

    // 为每个SKU生成条码
    const skuBarcodes = new Map<string, string>()
    for (const item of grouped) {
      if (!skuBarcodes.has(item.skuCode)) {
        skuBarcodes.set(item.skuCode, await generateBarcode(item.skuCode))
      }
    }

    lines = grouped.map((item, index) => ({
      lineNumber: index + 1,
      locationCode: '',
      skuCode: item.skuCode,
      skuName: item.skuName,
      skuBarcode: skuBarcodes.get(item.skuCode) || '',
      batchNumber: '',
      expiryDate: '',
      lpn: '',
      expectedQty: item.expectedQty,
    }))
  }

  // 生成条码图片
  const barcodeImage = await generateBarcode(wave.waveNumber)

  // 生成 PDF
  const pdfBuffer = await (renderToBuffer as (element: React.ReactElement) => Promise<Buffer>)(
    React.createElement(WavePickListPdf, {
      waveNumber: wave.waveNumber,
      warehouseName: wave.warehouse?.warehouseName || '',
      waveType: wave.waveType,
      pickStrategy: wave.pickStrategy,
      totalOrders: wave.totalOrders,
      totalLines: wave.totalLines,
      totalQty: wave.totalQty,
      createdAt: wave.createdAt instanceof Date ? wave.createdAt.toISOString() : new Date(wave.createdAt as string).toISOString(),
      lines,
      barcodeImage,
    })
  )

  return {
    buffer: pdfBuffer as Buffer,
    filename: `${wave.waveNumber}-pick-list.pdf`,
  }
}
