import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  getInventoryCountOrderDetail,
  startInventoryCountBatch,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id, batchId } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)

    await startInventoryCountBatch(auth.user, id, batchId, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点批次已开始执行',
    })
  } catch (error) {
    console.error('开始盘点批次失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '开始盘点批次失败' },
      { status: 400 }
    )
  }
})
