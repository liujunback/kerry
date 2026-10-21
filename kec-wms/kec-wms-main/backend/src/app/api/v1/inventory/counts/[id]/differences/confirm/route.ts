import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { confirmInventoryCountDifferencesSchema } from '@/lib/validations/inventory-count'
import {
  confirmInventoryCountDifferences,
  getInventoryCountOrderDetail,
} from '@/lib/services/inventory-count-service'

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json().catch(() => ({}))
    const parseResult = confirmInventoryCountDifferencesSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const warehouseId = resolveScopedWarehouseId(auth.user)
    await confirmInventoryCountDifferences(auth.user, id, parseResult.data, warehouseId)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: order,
      message: '盘点差异已确认',
    })
  } catch (error) {
    console.error('确认盘点差异失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '确认盘点差异失败' },
      { status: 400 }
    )
  }
})
