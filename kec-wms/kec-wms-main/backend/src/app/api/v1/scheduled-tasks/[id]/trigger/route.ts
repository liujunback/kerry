import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { triggerTask } from '@/lib/scheduler'
import { createAuthHandler } from '@/lib/api/create-handler'

// POST /api/v1/scheduled-tasks/[id]/trigger - 手动触发任务
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 检查任务是否存在
    const task = await prisma.scheduledTask.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!task) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 })
    }

    if (!task.isActive) {
      return NextResponse.json({ success: false, message: '任务已禁用，不能手动触发' }, { status: 400 })
    }

    // 触发任务执行
    await triggerTask(id)

    return NextResponse.json({
      success: true,
      message: '任务已触发执行',
    })
  } catch (error) {
    console.error('触发定时任务失败:', error)
    const message = error instanceof Error ? error.message : '触发定时任务失败'
    const status = message.includes('不存在') ? 404 : message.includes('已禁用') ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
})
