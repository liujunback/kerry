import { authenticate,hasApiScope } from '@/lib/auth/unified-auth';
import { prisma } from '@/lib/db/prisma';
import { externalUpdateAsnLineSchema } from '@/lib/validations/asn-external';
import { serializeAsnLine } from '@/lib/asn/response-serializer';
import { withUnifiedAuditContext } from '@/middleware/audit-context';
import { NextRequest,NextResponse } from 'next/server';

/**
 * PUT /api/v1/asn/by-number/[externalNumber]/lines/[lineNumber]
 * 更新ASN明细（外部API专用）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string; lineNumber: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.error || '未授权访问' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context!

  if (authContext.type !== 'apiKey') {
    return NextResponse.json(
      { success: false, message: '此接口仅供外部API调用' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'asn:write')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { externalNumber, lineNumber: lineNumberStr } = await params
      const lineNumber = parseInt(lineNumberStr, 10)
      if (isNaN(lineNumber)) {
        return NextResponse.json(
          { success: false, message: '行号格式错误' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const parseResult = externalUpdateAsnLineSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode, ...updateData } = parseResult.data

      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        const client = await prisma.client.findFirst({
          where: { tenantId: authContext.tenantId, clientCode },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在' },
            { status: 404 }
          )
        }
        clientId = client.id
      }

      return prisma.$transaction(async (tx) => {
        const asn = await tx.asn.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientId,
            externalNumber,
          },
        })

        if (!asn) {
          return NextResponse.json(
            { success: false, message: 'ASN不存在' },
            { status: 404 }
          )
        }

        if (!['CREATED', 'PENDING_RECEIVING'].includes(asn.status)) {
          return NextResponse.json(
            { success: false, message: `ASN状态为${asn.status}，不允许更新明细` },
            { status: 400 }
          )
        }

        const existingLine = await tx.asnLine.findFirst({
          where: {
            asnId: asn.id,
            lineNumber,
          },
        })

        if (!existingLine) {
          return NextResponse.json(
            { success: false, message: `行号 ${lineNumber} 不存在` },
            { status: 404 }
          )
        }

        const qtyDiff = (updateData.expectedQty ?? existingLine.expectedQty) - existingLine.expectedQty

        const updatedLine = await tx.asnLine.update({
          where: { id: existingLine.id },
          data: updateData,
          select: {
            lineNumber: true,
            skuCode: true,
            skuName: true,
            expectedQty: true,
            uomCode: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
          },
        })

        if (qtyDiff !== 0) {
          await tx.asn.update({
            where: { id: asn.id },
            data: {
              totalExpectedQty: { increment: qtyDiff },
              updatedAt: new Date(),
            },
          })
        }

        return NextResponse.json({
          success: true,
          message: 'ASN明细更新成功',
          data: serializeAsnLine(updatedLine),
        })
      })
    } catch (error) {
      console.error('更新ASN明细失败:', error)
      return NextResponse.json(
        { success: false, message: '更新ASN明细失败' },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/v1/asn/by-number/[externalNumber]/lines/[lineNumber]
 * 删除ASN明细（外部API专用）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string; lineNumber: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.error || '未授权访问' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context!

  if (authContext.type !== 'apiKey') {
    return NextResponse.json(
      { success: false, message: '此接口仅供外部API调用' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'asn:delete')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { externalNumber, lineNumber: lineNumberStr } = await params
      const lineNumber = parseInt(lineNumberStr, 10)
      if (isNaN(lineNumber)) {
        return NextResponse.json(
          { success: false, message: '行号格式错误' },
          { status: 400 }
        )
      }

      const searchParams = request.nextUrl.searchParams
      const clientCode = searchParams.get('clientCode')

      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        const client = await prisma.client.findFirst({
          where: { tenantId: authContext.tenantId, clientCode },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在' },
            { status: 404 }
          )
        }
        clientId = client.id
      }

      return prisma.$transaction(async (tx) => {
        const asn = await tx.asn.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientId,
            externalNumber,
          },
        })

        if (!asn) {
          return NextResponse.json(
            { success: false, message: 'ASN不存在' },
            { status: 404 }
          )
        }

        if (!['CREATED', 'PENDING_RECEIVING'].includes(asn.status)) {
          return NextResponse.json(
            { success: false, message: `ASN状态为${asn.status}，不允许删除明细` },
            { status: 400 }
          )
        }

        const existingLine = await tx.asnLine.findFirst({
          where: {
            asnId: asn.id,
            lineNumber,
          },
        })

        if (!existingLine) {
          return NextResponse.json(
            { success: false, message: `行号 ${lineNumber} 不存在` },
            { status: 404 }
          )
        }

        await tx.asnLine.delete({
          where: { id: existingLine.id },
        })

        await tx.asn.update({
          where: { id: asn.id },
          data: {
            totalExpectedQty: { decrement: existingLine.expectedQty },
            totalExpectedLines: { decrement: 1 },
            updatedAt: new Date(),
          },
        })

        return NextResponse.json({
          success: true,
          message: 'ASN明细删除成功',
        })
      })
    } catch (error) {
      console.error('删除ASN明细失败:', error)
      return NextResponse.json(
        { success: false, message: '删除ASN明细失败' },
        { status: 500 }
      )
    }
  })
}
