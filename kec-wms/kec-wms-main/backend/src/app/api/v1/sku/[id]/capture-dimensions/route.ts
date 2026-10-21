import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticate, hasApiScope } from '@/lib/auth/unified-auth'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const captureDimensionsSchema = z.object({
  isSelfPackaged: z.boolean().optional(),
  lengthCm: z.number().positive('长度必须大于0'),
  widthCm: z.number().positive('宽度必须大于0'),
  heightCm: z.number().positive('高度必须大于0'),
  weightKg: z.number().positive('重量必须大于0'),
})

// POST /api/v1/sku/[id]/capture-dimensions - 首次收货时补全SKU尺寸信息
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await authenticate(request)

  if (!authResult.success || !authResult.context) {
    return NextResponse.json(
      { success: false, message: '未授权' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context

  if (!hasApiScope(authContext, 'sku:update')) {
    return NextResponse.json(
      { success: false, message: '无权限' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validationResult = captureDimensionsSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: validationResult.error.errors },
          { status: 400 }
        )
      }

      const { isSelfPackaged, lengthCm, widthCm, heightCm, weightKg } = validationResult.data

      // 检查SKU是否存在
      const where: Record<string, unknown> = {
        id,
        tenantId: authContext.tenantId,
      }

      if (authContext.clientId) {
        where.clientId = authContext.clientId
      }

      const existingSku = await prisma.sku.findFirst({ where })

      if (!existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU不存在' },
          { status: 404 }
        )
      }

      // 计算体积 (立方米)
      const volumeCbm = (lengthCm * widthCm * heightCm) / 1000000

      // 更新SKU尺寸信息并标记为非首次收货
      const sku = await prisma.sku.update({
        where: { id },
        data: {
          ...(isSelfPackaged !== undefined && { isSelfPackaged }),
          lengthCm,
          widthCm,
          heightCm,
          weightKg,
          volumeCbm,
          isFirstReceiving: false,
          updatedBy: authContext.userId,
        },
        select: {
          id: true,
          skuCode: true,
          skuName: true,
          barcode: true,
          isBatchManaged: true,
          isSerialManaged: true,
          isExpiryManaged: true,
          isSelfPackaged: true,
          lengthCm: true,
          widthCm: true,
          heightCm: true,
          weightKg: true,
          volumeCbm: true,
          isFirstReceiving: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: sku,
        message: 'SKU尺寸信息已保存',
      })
    } catch (error) {
      console.error('保存SKU尺寸信息失败:', error)
      return NextResponse.json(
        { success: false, message: '保存SKU尺寸信息失败' },
        { status: 500 }
      )
    }
  })
}
