import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { getPdaInventoryCountBatchDetail } from '@/lib/pda/inventory-count-handler'
import { requirePdaInventoryCountPermission } from '@/lib/pda/inventory-count-permission'

export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const permissionResponse = await requirePdaInventoryCountPermission(auth.user)
    if (permissionResponse) {
      return permissionResponse
    }

    const { orderId, batchId } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)
    const detail = await getPdaInventoryCountBatchDetail(auth.user, orderId, batchId, warehouseId, {
      locationCode: request.nextUrl.searchParams.get('locationCode') || undefined,
      skuOrBarcode: request.nextUrl.searchParams.get('skuOrBarcode') || undefined,
    })

    return NextResponse.json({
      success: true,
      data: detail,
    })
  } catch (error) {
    console.error('PDA获取盘点批次详情失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '获取盘点批次详情失败' },
      { status: 400 }
    )
  }
})
