import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  getInventoryCountOrderDetail,
  settleInventoryCountOrder,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)

    await settleInventoryCountOrder(auth.user, id, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点单结算完成',
    })
  } catch (error) {
    console.error('盘点单结算失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '盘点单结算失败' },
      { status: 400 }
    )
  }
})
