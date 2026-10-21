import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { bulkUpdateInventoryCountBatchAssigneesSchema } from '@/lib/validations/inventory-count'
import {
  getInventoryCountOrderDetail,
  updateInventoryCountBatchAssignees,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const parseResult = bulkUpdateInventoryCountBatchAssigneesSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.errors[0]?.message || '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    await updateInventoryCountBatchAssignees(auth.user, id, parseResult.data, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点人已批量切换',
    })
  } catch (error) {
    console.error('批量切换盘点批次负责人失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '批量切换盘点人失败' },
      { status: 400 }
    )
  }
})
