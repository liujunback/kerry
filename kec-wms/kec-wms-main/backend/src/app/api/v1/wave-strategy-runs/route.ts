import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { listWaveStrategyRunsQuerySchema } from '@/lib/validations/wave-strategy'
import { listWaveStrategyRuns } from '@/lib/services/wave-strategy-service'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = listWaveStrategyRunsQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      strategyId: searchParams.get('strategyId') || undefined,
      warehouseId: searchParams.get('warehouseId') || undefined,
      runMode: searchParams.get('runMode') || undefined,
      runStatus: searchParams.get('runStatus') || undefined,
      reasonCode: searchParams.get('reasonCode') || undefined,
      timePreset: searchParams.get('timePreset') || undefined,
      startedAtFrom: searchParams.get('startedAtFrom') || undefined,
      startedAtTo: searchParams.get('startedAtTo') || undefined,
    })

    const warehouseId = resolveScopedWarehouseId(auth.user, query.warehouseId)
    const result = await listWaveStrategyRuns(auth.user.tenantId, {
      ...query,
      warehouseId,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取策略运行记录失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})
