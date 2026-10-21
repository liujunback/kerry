import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  createInventoryCountSchema,
  InventoryCountSaveMode,
  inventoryCountListQuerySchema,
} from '@/lib/validations/inventory-count'
import {
  createInventoryCountOrder,
  listInventoryCountOrders,
} from '@/lib/services/inventory-count-service'
import { enqueueInventoryCountScopeJob } from '@/lib/services/inventory-count-scope-job-service'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const queryResult = inventoryCountListQuerySchema.safeParse({
      page: request.nextUrl.searchParams.get('page'),
      pageSize: request.nextUrl.searchParams.get('pageSize'),
      warehouseId: request.nextUrl.searchParams.get('warehouseId'),
      orderType: request.nextUrl.searchParams.get('orderType'),
      status: request.nextUrl.searchParams.get('status'),
      search: request.nextUrl.searchParams.get('search'),
      plannedStart: request.nextUrl.searchParams.get('plannedStart'),
      plannedEnd: request.nextUrl.searchParams.get('plannedEnd'),
      sortBy: request.nextUrl.searchParams.get('sortBy'),
      sortOrder: request.nextUrl.searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const query = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, query.warehouseId)
    const result = await listInventoryCountOrders(auth.user, {
      ...query,
      warehouseId,
    })

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('获取盘点单列表失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '获取盘点单列表失败' },
      { status: 500 }
    )
  }
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
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
    const order = await createInventoryCountOrder(auth.user, {
      ...data,
      warehouseId,
    })
    const scopeJob = data.saveMode === InventoryCountSaveMode.PENDING_SCOPE
      ? await enqueueInventoryCountScopeJob(auth.user, order.id, warehouseId)
      : undefined

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        ...(scopeJob ? { status: 'GENERATING_SCOPE' } : {}),
        scopeJob,
      },
      message: scopeJob ? '盘点单创建成功，生成范围任务已提交' : '盘点单创建成功',
    }, { status: 201 })
  } catch (error) {
    console.error('创建盘点单失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '创建盘点单失败' },
      { status: 500 }
    )
  }
})
