import { prisma } from '@/lib/db/prisma'
import { withExternalAuth } from '@/middleware/auth-middleware'
import { NextResponse } from 'next/server'

/**
 * GET /api/v1/asn/by-number/[externalNumber]/status
 * 通过外部单号获取ASN状态（外部API专用）
 *
 * 查询参数:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export const GET = withExternalAuth(
  async (request, authContext, params?: { externalNumber: string }) => {
    try {
      const { externalNumber } = params!
      const searchParams = request.nextUrl.searchParams
      const clientCode = searchParams.get('clientCode')

      // 确定客户ID
      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        // 通过clientCode查找客户
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

      // 查找ASN（通过externalNumber）
      const asn = await prisma.asn.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          externalNumber,
        },
        select: {
          asnNumber: true,
          externalNumber: true,
          status: true,
          totalExpectedQty: true,
          totalReceivedQty: true,
          totalPutawayQty: true,
          totalExpectedLines: true,
          totalReceivedLines: true,
          actualArrivalAt: true,
          receivingStartAt: true,
          receivingEndAt: true,
          putawayStartAt: true,
          putawayEndAt: true,
          completedAt: true,
          updatedAt: true,
        },
      })

      if (!asn) {
        return NextResponse.json(
          { success: false, message: 'ASN不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: asn,
      })
    } catch (error) {
      console.error('获取ASN状态失败:', error)
      return NextResponse.json(
        { success: false, message: '获取ASN状态失败' },
        { status: 500 }
      )
    }
  },
  'asn:read' // 需要的权限范围
)
