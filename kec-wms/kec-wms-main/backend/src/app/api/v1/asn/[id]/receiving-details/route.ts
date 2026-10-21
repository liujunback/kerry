import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/asn/[id]/receiving-details - 获取ASN的收货明细
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

    // 获取该ASN的收货记录
    const receivingRecords = await prisma.receivingRecord.findMany({
      where: {
        asnId: id,
        tenantId: auth.user.tenantId,
      },
      include: {
        container: {
          select: {
            containerCode: true,
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
    })

    // 获取收货人信息
    const receivedByIds = [...new Set(receivingRecords.map(r => r.receivedBy))]
    const users = await prisma.user.findMany({
      where: { id: { in: receivedByIds } },
      select: { id: true, username: true, fullName: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // 转换为前端需要的格式
    const records = receivingRecords.map(record => {
      const user = userMap.get(record.receivedBy)
      return {
        id: record.id,
        recordNumber: record.recordNumber,
        skuCode: record.skuCode,
        skuName: record.skuName,
        containerCode: record.container?.containerCode || null,
        expectedQty: record.expectedQty,
        receivedQty: record.receivedQty,
        goodQty: record.goodQty,
        damagedQty: record.damagedQty,
        batchNumber: record.batchNumber,
        lotNumber: record.lotNumber,
        expiryDate: record.expiryDate || null,
        productionDate: record.productionDate || null,
        receivingMode: record.receivingMode,
        deviceType: record.deviceType,
        receivedAt: record.receivedAt,
        receivedBy: user?.fullName || user?.username || '-',
      }
    })

    return NextResponse.json({
      success: true,
      data: records,
    })
  } catch (error) {
    console.error('获取收货明细失败:', error)
    return NextResponse.json(
      { success: false, message: '获取收货明细失败' },
      { status: 500 }
    )
  }
})
