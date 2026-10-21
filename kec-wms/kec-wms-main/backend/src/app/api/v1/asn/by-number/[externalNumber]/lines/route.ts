import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { prisma } from '@/lib/db/prisma'
import { LockAcquisitionError, getAsnLinesLockKey, withLock } from '@/lib/db/distributed-lock'
import { isUniqueConstraintError } from '@/lib/db/prisma-error-utils'
import { externalAddAsnLineSchema } from '@/lib/validations/asn-external'
import { serializeAsnLine } from '@/lib/asn/response-serializer'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { NextRequest,NextResponse } from 'next/server'

const ASN_LINES_WRITE_LOCK_OPTIONS = {
  prefix: 'asn-lines-write',
  ttlMs: 15000,
  retryCount: 40,
  retryDelayMs: 50,
} as const

/**
 * GET /api/v1/asn/by-number/[externalNumber]/lines
 * 获取ASN明细列表（外部API专用）
 *
 * 查询参数:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string }> }
) {
  try {
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

    if (!hasApiScope(authContext, 'asn:read')) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    const { externalNumber } = await params
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

    // 查找ASN（通过externalNumber）
    const asn = await prisma.asn.findFirst({
      where: {
        tenantId: authContext.tenantId,
        clientId,
        externalNumber,
      },
      select: {
        id: true,
        asnNumber: true,
        externalNumber: true,
        status: true,
        asnLines: {
          select: {
            lineNumber: true,
            skuCode: true,
            skuName: true,
            expectedQty: true,
            receivedQty: true,
            receivedGoodQty: true,
            receivedDamagedQty: true,
            putawayQty: true,
            uomCode: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
          },
          orderBy: { lineNumber: 'asc' },
        },
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
      data: {
        asnNumber: asn.asnNumber,
        externalNumber: asn.externalNumber,
        status: asn.status,
        lines: asn.asnLines.map((line) => serializeAsnLine(line)),
      },
    })
  } catch (error) {
    console.error('获取ASN明细失败:', error)
    return NextResponse.json(
      { success: false, message: '获取ASN明细失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/asn/by-number/[externalNumber]/lines
 * 添加ASN明细（外部API专用）
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

      const parseResult = externalAddAsnLineSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode, skuCode, ...lineData } = parseResult.data

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

      const asn = await prisma.asn.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          externalNumber,
        },
        select: {
          id: true,
        },
      })

      if (!asn) {
        return NextResponse.json(
          { success: false, message: 'ASN不存在' },
          { status: 404 }
        )
      }

      return withLock(
        getAsnLinesLockKey(asn.id),
        async () => prisma.$transaction(async (tx) => {
          const currentAsn = await tx.asn.findFirst({
            where: {
              id: asn.id,
              tenantId: authContext.tenantId,
              clientId,
              externalNumber,
            },
            select: {
              id: true,
              status: true,
            },
          })

          if (!currentAsn) {
            return NextResponse.json(
              { success: false, message: 'ASN不存在' },
              { status: 404 }
            )
          }

          if (!['CREATED', 'PENDING_RECEIVING'].includes(currentAsn.status)) {
            return NextResponse.json(
              { success: false, message: `ASN状态为${currentAsn.status}，不允许添加明细` },
              { status: 400 }
            )
          }

          const sku = await tx.sku.findFirst({
            where: {
              tenantId: authContext.tenantId,
              clientId,
              skuCode,
            },
            select: { id: true, skuCode: true, skuName: true, unit: true, isBatchManaged: true },
          })

          if (!sku) {
            return NextResponse.json(
              { success: false, message: `SKU编码 ${skuCode} 不存在` },
              { status: 404 }
            )
          }

          if (sku.isBatchManaged && !lineData.batchNumber) {
            return NextResponse.json(
              {
                success: false,
                message: '批次管理SKU的批次号不能为空',
                code: 'BATCH_NUMBER_REQUIRED',
                details: { skuCode },
              },
              { status: 400 }
            )
          }

          const maxLineNumber = await tx.asnLine.aggregate({
            where: { asnId: currentAsn.id },
            _max: { lineNumber: true },
          })
          const newLineNumber = (maxLineNumber._max.lineNumber || 0) + 1

          const newLine = await tx.asnLine.create({
            data: {
              tenantId: authContext.tenantId,
              asnId: currentAsn.id,
              lineNumber: newLineNumber,
              skuId: sku.id,
              skuCode: sku.skuCode,
              skuName: sku.skuName,
              expectedQty: lineData.expectedQty,
              receivedQty: 0,
              receivedGoodQty: 0,
              receivedDamagedQty: 0,
              putawayQty: 0,
              uomCode: lineData.uomCode ?? sku.unit,
              batchNumber: lineData.batchNumber,
              expiryDate: lineData.expiryDate,
              status: 'PENDING',
            },
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

          await tx.asn.update({
            where: { id: currentAsn.id },
            data: {
              totalExpectedQty: { increment: lineData.expectedQty },
              totalExpectedLines: { increment: 1 },
              updatedAt: new Date(),
            },
          })

          return NextResponse.json({
            success: true,
            message: 'ASN明细添加成功',
            data: serializeAsnLine(newLine),
          })
        }),
        ASN_LINES_WRITE_LOCK_OPTIONS
      )
    } catch (error) {
      if (error instanceof LockAcquisitionError) {
        return NextResponse.json(
          { success: false, message: 'ASN明细写入繁忙，请稍后重试', code: 'ASN_LINE_WRITE_BUSY' },
          { status: 409 }
        )
      }

      if (isUniqueConstraintError(error, ['asnId', 'lineNumber'])) {
        return NextResponse.json(
          { success: false, message: 'ASN明细行号冲突，请稍后重试', code: 'ASN_LINE_NUMBER_CONFLICT' },
          { status: 409 }
        )
      }

      console.error('添加ASN明细失败:', error)
      return NextResponse.json(
        { success: false, message: '添加ASN明细失败' },
        { status: 500 }
      )
    }
  })
}
