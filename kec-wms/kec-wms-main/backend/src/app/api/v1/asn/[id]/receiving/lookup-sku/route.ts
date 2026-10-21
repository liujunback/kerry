import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { formatAsnDateOnly, serializeAsnLine } from '@/lib/asn/response-serializer'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id]/receiving/lookup-sku - 根据条码查找 ASN 中的 SKU
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id: asnId } = await context!.params
    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    if (!barcode) {
      return NextResponse.json(
        { success: false, message: '条码不能为空' },
        { status: 400 }
      )
    }

    // 验证 ASN 存在且属于当前租户
    const asn = await prisma.asn.findFirst({
      where: {
        id: asnId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查 ASN 是否已签收
    if (!asn.signedAt) {
      return NextResponse.json(
        { success: false, message: 'ASN尚未签收，请先签收后再进行收货', code: 'ASN_NOT_SIGNED' },
        { status: 400 }
      )
    }

    // 先从 ASN 行项目中查找匹配条码的记录
    const asnLines = await prisma.asnLine.findMany({
      where: {
        asnId: asnId,
        OR: [
          { skuCode: barcode },
          { sku: { barcode: barcode } },
        ],
      },
      select: {
        id: true,
        lineNumber: true,
        skuId: true,
        skuCode: true,
        skuName: true,
        expectedQty: true,
        receivedQty: true,
        receivedGoodQty: true,
        receivedDamagedQty: true,
        status: true,
        batchNumber: true,
        expiryDate: true,
      },
      orderBy: {
        lineNumber: 'asc',
      },
    })

    if (asnLines.length === 0) {
      return NextResponse.json(
        { success: false, message: 'SKU不在该ASN中', code: 'SKU_NOT_IN_ASN' },
        { status: 404 }
      )
    }

    // 获取 SKU 详细信息
    const sku = await prisma.sku.findUnique({
      where: {
        id: asnLines[0].skuId,
      },
      select: {
        id: true,
        skuCode: true,
        skuName: true,
        barcode: true,
        isFirstReceiving: true,
        isSelfPackaged: true,
        isBatchManaged: true,
        isSerialManaged: true,
        isExpiryManaged: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        weightKg: true,
      },
    })

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU不存在', code: 'SKU_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 筛选出还有剩余数量可收货的行项目
    const availableLines = asnLines.filter(line => line.receivedQty < line.expectedQty)

    // 如果没有可收货的行，返回第一行（用于显示已完成状态）
    const asnLine = availableLines.length > 0 ? availableLines[0] : asnLines[0]

    return NextResponse.json({
      success: true,
      data: {
        asnLine: serializeAsnLine(asnLine),
        sku,
        // 返回所有可用的批次行，供前端选择
        availableBatchLines: availableLines.map(line => ({
          id: line.id,
          lineNumber: line.lineNumber,
          batchNumber: line.batchNumber,
          expiryDate: formatAsnDateOnly(line.expiryDate),
          expectedQty: line.expectedQty,
          receivedQty: line.receivedQty,
          remainingQty: line.expectedQty - line.receivedQty,
        })),
      },
    })
  } catch (error) {
    console.error('Lookup SKU error:', error)
    return NextResponse.json(
      { success: false, message: '查询失败' },
      { status: 500 }
    )
  }
})
