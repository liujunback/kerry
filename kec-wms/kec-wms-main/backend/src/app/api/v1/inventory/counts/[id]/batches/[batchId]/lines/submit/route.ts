import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { submitInventoryCountLineSchema } from '@/lib/validations/inventory-count'
import {
  getInventoryCountOrderDetail,
  submitInventoryCountTaskLines,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id, batchId } = await context!.params
    const body = await request.json()
    const parseResult = submitInventoryCountLineSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    if (parseResult.data.detailIds.length === 0 && !parseResult.data.scope) {
      return NextResponse.json(
        { success: false, message: '请提供盘点明细或汇总范围' },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    await submitInventoryCountTaskLines(auth.user, id, batchId, parseResult.data, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点明细提交成功',
    })
  } catch (error) {
    console.error('提交盘点明细失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '提交盘点明细失败' },
      { status: 400 }
    )
  }
})
