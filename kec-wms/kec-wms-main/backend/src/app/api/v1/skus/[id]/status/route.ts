import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeSkuStatusSchema } from '@/lib/validations/sku'
import { withAuditContext } from '@/middleware/audit-context'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/v1/skus/[id]/status - 修改SKU状态
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  return withAuditContext(request, async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validationResult = changeSkuStatusSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: validationResult.error.errors },
          { status: 400 }
        )
      }

      const { status } = validationResult.data

      // 检查SKU是否存在
      const existingSku = await prisma.sku.findFirst({
        where: {
          id,
          tenantId: auth.user.tenantId,
        },
      })

      if (!existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU不存在' },
          { status: 404 }
        )
      }

      // 如果要停用SKU，检查是否有库存
      if (status === 'INACTIVE' && existingSku.status !== 'INACTIVE') {
        const inventoryCount = await prisma.inventoryBucket.count({
          where: {
            skuId: id,
            quantity: { gt: 0 },
          },
        })

        if (inventoryCount > 0) {
          return NextResponse.json(
            { success: false, message: '该SKU存在库存，无法停用', code: 'SKU_HAS_INVENTORY' },
            { status: 400 }
          )
        }
      }

      const sku = await prisma.sku.update({
        where: { id },
        data: {
          status,
          updatedBy: auth.user.id,
        },
        select: {
          id: true,
          skuCode: true,
          skuName: true,
          status: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: sku,
        message: status === 'ACTIVE' ? 'SKU已启用' : 'SKU已停用',
      })
    } catch (error) {
      console.error('修改SKU状态失败:', error)
      return NextResponse.json(
        { success: false, message: '修改SKU状态失败' },
        { status: 500 }
      )
    }
  })
})
