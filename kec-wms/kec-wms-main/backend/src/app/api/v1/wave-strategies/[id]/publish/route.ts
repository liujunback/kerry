import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { publishWaveStrategySchema } from '@/lib/validations/wave-strategy'
import { publishWaveStrategy } from '@/lib/services/wave-strategy-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const POST = createAuthHandler(async (request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const body = await request.json()
    const input = publishWaveStrategySchema.parse(body)
    const result = await publishWaveStrategy(auth.user.tenantId, id, auth.user.id, input)

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次策略发布成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '发布波次策略失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
})
