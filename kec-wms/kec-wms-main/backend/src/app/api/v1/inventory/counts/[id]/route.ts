import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { createInventoryCountSchema, InventoryCountSaveMode } from '@/lib/validations/inventory-count'
import {
  getInventoryCountOrderDetail,
  updateInventoryCountOrder,
} from '@/lib/services/inventory-count-service'
import { enqueueInventoryCountScopeJob } from '@/lib/services/inventory-count-scope-job-service'

export const GET = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params
    const warehouseId = resolveScopedWarehouseId(auth.user)
    const order = await getInventoryCountOrderDetail(auth.user, id, warehouseId)

    if (!order) {
      return NextResponse.json(
        { success: false, message: '盘点单不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error('获取盘点单详情失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '获取盘点单详情失败' },
      { status: 500 }
    )
  }
})

export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const parseResult = createInventoryCountSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const data = parseResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, data.warehouseId) || data.warehouseId
    const order = await updateInventoryCountOrder(auth.user, id, {
      ...data,
      warehouseId,
    }, warehouseId)
    const scopeJob = data.saveMode === InventoryCountSaveMode.PENDING_SCOPE
      ? await enqueueInventoryCountScopeJob(auth.user, id, warehouseId)
      : undefined

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        ...(scopeJob ? { status: 'GENERATING_SCOPE' } : {}),
        scopeJob,
      },
      message: scopeJob ? '盘点单更新成功，生成范围任务已提交' : '盘点单更新成功',
    })
  } catch (error) {
    console.error('更新盘点单失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '更新盘点单失败' },
      { status: 400 }
    )
  }
})
