import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { listPdaInventoryCountBatches } from '@/lib/pda/inventory-count-handler'
import { requirePdaInventoryCountPermission } from '@/lib/pda/inventory-count-permission'

export const GET = createAuthHandler(async (_request, auth) => {
  try {
    const permissionResponse = await requirePdaInventoryCountPermission(auth.user)
    if (permissionResponse) {
      return permissionResponse
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    const batches = await listPdaInventoryCountBatches(auth.user, warehouseId)

    return NextResponse.json({
      success: true,
      data: batches,
    })
  } catch (error) {
    console.error('PDA获取盘点批次失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '获取盘点批次失败' },
      { status: 500 }
    )
  }
})
