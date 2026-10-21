import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { updateInventoryCountBatchAssigneeSchema } from '@/lib/validations/inventory-count'
import {
  getInventoryCountOrderDetail,
  updateInventoryCountBatchAssignee,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id, batchId } = await context!.params
    const body = await request.json()
    const parseResult = updateInventoryCountBatchAssigneeSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.errors[0]?.message || '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    await updateInventoryCountBatchAssignee(auth.user, id, batchId, parseResult.data, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点人已切换',
    })
  } catch (error) {
    console.error('切换盘点批次负责人失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '切换盘点人失败' },
      { status: 400 }
    )
  }
})
