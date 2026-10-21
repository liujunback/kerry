import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { completeInventoryCountDisposalSchema } from '@/lib/validations/inventory-count'
import {
  completeInventoryCountDisposal,
  getInventoryCountOrderDetail,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id, disposalId } = await context!.params
    const body = await request.json()
    const parseResult = completeInventoryCountDisposalSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.errors[0]?.message || '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)

    await completeInventoryCountDisposal(auth.user, id, disposalId, parseResult.data, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点差异处理单已完成',
    })
  } catch (error) {
    console.error('完成盘点差异处理单失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '完成盘点差异处理单失败' },
      { status: 400 }
    )
  }
})
