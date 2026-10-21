import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { rollbackWaveStrategySchema } from '@/lib/validations/wave-strategy'
import { rollbackWaveStrategy } from '@/lib/services/wave-strategy-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const POST = createAuthHandler(async (request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const body = await request.json()
    const input = rollbackWaveStrategySchema.parse(body)
    const result = await rollbackWaveStrategy(auth.user.tenantId, id, auth.user.id, input)

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次策略回滚成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '回滚波次策略失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
})
