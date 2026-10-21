import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  completeInventoryCountBatch,
  getInventoryCountOrderDetail,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id, batchId } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)

    await completeInventoryCountBatch(auth.user, id, batchId, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点批次已完成',
    })
  } catch (error) {
    console.error('完成盘点批次失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '完成盘点批次失败' },
      { status: 400 }
    )
  }
})
