import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { startPdaInventoryCountBatch } from '@/lib/pda/inventory-count-handler'
import { requirePdaInventoryCountPermission } from '@/lib/pda/inventory-count-permission'

export const POST = createAuthHandler(async (_request, auth, context) => {
  try {
    const permissionResponse = await requirePdaInventoryCountPermission(auth.user)
    if (permissionResponse) {
      return permissionResponse
    }

    const { orderId, batchId } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)
    const detail = await startPdaInventoryCountBatch(auth.user, orderId, batchId, warehouseId)

    return NextResponse.json({
      success: true,
      data: detail,
      message: '盘点批次已开始',
    })
  } catch (error) {
    console.error('PDA开始盘点批次失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '开始盘点批次失败' },
      { status: 400 }
    )
  }
})
