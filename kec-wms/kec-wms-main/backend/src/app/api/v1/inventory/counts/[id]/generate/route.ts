import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { enqueueInventoryCountScopeJob } from '@/lib/services/inventory-count-scope-job-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)

    const job = await enqueueInventoryCountScopeJob(auth.user, id, warehouseId)

    return NextResponse.json({
      success: true,
      data: job,
      message: '生成范围任务已提交',
    })
  } catch (error) {
    console.error('生成盘点范围失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '生成盘点范围失败' },
      { status: 500 }
    )
  }
})
