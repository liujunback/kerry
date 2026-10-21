import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id]/receiving-records - 获取ASN的收货批次库存
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

    // 获取该ASN关联的上架明细（通过上架单关联）
    const putawayDetails = await prisma.putawayDetail.findMany({
      where: {
        putawayOrder: {
          asnId: id,
          tenantId: auth.user.tenantId,
        },
      },
      orderBy: { putawayAt: 'desc' },
    })

    // 转换为前端需要的格式
    const records = putawayDetails.map(detail => ({
      id: detail.id,
      skuCode: detail.skuCode,
      batchNumber: detail.batchNumber,
      locationCode: detail.locationCode,
      quantity: detail.quantity,
      udf: detail.qualityType,
      expiryDate: detail.expiryDate?.toISOString() || null,
      lotNumber: detail.lotNumber,
    }))

    return NextResponse.json({
      success: true,
      data: records,
    })
  } catch (error) {
    console.error('获取收货批次库存失败:', error)
    return NextResponse.json(
      { success: false, message: '获取收货批次库存失败' },
      { status: 500 }
    )
  }
})
