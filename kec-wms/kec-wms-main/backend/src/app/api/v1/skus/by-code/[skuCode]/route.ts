import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticate, hasApiScope } from '@/lib/auth/unified-auth'
import { updateSkuSchema } from '@/lib/validations/sku'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { isUniqueConstraintError } from '@/lib/db/prisma-error-utils'

/**
 * GET /api/v1/skus/by-code/[skuCode]
 * 通过SKU编码获取SKU详情（外部API专用）
 *
 * 查询参数:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ skuCode: string }> }
) {
  try {
    const authResult = await authenticate(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: 401 }
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

    if (!hasApiScope(authContext, 'sku:read')) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    const { skuCode } = await params
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

    // 查找SKU
    const sku = await prisma.sku.findFirst({
      where: {
        tenantId: authContext.tenantId,
        clientId,
        skuCode,
      },
      select: {
        skuCode: true,
        skuName: true,
        barcode: true,
        unit: true,
        storageCondition: true,
        abcClass: true,
        isBatchManaged: true,
        isSerialManaged: true,
        isExpiryManaged: true,
        status: true,
        client: {
          select: { clientCode: true, clientName: true },
        },
      },
    })

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sku,
    })
  } catch (error) {
    console.error('获取SKU失败:', error)
    return NextResponse.json(
      { success: false, message: '获取SKU失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/skus/by-code/[skuCode]
 * 通过SKU编码更新SKU（外部API专用）
 *
 * 请求体必须包含:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ skuCode: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: 401 }
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

  if (!hasApiScope(authContext, 'sku:write')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { skuCode } = await params
      const body = await request.json()
      const { clientCode, ...updateData } = body

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

      // 查找SKU
      const existingSku = await prisma.sku.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          skuCode,
        },
      })

      if (!existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU不存在' },
          { status: 404 }
        )
      }

      const validationResult = updateSkuSchema.safeParse(updateData)
      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: validationResult.error.errors },
          { status: 400 }
        )
      }

      const validatedData = validationResult.data
      const { config, categoryId, ...restValidatedData } = validatedData

      // 更新SKU
      const updatedSku = await prisma.sku.update({
        where: { id: existingSku.id },
        data: {
          ...restValidatedData,
          ...(config !== undefined && { config: config as object }),
          ...(categoryId !== undefined && { categoryId }),
          updatedAt: new Date(),
        },
        select: {
          skuCode: true,
          skuName: true,
          barcode: true,
          unit: true,
          storageCondition: true,
          abcClass: true,
          isBatchManaged: true,
          isSerialManaged: true,
          isExpiryManaged: true,
          status: true,
          updatedAt: true,
          client: {
            select: { clientCode: true, clientName: true },
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedSku,
        message: 'SKU更新成功',
      })
    } catch (error) {
      if (isUniqueConstraintError(error, ['clientId', 'skuCode'])) {
        return NextResponse.json(
          { success: false, message: 'SKU编码已存在', code: 'SKU_CODE_EXISTS' },
          { status: 400 }
        )
      }

      console.error('更新SKU失败:', error)
      return NextResponse.json(
        { success: false, message: '更新SKU失败' },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/v1/skus/by-code/[skuCode]
 * 通过SKU编码删除SKU（外部API专用）
 *
 * 查询参数:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ skuCode: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: 401 }
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

  if (!hasApiScope(authContext, 'sku:delete')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { skuCode } = await params
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

      // 查找SKU
      const existingSku = await prisma.sku.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          skuCode,
        },
        include: {
          _count: {
            select: {
              inventoryBuckets: true,
              asnLines: true,
              outboundOrderLines: true,
            },
          },
        },
      })

      if (!existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU不存在' },
          { status: 404 }
        )
      }

      // 检查是否有关联数据
      if (existingSku._count.inventoryBuckets > 0) {
        return NextResponse.json(
          { success: false, message: 'SKU存在库存记录，无法删除' },
          { status: 400 }
        )
      }

      if (existingSku._count.asnLines > 0) {
        return NextResponse.json(
          { success: false, message: 'SKU存在ASN记录，无法删除' },
          { status: 400 }
        )
      }

      if (existingSku._count.outboundOrderLines > 0) {
        return NextResponse.json(
          { success: false, message: 'SKU存在出库订单记录，无法删除' },
          { status: 400 }
        )
      }

      // 删除SKU
      await prisma.sku.delete({
        where: { id: existingSku.id },
      })

      return NextResponse.json({
        success: true,
        message: 'SKU删除成功',
      })
    } catch (error) {
      console.error('删除SKU失败:', error)
      return NextResponse.json(
        { success: false, message: '删除SKU失败' },
        { status: 500 }
      )
    }
  })
}
