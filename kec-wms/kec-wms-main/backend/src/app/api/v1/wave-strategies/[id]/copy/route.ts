import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { copyWaveStrategySchema } from '@/lib/validations/wave-strategy'
import { copyWaveStrategy } from '@/lib/services/wave-strategy-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const POST = createAuthHandler(async (request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const body = await request.json()
    const input = copyWaveStrategySchema.parse(body)
    const result = await copyWaveStrategy(auth.user.tenantId, id, auth.user.id, input)

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次策略复制成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '复制波次策略失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
})
