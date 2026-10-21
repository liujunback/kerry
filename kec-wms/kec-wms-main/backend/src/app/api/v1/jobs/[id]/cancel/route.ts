import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { cancelJob } from '@/lib/queue'

// POST /api/v1/jobs/[id]/cancel - 取消任务
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    await cancelJob(id, auth.user.tenantId)

    return NextResponse.json({
      success: true,
      message: '任务已取消',
    })
  } catch (error) {
    console.error('取消任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '取消失败',
      },
      { status: 500 }
    )
  }
})
