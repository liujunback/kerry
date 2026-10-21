import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { prisma } from '@/lib/db/prisma'
import { LockAcquisitionError, getAsnExternalNumberLockKey, withLock } from '@/lib/db/distributed-lock'
import { externalUpdateAsnSchema } from '@/lib/validations/asn-external'
import { serializeAsn } from '@/lib/asn/response-serializer'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { NextRequest,NextResponse } from 'next/server'

const ASN_EXTERNAL_WRITE_LOCK_OPTIONS = {
  prefix: 'asn-external-write',
  ttlMs: 15000,
  retryCount: 40,
  retryDelayMs: 50,
} as const

/**
 * GET /api/v1/asn/by-number/[externalNumber]
 * 通过外部单号获取ASN详情（外部API专用）
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

    // 此接口仅供外部API调用
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
        id: true,
        asnNumber: true,
        externalNumber: true,
        asnType: true,
        status: true,
        expectedArrivalDate: true,
        expectedArrivalTime: true,
        expectedPutawayDate: true,
        signedAt: true,
        actualArrivalAt: true,
        receivingStartAt: true,
        receivingEndAt: true,
        putawayStartAt: true,
        putawayEndAt: true,
        completedAt: true,
        totalExpectedQty: true,
        totalReceivedQty: true,
        totalPutawayQty: true,
        totalExpectedLines: true,
        totalReceivedLines: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: { clientCode: true, clientName: true },
        },
        warehouse: {
          select: { warehouseCode: true, warehouseName: true },
        },
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
      data: serializeAsn(asn),
    })
  } catch (error) {
    console.error('获取ASN失败:', error)
    return NextResponse.json(
      { success: false, message: '获取ASN失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/asn/by-number/[externalNumber]
 * 通过外部单号更新ASN（外部API专用）
 *
 * 请求体可包含:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function PUT(
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

  // 此接口仅供外部API调用
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

      // 验证请求数据
      const parseResult = externalUpdateAsnSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode, ...updateData } = parseResult.data

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

      const targetExternalNumber = updateData.externalNumber || externalNumber

      return withLock(
        getAsnExternalNumberLockKey(authContext.tenantId, clientId, targetExternalNumber),
        async () => prisma.$transaction(async (tx) => {
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

          if (!['CREATED', 'PENDING_RECEIVING'].includes(existingAsn.status)) {
            return NextResponse.json(
              { success: false, message: `ASN状态为${existingAsn.status}，不允许更新` },
              { status: 400 }
            )
          }

          if (updateData.externalNumber && updateData.externalNumber !== externalNumber) {
            const duplicateAsn = await tx.asn.findFirst({
              where: {
                tenantId: authContext.tenantId,
                clientId,
                externalNumber: updateData.externalNumber,
                status: { not: 'CANCELLED' },
                id: { not: existingAsn.id },
              },
              select: { id: true },
            })

            if (duplicateAsn) {
              return NextResponse.json(
                { success: false, message: '客户单号已存在', code: 'EXTERNAL_NUMBER_EXISTS' },
                { status: 400 }
              )
            }
          }

          const { config, ...restUpdateData } = updateData
          const updatedAsn = await tx.asn.update({
            where: { id: existingAsn.id },
            data: {
              ...restUpdateData,
              ...(config !== undefined && { config: config as object }),
              updatedAt: new Date(),
            },
            select: {
              id: true,
              asnNumber: true,
              externalNumber: true,
              asnType: true,
              status: true,
              expectedArrivalDate: true,
              expectedArrivalTime: true,
              expectedPutawayDate: true,
              notes: true,
              updatedAt: true,
              client: {
                select: { clientCode: true, clientName: true },
              },
              warehouse: {
                select: { warehouseCode: true, warehouseName: true },
              },
            },
          })

          return NextResponse.json({
            success: true,
            message: 'ASN更新成功',
            data: updatedAsn,
          })
        }),
        ASN_EXTERNAL_WRITE_LOCK_OPTIONS
      )
    } catch (error) {
      if (error instanceof LockAcquisitionError) {
        return NextResponse.json(
          { success: false, message: 'ASN写入繁忙，请稍后重试', code: 'ASN_WRITE_BUSY' },
          { status: 409 }
        )
      }

      console.error('更新ASN失败:', error)
      return NextResponse.json(
        { success: false, message: '更新ASN失败' },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/v1/asn/by-number/[externalNumber]
 * 通过外部单号删除ASN（外部API专用）
 *
 * 查询参数:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function DELETE(
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

  // 此接口仅供外部API调用
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

        if (existingAsn.status !== 'CREATED') {
          return NextResponse.json(
            { success: false, message: `ASN状态为${existingAsn.status}，只有CREATED状态的ASN可以删除` },
            { status: 400 }
          )
        }

        await tx.asn.delete({
          where: { id: existingAsn.id },
        })

        return NextResponse.json({
          success: true,
          message: 'ASN删除成功',
        })
      })
    } catch (error) {
      console.error('删除ASN失败:', error)
      return NextResponse.json(
        { success: false, message: '删除ASN失败' },
        { status: 500 }
      )
    }
  })
}
