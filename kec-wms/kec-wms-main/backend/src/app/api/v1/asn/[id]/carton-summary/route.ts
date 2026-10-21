import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id]/carton-summary - 获取ASN的箱汇总
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

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

    // 获取ASN明细并按箱号聚合
    const asnLines = await prisma.asnLine.findMany({
      where: {
        asnId: id,
        tenantId: auth.user.tenantId,
        carton: { not: null },
      },
    })

    // 按箱号聚合数据
    const cartonMap = new Map<string, {
      carton: string
      skuIds: Set<string>
      totalExpectedQty: number
      totalReceivedQty: number
      totalPutawayQty: number
    }>()

    for (const line of asnLines) {
      if (!line.carton) continue

      const existing = cartonMap.get(line.carton)

      if (existing) {
        existing.skuIds.add(line.skuId)
        existing.totalExpectedQty += line.expectedQty
        existing.totalReceivedQty += line.receivedQty
        existing.totalPutawayQty += line.putawayQty
      } else {
        cartonMap.set(line.carton, {
          carton: line.carton,
          skuIds: new Set([line.skuId]),
          totalExpectedQty: line.expectedQty,
          totalReceivedQty: line.receivedQty,
          totalPutawayQty: line.putawayQty,
        })
      }
    }

    // 转换为数组格式
    const summary = Array.from(cartonMap.values()).map(item => ({
      carton: item.carton,
      skuTypes: item.skuIds.size,
      totalExpectedQty: item.totalExpectedQty,
      totalReceivedQty: item.totalReceivedQty,
      varianceQty: item.totalReceivedQty - item.totalExpectedQty,
      totalPutawayQty: item.totalPutawayQty,
    }))

    // 按箱号排序
    summary.sort((a, b) => a.carton.localeCompare(b.carton))

    // 添加序号
    const summaryWithIndex = summary.map((item, index) => ({
      index: index + 1,
      ...item,
    }))

    return NextResponse.json({
      success: true,
      data: summaryWithIndex,
    })
  } catch (error) {
    console.error('获取箱汇总失败:', error)
    return NextResponse.json(
      { success: false, message: '获取箱汇总失败' },
      { status: 500 }
    )
  }
})
