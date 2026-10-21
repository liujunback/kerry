import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { executeWaveStrategySchema } from '@/lib/validations/wave-strategy'
import { startExecuteWaveStrategy, WaveStrategyRunAlreadyRunningError } from '@/lib/services/wave-engine-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const POST = createAuthHandler(async (request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const body = await request.json()
    const input = executeWaveStrategySchema.parse(body)
    const result = await startExecuteWaveStrategy(
      auth.user.tenantId,
      id,
      auth.user.id,
      auth.user.name || undefined,
      input
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次策略已提交到后台队列，请在运行日志或作业管理查看进度',
    })
  } catch (error) {
    if (error instanceof WaveStrategyRunAlreadyRunningError) {
      const startedAt = error.startedAt instanceof Date
        ? error.startedAt.toISOString()
        : new Date(error.startedAt).toISOString()

      return NextResponse.json(
        {
          success: false,
          message: error.message,
          data: {
            runId: error.runId,
            startedAt,
          },
        },
        { status: 409 }
      )
    }

    const message = error instanceof Error ? error.message : '执行波次策略失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
})
