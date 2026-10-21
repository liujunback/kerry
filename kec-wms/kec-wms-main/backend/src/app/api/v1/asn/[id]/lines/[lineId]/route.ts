import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateAsnLineSchema } from '@/lib/validations/asn'
import { serializeAsnLine } from '@/lib/asn/response-serializer'
import { NextResponse } from 'next/server'

// PUT /api/v1/asn/[id]/lines/[lineId] - 更新ASN明细
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id, lineId } = await context!.params
    const body = await request.json()
    const validationResult = updateAsnLineSchema.safeParse(body)

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
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查状态是否允许修改明细
    if (!['CREATED', 'PENDING_RECEIVING'].includes(existingAsn.status)) {
      return NextResponse.json(
        {
          success: false,
          message: '当前状态不允许修改明细',
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    // 检查明细是否存在
    const existingLine = await prisma.asnLine.findFirst({
      where: {
        id: lineId,
        asnId: id,
      },
    })

    if (!existingLine) {
      return NextResponse.json(
        { success: false, message: 'ASN明细不存在', code: 'ASN_LINE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 更新明细
    const line = await prisma.$transaction(async (tx) => {
      const updatedLine = await tx.asnLine.update({
        where: { id: lineId },
        data: {
          ...data,
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
          updatedAt: true,
        },
      })

      // 如果修改了预期数量，更新ASN汇总
      if (data.expectedQty !== undefined && data.expectedQty !== existingLine.expectedQty) {
        const qtyDiff = data.expectedQty - existingLine.expectedQty
        await tx.asn.update({
          where: { id },
          data: {
            totalExpectedQty: { increment: qtyDiff },
            updatedBy: auth.user.id,
          },
        })
      }

      return updatedLine
    })

    return NextResponse.json({
      success: true,
      data: serializeAsnLine(line),
      message: 'ASN明细更新成功',
    })
  } catch (error) {
    console.error('更新ASN明细失败:', error)
    return NextResponse.json(
      { success: false, message: '更新ASN明细失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/asn/[id]/lines/[lineId] - 删除ASN明细
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id, lineId } = await context!.params

    // 检查ASN是否存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查状态是否允许删除明细
    if (!['CREATED', 'PENDING_RECEIVING'].includes(existingAsn.status)) {
      return NextResponse.json(
        {
          success: false,
          message: '当前状态不允许删除明细',
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    // 检查明细是否存在
    const existingLine = await prisma.asnLine.findFirst({
      where: {
        id: lineId,
        asnId: id,
      },
    })

    if (!existingLine) {
      return NextResponse.json(
        { success: false, message: 'ASN明细不存在', code: 'ASN_LINE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 删除明细并更新ASN汇总
    await prisma.$transaction(async (tx) => {
      await tx.asnLine.delete({
        where: { id: lineId },
      })

      await tx.asn.update({
        where: { id },
        data: {
          totalExpectedQty: { decrement: existingLine.expectedQty },
          totalExpectedLines: { decrement: 1 },
          updatedBy: auth.user.id,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'ASN明细删除成功',
    })
  } catch (error) {
    console.error('删除ASN明细失败:', error)
    return NextResponse.json(
      { success: false, message: '删除ASN明细失败' },
      { status: 500 }
    )
  }
})
