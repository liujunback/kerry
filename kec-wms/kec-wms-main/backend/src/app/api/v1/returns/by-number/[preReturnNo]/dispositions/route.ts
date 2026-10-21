import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasApiScope } from '@/lib/auth/unified-auth'
import { prisma } from '@/lib/db/prisma'
import { readJson } from '@/lib/returns/api-utils'
import { saveReturnDispositions } from '@/lib/returns/return-service'
import { externalReturnDispositionSchema } from '@/lib/validations/returns'
import { withUnifiedAuditContext } from '@/middleware/audit-context'

type RouteContext = {
  params: Promise<{ preReturnNo: string }>
}

function normalizeText(value?: string | null) {
  return value?.trim() || ''
}

function normalizeDate(value?: Date | string | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest, context: RouteContext) {
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
      { success: false, message: '退件处理意见只能通过外部 API 下发' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'return:disposition')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    const { preReturnNo } = await context.params
    const parseResult = externalReturnDispositionSchema.safeParse(await readJson(request))
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.errors[0]?.message || '参数错误',
          errors: parseResult.error.errors,
        },
        { status: 400 }
      )
    }

    const input = parseResult.data
    let clientId = authContext.clientId
    if (clientId) {
      if (input.clientCode) {
        const boundClient = await prisma.client.findFirst({
          where: { id: clientId, tenantId: authContext.tenantId, clientCode: input.clientCode, isActive: true },
          select: { id: true },
        })
        if (!boundClient) {
          return NextResponse.json(
            { success: false, message: '客户编码与API Key绑定客户不一致', code: 'CLIENT_SCOPE_MISMATCH' },
            { status: 400 }
          )
        }
      }
    } else {
      if (!input.clientCode) {
        return NextResponse.json(
          { success: false, message: '客户编码(clientCode)不能为空', code: 'CLIENT_CODE_REQUIRED' },
          { status: 400 }
        )
      }
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
      if (input.warehouseCode) {
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
      }
    } else {
      if (!input.warehouseCode) {
        return NextResponse.json(
          { success: false, message: '仓库编码(warehouseCode)不能为空', code: 'WAREHOUSE_CODE_REQUIRED' },
          { status: 400 }
        )
      }
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

    const order = await prisma.returnOrder.findFirst({
      where: {
        tenantId: authContext.tenantId,
        clientId,
        warehouseId,
        preReturnNo: decodeURIComponent(preReturnNo),
      },
      include: {
        lines: {
          include: { dispositions: true },
          orderBy: { lineNumber: 'asc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: '退件单不存在', code: 'RETURN_ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    const items = []
    for (const item of input.items) {
      let candidates = order.lines

      if (item.returnLineNo) {
        candidates = candidates.filter((line) => line.returnLineNo === item.returnLineNo)
      } else {
        candidates = candidates.filter((line) => line.skuCode === item.skuCode)
        if (item.quality) {
          candidates = candidates.filter((line) => line.quality === item.quality)
        }
        if (item.batchNumber !== undefined) {
          candidates = candidates.filter((line) => normalizeText(line.batchNumber) === normalizeText(item.batchNumber))
        }
        if (item.expiryDate !== undefined) {
          candidates = candidates.filter((line) => normalizeDate(line.expiryDate) === normalizeDate(item.expiryDate))
        }
        if (item.containerCode !== undefined) {
          candidates = candidates.filter((line) => normalizeText(line.containerCode) === normalizeText(item.containerCode))
        }
        if (item.tempLocationCode !== undefined) {
          candidates = candidates.filter((line) => normalizeText(line.tempLocationCode) === normalizeText(item.tempLocationCode))
        }
      }

      if (candidates.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: '未找到匹配的退件明细',
            code: 'RETURN_LINE_NOT_FOUND',
            details: { returnLineNo: item.returnLineNo, skuCode: item.skuCode },
          },
          { status: 400 }
        )
      }

      if (candidates.length > 1) {
        return NextResponse.json(
          {
            success: false,
            message: '退件明细匹配到多条，请提供 returnLineNo 或更多匹配条件',
            code: 'RETURN_LINE_AMBIGUOUS',
            details: { returnLineNo: item.returnLineNo, skuCode: item.skuCode },
          },
          { status: 400 }
        )
      }

      items.push({
        returnLineId: candidates[0].id,
        action: item.action,
        quantity: item.quantity,
        notes: item.notes,
      })
    }

    try {
      const data = await saveReturnDispositions(
        {
          tenantId: authContext.tenantId,
          userId: authContext.userId,
          warehouseId,
        },
        order.id,
        { items }
      )
      return NextResponse.json({ success: true, data, message: '处理意见已保存' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '处理意见保存失败'
      return NextResponse.json({ success: false, message }, { status: 400 })
    }
  })
}
