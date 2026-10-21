import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { getWaveStrategyRunDetail } from '@/lib/services/wave-strategy-service'
import { waveStrategyRunDetailQuerySchema } from '@/lib/validations/wave-strategy'

type RouteParams = {
  params: Promise<{ runId: string }>
}

export const GET = createAuthHandler(async (_request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { runId } = await params
    const query = waveStrategyRunDetailQuerySchema.parse(Object.fromEntries(_request.nextUrl.searchParams.entries()))
    const detail = await getWaveStrategyRunDetail(auth.user.tenantId, runId, query)
    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取策略运行详情失败'
    const status = message.includes('不存在') ? 404 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
})
