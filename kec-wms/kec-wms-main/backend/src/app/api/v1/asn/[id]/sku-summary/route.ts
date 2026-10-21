import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/asn/[id]/sku-summary - 获取ASN的SKU汇总
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 验证ASN存在
    const asn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在' },
        { status: 404 }
      )
    }

    // 获取ASN明细并按SKU聚合
    const asnLines = await prisma.asnLine.findMany({
      where: {
        asnId: id,
        tenantId: auth.user.tenantId,
      },
      include: {
        sku: {
          select: {
            isFirstReceiving: true,
            weightKg: true,
            lengthCm: true,
            widthCm: true,
            heightCm: true,
          },
        },
      },
    })

    // 按SKU聚合数据
    const skuMap = new Map<string, {
      skuCode: string
      skuName: string | null
      isFirstReceiving: boolean
      weightKg: string | null
      dimensions: string | null
      batchNumbers: Set<string>
      cartons: Set<string>
      putawayCartons: Set<string>
      totalExpectedQty: number
      totalReceivedQty: number
      totalPutawayQty: number
    }>()

    for (const line of asnLines) {
      const existing = skuMap.get(line.skuCode)

      if (existing) {
        if (line.batchNumber) existing.batchNumbers.add(line.batchNumber)
        if (line.carton) existing.cartons.add(line.carton)
        if (line.carton && line.putawayQty > 0) existing.putawayCartons.add(line.carton)
        existing.totalExpectedQty += line.expectedQty
        existing.totalReceivedQty += line.receivedQty
        existing.totalPutawayQty += line.putawayQty
      } else {
        const dimensions = line.sku?.lengthCm && line.sku?.widthCm && line.sku?.heightCm
          ? `${line.sku.lengthCm}*${line.sku.widthCm}*${line.sku.heightCm}`
          : null

        skuMap.set(line.skuCode, {
          skuCode: line.skuCode,
          skuName: line.skuName,
          isFirstReceiving: line.sku?.isFirstReceiving ?? false,
          weightKg: line.sku?.weightKg ? String(line.sku.weightKg) : null, // Decimal 转换为字符串
          dimensions,
          batchNumbers: line.batchNumber ? new Set([line.batchNumber]) : new Set(),
          cartons: line.carton ? new Set([line.carton]) : new Set(),
          putawayCartons: line.carton && line.putawayQty > 0 ? new Set([line.carton]) : new Set(),
          totalExpectedQty: line.expectedQty,
          totalReceivedQty: line.receivedQty,
          totalPutawayQty: line.putawayQty,
        })
      }
    }

    // 转换为数组格式
    const summary = Array.from(skuMap.values()).map(item => ({
      skuCode: item.skuCode,
      skuName: item.skuName,
      isFirstReceiving: item.isFirstReceiving,
      weightKg: item.weightKg,
      dimensions: item.dimensions,
      batchNumbers: Array.from(item.batchNumbers).join(', ') || null,
      totalCartons: item.cartons.size,
      putawayCartons: item.putawayCartons.size,
      totalExpectedQty: item.totalExpectedQty,
      totalReceivedQty: item.totalReceivedQty,
      varianceQty: item.totalReceivedQty - item.totalExpectedQty,
      totalPutawayQty: item.totalPutawayQty,
    }))

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error('获取SKU汇总失败:', error)
    return NextResponse.json(
      { success: false, message: '获取SKU汇总失败' },
      { status: 500 }
    )
  }
})
