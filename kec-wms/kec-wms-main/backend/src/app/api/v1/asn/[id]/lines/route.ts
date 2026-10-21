import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { createAsnLineSchema } from '@/lib/validations/asn'
import { serializeAsnLine } from '@/lib/asn/response-serializer'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/asn/[id]/lines - 获取ASN明细列表
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 检查ASN是否存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: { id: true, clientId: true, status: true },
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    const lines = await prisma.asnLine.findMany({
      where: { asnId: id },
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
        putawayQty: true,
        uomId: true,
        uomCode: true,
        batchNumber: true,
        carton: true,
        expiryDate: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        sku: {
          select: {
            id: true,
            skuCode: true,
            skuName: true,
            barcode: true,
            imageUrl: true,
            isFirstReceiving: true,
            weightKg: true,
            lengthCm: true,
            widthCm: true,
            heightCm: true,
          },
        },
      },
      orderBy: {
        lineNumber: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: lines.map((line) => serializeAsnLine(line)),
    })
  } catch (error) {
    console.error('获取ASN明细列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取ASN明细列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/asn/[id]/lines - 添加ASN明细
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = createAsnLineSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查ASN是否存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: { id: true, clientId: true, status: true },
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查状态是否允许添加明细
    if (!['CREATED', 'PENDING_RECEIVING'].includes(existingAsn.status)) {
      return NextResponse.json(
        {
          success: false,
          message: '当前状态不允许添加明细',
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    // 验证SKU是否存在且属于该客户
    const sku = await prisma.sku.findFirst({
      where: {
        id: data.skuId,
        clientId: existingAsn.clientId,
      },
      select: { id: true, skuName: true, isBatchManaged: true },
    })

    if (!sku) {
      return NextResponse.json(
        {
          success: false,
          message: 'SKU不存在或不属于该客户',
          code: 'SKU_NOT_FOUND',
        },
        { status: 400 }
      )
    }

    // 校验批次管理SKU的批次号不能为空
    if (sku.isBatchManaged && !data.batchNumber) {
      return NextResponse.json(
        {
          success: false,
          message: '批次管理SKU的批次号不能为空',
          code: 'BATCH_NUMBER_REQUIRED',
          details: { skuCode: data.skuCode },
        },
        { status: 400 }
      )
    }

    // 获取当前最大行号
    const maxLineNumber = await prisma.asnLine.aggregate({
      where: { asnId: id },
      _max: { lineNumber: true },
    })

    const newLineNumber = (maxLineNumber._max.lineNumber || 0) + 1

    // 创建明细
    const line = await prisma.$transaction(async (tx) => {
      const newLine = await tx.asnLine.create({
        data: {
          tenantId: auth.user.tenantId,
          asnId: id,
          lineNumber: newLineNumber,
          skuId: data.skuId,
          skuCode: data.skuCode,
          skuName: data.skuName || sku.skuName,
          expectedQty: data.expectedQty,
          uomId: data.uomId || undefined,
          uomCode: data.uomCode || undefined,
          batchNumber: data.batchNumber || undefined,
          expiryDate: data.expiryDate || undefined,
          status: 'PENDING',
          notes: data.notes || undefined,
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
        select: {
          id: true,
          lineNumber: true,
          skuId: true,
          skuCode: true,
          skuName: true,
          expectedQty: true,
          receivedQty: true,
          putawayQty: true,
          uomCode: true,
          batchNumber: true,
          expiryDate: true,
          status: true,
          notes: true,
          createdAt: true,
        },
      })

      // 更新ASN汇总数据
      await tx.asn.update({
        where: { id },
        data: {
          totalExpectedQty: { increment: data.expectedQty },
          totalExpectedLines: { increment: 1 },
          updatedBy: auth.user.id,
        },
      })

      return newLine
    })

    return NextResponse.json({
      success: true,
      data: serializeAsnLine(line),
      message: 'ASN明细添加成功',
    })
  } catch (error) {
    console.error('添加ASN明细失败:', error)
    return NextResponse.json(
      { success: false, message: '添加ASN明细失败' },
      { status: 500 }
    )
  }
})
