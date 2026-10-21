import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

const RECEIVABLE_STATUSES = ['PENDING_RECEIVING', 'RECEIVING']

const ASN_STATUS_LABELS: Record<string, string> = {
  CREATED: '已创建',
  PENDING_RECEIVING: '待收货',
  RECEIVING: '收货中',
  RECEIVED: '收货完成',
  PUTAWAY: '上架中',
  PUTTING_AWAY: '上架中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

export async function getAsnLookup(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const asnNumber = searchParams.get('asnNumber')
    const receivingMode = searchParams.get('receivingMode')

    if (!asnNumber) {
      return NextResponse.json(
        { success: false, message: 'ASN编号不能为空' },
        { status: 400 }
      )
    }

    const asn = await prisma.asn.findFirst({
      where: {
        tenantId: user.tenantId,
        asnNumber,
      },
      include: {
        client: {
          select: {
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        asnLines: {
          include: {
            sku: {
              select: {
                id: true,
                skuCode: true,
                skuName: true,
                barcode: true,
                isFirstReceiving: true,
                isBatchManaged: true,
                isSerialManaged: true,
                isExpiryManaged: true,
                lengthCm: true,
                widthCm: true,
                heightCm: true,
                weightKg: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!RECEIVABLE_STATUSES.includes(asn.status)) {
      const statusLabel = ASN_STATUS_LABELS[asn.status] || asn.status
      return NextResponse.json(
        {
          success: false,
          message: `该ASN当前状态为"${statusLabel}"，不允许收货`,
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    const effectiveReceivingMethod =
      asn.receiving_method === 'NORMAL' ? null : asn.receiving_method
    if (
      receivingMode &&
      effectiveReceivingMethod &&
      effectiveReceivingMethod !== receivingMode
    ) {
      const currentMethod =
        effectiveReceivingMethod === 'SKU' ? 'SKU收货' : '容器收货'
      const requestedMethod =
        receivingMode === 'SKU' ? 'SKU收货' : '容器收货'
      return NextResponse.json(
        {
          success: false,
          message: `该ASN已使用${currentMethod}方式，不可切换为${requestedMethod}方式`,
          code: 'RECEIVING_MODE_MISMATCH',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: asn,
    })
  } catch (error) {
    console.error('Lookup ASN error:', error)
    return NextResponse.json(
      { success: false, message: '查询失败' },
      { status: 500 }
    )
  }
}
