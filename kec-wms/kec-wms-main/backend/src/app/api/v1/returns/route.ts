import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { auth } from '@/lib/auth/config'
import { authenticate, hasApiScope } from '@/lib/auth/unified-auth'
import { prisma } from '@/lib/db/prisma'
import { buildReturnAuth, fail, ok, readJson } from '@/lib/returns/api-utils'
import { createReturnOrder, listReturnOrders } from '@/lib/returns/return-service'
import { externalCreateReturnOrderSchema, returnListQuerySchema } from '@/lib/validations/returns'
import { withUnifiedAuditContext } from '@/middleware/audit-context'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const parseResult = returnListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      returnType: searchParams.get('returnType'),
      clientId: searchParams.get('clientId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })
    if (!parseResult.success) {
      return fail(new Error('参数错误'), 400)
    }

    const data = await listReturnOrders(buildReturnAuth(auth.user), parseResult.data)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
})

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')
  if (!apiKey) {
    const session = await auth()
    return NextResponse.json(
      {
        success: false,
        message: session?.user?.tenantId ? '退件预报只能通过外部 API 下发' : '未授权访问',
      },
      { status: session?.user?.tenantId ? 403 : 401 }
    )
  }

  const authResult = await authenticate(request)
  if (!authResult.success || !authResult.context) {
    return NextResponse.json(
      { success: false, message: authResult.error || '未授权访问' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context
  if (authContext.type !== 'apiKey') {
    return NextResponse.json(
      { success: false, message: '退件预报只能通过外部 API 下发' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'return:create')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const body = await readJson(request)
      const parseResult = externalCreateReturnOrderSchema.safeParse(body)
      if (!parseResult.success) {
        console.warn('外部创建预报退件单参数错误:', parseResult.error.errors)
        return NextResponse.json(
          { success: false, message: parseResult.error.errors[0]?.message || '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const input = parseResult.data
      let clientId = authContext.clientId
      if (clientId) {
        const boundClient = await prisma.client.findFirst({
          where: { id: clientId, tenantId: authContext.tenantId, isActive: true },
          select: { clientCode: true },
        })
        if (!boundClient) {
          return NextResponse.json(
            { success: false, message: 'API Key绑定客户不存在或未启用', code: 'BOUND_CLIENT_NOT_FOUND' },
            { status: 400 }
          )
        }
        if (boundClient.clientCode !== input.clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码与API Key绑定客户不一致', code: 'CLIENT_SCOPE_MISMATCH' },
            { status: 400 }
          )
        }
      } else {
        const client = await prisma.client.findFirst({
          where: { tenantId: authContext.tenantId, clientCode: input.clientCode, isActive: true },
          select: { id: true },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在或未启用', code: 'CLIENT_NOT_FOUND' },
            { status: 400 }
          )
        }
        clientId = client.id
      }

      let warehouseId = authContext.warehouseId
      if (warehouseId) {
        const boundWarehouse = await prisma.warehouse.findFirst({
          where: { id: warehouseId, tenantId: authContext.tenantId, warehouseCode: input.warehouseCode },
          select: { id: true },
        })
        if (!boundWarehouse) {
          return NextResponse.json(
            { success: false, message: '仓库编码与API Key绑定仓库不一致', code: 'WAREHOUSE_SCOPE_MISMATCH' },
            { status: 400 }
          )
        }
      } else {
        const warehouse = await prisma.warehouse.findFirst({
          where: { tenantId: authContext.tenantId, warehouseCode: input.warehouseCode },
          select: { id: true },
        })
        if (!warehouse) {
          return NextResponse.json(
            { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
            { status: 400 }
          )
        }
        warehouseId = warehouse.id
      }

      if (!clientId || !warehouseId) {
        return NextResponse.json(
          { success: false, message: '客户或仓库解析失败', code: 'SCOPE_RESOLVE_FAILED' },
          { status: 400 }
        )
      }

      const skuCodes = [...new Set(input.lines.map((line) => line.skuCode))]
      const skus = await prisma.sku.findMany({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          skuCode: { in: skuCodes },
          status: 'ACTIVE',
        },
        select: { id: true, skuCode: true },
      })
      const skuMap = new Map(skus.map((sku) => [sku.skuCode, sku.id]))
      const missingSkuCodes = skuCodes.filter((skuCode) => !skuMap.has(skuCode))
      if (missingSkuCodes.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: '退件明细包含不存在或未启用的SKU',
            code: 'SKU_NOT_FOUND',
            details: { missingSkuCodes },
          },
          { status: 400 }
        )
      }

      const data = await createReturnOrder(
        {
          tenantId: authContext.tenantId,
          userId: authContext.userId,
          warehouseId,
        },
        {
          clientId,
          warehouseId,
          preReturnNo: input.preReturnNo,
          logisticsNo: input.logisticsNo,
          notes: input.notes,
          lines: input.lines.map((line) => ({
            skuId: skuMap.get(line.skuCode)!,
            expectedQty: line.expectedQty,
            notes: line.notes,
          })),
        }
      )

      return NextResponse.json({ success: true, data, message: '预报退件单创建成功' })
    } catch (error) {
      return fail(error)
    }
  })
}
