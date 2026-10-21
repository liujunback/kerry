import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  getInventoryCountOrderDetail,
  startInventoryCountDisposal,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id, disposalId } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)

    await startInventoryCountDisposal(auth.user, id, disposalId, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点差异处理单已开始处理',
    })
  } catch (error) {
    console.error('开始盘点差异处理单失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '开始盘点差异处理单失败' },
      { status: 400 }
    )
  }
})
