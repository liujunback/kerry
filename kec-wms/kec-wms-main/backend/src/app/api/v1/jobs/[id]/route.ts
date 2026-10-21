import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { getJob } from '@/lib/queue'

// GET /api/v1/jobs/[id] - 获取任务详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const job = await getJob(id, auth.user.tenantId)

    if (!job) {
      return NextResponse.json(
        { success: false, message: '任务不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: job,
    })
  } catch (error) {
    console.error('获取任务详情失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '获取失败',
      },
      { status: 500 }
    )
  }
})
