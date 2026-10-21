import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { prisma } from '@/lib/db/prisma'
import { externalCancelAsnSchema } from '@/lib/validations/asn-external'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { NextRequest,NextResponse } from 'next/server'

/**
 * POST /api/v1/asn/by-number/[externalNumber]/cancel
 * 通过外部单号取消ASN（外部API专用）
 *
 * 请求体:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 * - reason: 取消原因（必填）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string }> }
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
      const { externalNumber } = await params
      const body = await request.json()

      const parseResult = externalCancelAsnSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode, reason } = parseResult.data

      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        const client = await prisma.client.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientCode,
          },
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
        const existingAsn = await tx.asn.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientId,
            externalNumber,
          },
        })

        if (!existingAsn) {
          return NextResponse.json(
            { success: false, message: 'ASN不存在' },
            { status: 404 }
          )
        }

        const cancellableStatuses = ['CREATED', 'PENDING_RECEIVING']
        if (!cancellableStatuses.includes(existingAsn.status)) {
          return NextResponse.json(
            { success: false, message: `ASN状态为${existingAsn.status}，不允许取消` },
            { status: 400 }
          )
        }

        const cancelledAsn = await tx.asn.update({
          where: { id: existingAsn.id },
          data: {
            status: 'CANCELLED',
            notes: existingAsn.notes
              ? `${existingAsn.notes}\n[取消原因] ${reason}`
              : `[取消原因] ${reason}`,
            updatedAt: new Date(),
          },
          select: {
            asnNumber: true,
            externalNumber: true,
            status: true,
            updatedAt: true,
            client: {
              select: { clientCode: true, clientName: true },
            },
          },
        })

        await tx.asnLine.updateMany({
          where: { asnId: existingAsn.id },
          data: { status: 'CANCELLED' },
        })

        return NextResponse.json({
          success: true,
          message: 'ASN取消成功',
          data: cancelledAsn,
        })
      })
    } catch (error) {
      console.error('取消ASN失败:', error)
      return NextResponse.json(
        { success: false, message: '取消ASN失败' },
        { status: 500 }
      )
    }
  })
}
