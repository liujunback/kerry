import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { submitInventoryCountLineSchema } from '@/lib/validations/inventory-count'
import { submitPdaInventoryCountLine } from '@/lib/pda/inventory-count-handler'
import { requirePdaInventoryCountPermission } from '@/lib/pda/inventory-count-permission'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const permissionResponse = await requirePdaInventoryCountPermission(auth.user)
    if (permissionResponse) {
      return permissionResponse
    }

    const { orderId, batchId, detailId } = await context!.params
    const body = await request.json()
    const parseResult = submitInventoryCountLineSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.errors[0]?.message || '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    const detail = await submitPdaInventoryCountLine(
      auth.user,
      orderId,
      batchId,
      detailId,
      parseResult.data,
      warehouseId
    )

    return NextResponse.json({
      success: true,
      data: detail,
      message: '盘点明细提交成功',
    })
  } catch (error) {
    console.error('PDA提交盘点明细失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '提交盘点明细失败' },
      { status: 400 }
    )
  }
})
