import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { getWaveStrategyRunDetail } from '@/lib/services/wave-strategy-service'
import { simulateWaveStrategySchema } from '@/lib/validations/wave-strategy'
import { simulateWaveStrategy } from '@/lib/services/wave-engine-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const POST = createAuthHandler(async (request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const body = await request.json()
    const input = simulateWaveStrategySchema.parse(body)
    const run = await simulateWaveStrategy(auth.user.tenantId, id, auth.user.id, input)
    const result = await getWaveStrategyRunDetail(auth.user.tenantId, run.id, {
      page: 1,
      pageSize: 20,
      reasonCategory: 'ALL',
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次策略模拟成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '模拟波次策略失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
})
