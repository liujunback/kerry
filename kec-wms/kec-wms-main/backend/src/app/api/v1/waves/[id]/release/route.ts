import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { releaseWave } from '@/lib/services/wave-release-service'

type RouteParams = {
  params: Promise<{ id: string }>
}

export const POST = createAuthHandler(async (_request: NextRequest, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const result = await releaseWave({
      tenantId: auth.user.tenantId,
      waveId: id,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '波次释放成功',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '波次释放失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
})
