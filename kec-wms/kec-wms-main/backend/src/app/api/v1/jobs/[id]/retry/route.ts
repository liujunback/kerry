import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { retryJob } from '@/lib/queue'

// POST /api/v1/jobs/[id]/retry - 重试任务
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const result = await retryJob(id, auth.user.tenantId, auth.user.id)

    return NextResponse.json({
      success: true,
      data: result,
      message: '任务已重新创建',
    })
  } catch (error) {
    console.error('重试任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '重试失败',
      },
      { status: 500 }
    )
  }
})
