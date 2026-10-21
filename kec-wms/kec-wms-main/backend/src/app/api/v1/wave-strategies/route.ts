import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
  createWaveStrategySchema,
  listWaveStrategiesQuerySchema,
} from '@/lib/validations/wave-strategy'
import {
  createWaveStrategy,
  listWaveStrategies,
} from '@/lib/services/wave-strategy-service'

function ensureWarehouseScope(
  scopedWarehouseId: string | undefined,
  requestedWarehouseId: string | undefined
) {
  if (scopedWarehouseId && requestedWarehouseId && scopedWarehouseId !== requestedWarehouseId) {
    throw new Error('当前用户无权访问其他仓库的数据')
  }

  return scopedWarehouseId || requestedWarehouseId
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = listWaveStrategiesQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      search: searchParams.get('search') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      shippingMethod: searchParams.get('shippingMethod') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      status: searchParams.get('status') || undefined,
      timePreset: searchParams.get('timePreset') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    })

    const warehouseId = ensureWarehouseScope(
      resolveScopedWarehouseId(auth.user),
      query.warehouseId
    )

    const result = await listWaveStrategies(auth.user.tenantId, {
      ...query,
      warehouseId,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取波次策略列表失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const input = createWaveStrategySchema.parse(body)
    const warehouseId = ensureWarehouseScope(
      resolveScopedWarehouseId(auth.user),
      input.warehouseId
    )

    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '缺少仓库信息' }, { status: 400 })
    }

    const result = await createWaveStrategy(auth.user.tenantId, auth.user.id, {
      ...input,
      warehouseId,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次策略创建成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建波次策略失败'
    const status = message.includes('已存在') || message.includes('无权') ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
})
