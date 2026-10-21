import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { updateWaveStrategySchema } from '@/lib/validations/wave-strategy'
import {
  getWaveStrategyDetail,
  updateWaveStrategy,
} from '@/lib/services/wave-strategy-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const GET = createAuthHandler(async (_request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const detail = await getWaveStrategyDetail(auth.user.tenantId, id)
    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取波次策略详情失败'
    const status = message.includes('不存在') ? 404 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
})

export const PUT = createAuthHandler(async (request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const body = await request.json()
    const input = updateWaveStrategySchema.parse(body)
    const detail = await updateWaveStrategy(auth.user.tenantId, id, auth.user.id, input)
    return NextResponse.json({
      success: true,
      data: detail,
      message: '波次策略更新成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新波次策略失败'
    const status = message.includes('不存在') ? 404 : 400
    return NextResponse.json({ success: false, message }, { status })
  }
})
