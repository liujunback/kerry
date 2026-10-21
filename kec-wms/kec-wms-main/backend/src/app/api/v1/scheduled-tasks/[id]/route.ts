import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma, prismaRead } from '@/lib/db/prisma'
import { z } from 'zod'
import { reloadTask, taskHandlers } from '@/lib/scheduler'
import cron from 'node-cron'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateTaskSchema = z.object({
  taskCode: z.string().min(1).max(64).optional(),
  taskName: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  taskType: z.enum(['INVENTORY_ALERT', 'DATA_SYNC', 'REPORT_GENERATE', 'DATA_CLEANUP', 'CUSTOM']).optional(),
  cronExpression: z.string().min(1).max(64).optional(),
  timezone: z.string().optional(),
  handler: z.string().min(1).max(128).optional(),
  params: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/v1/scheduled-tasks/[id] - 获取任务详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    const task = await prismaRead.scheduledTask.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        logs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!task) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: task })
  } catch (error) {
    console.error('获取定时任务详情失败:', error)
    return NextResponse.json({ success: false, message: '获取定时任务详情失败' }, { status: 500 })
  }
})

// PUT /api/v1/scheduled-tasks/[id] - 更新任务
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateTaskSchema.parse(body)

    // 检查任务是否存在
    const existing = await prisma.scheduledTask.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 })
    }

    // 验证 cron 表达式
    if (data.cronExpression && !cron.validate(data.cronExpression)) {
      return NextResponse.json(
        { success: false, message: '无效的 Cron 表达式' },
        { status: 400 }
      )
    }

    // 验证处理器
    if (data.handler && !taskHandlers.has(data.handler)) {
      return NextResponse.json(
        { success: false, message: `未找到处理器: ${data.handler}` },
        { status: 400 }
      )
    }

    // 检查任务编码是否重复
    if (data.taskCode && data.taskCode !== existing.taskCode) {
      const duplicate = await prisma.scheduledTask.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          taskCode: data.taskCode,
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: '任务编码已存在' },
          { status: 400 }
        )
      }
    }

    const { params: taskParams, ...restData } = data
    const task = await prisma.scheduledTask.update({
      where: { id },
      data: {
        ...restData,
        ...(taskParams !== undefined && { params: taskParams as object }),
        updatedBy: auth.user.id,
      },
    })

    // 重新加载任务
    await reloadTask(task.id)

    return NextResponse.json({
      success: true,
      data: task,
      message: '更新成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('更新定时任务失败:', error)
    return NextResponse.json({ success: false, message: '更新定时任务失败' }, { status: 500 })
  }
})

// DELETE /api/v1/scheduled-tasks/[id] - 删除任务
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    const existing = await prisma.scheduledTask.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 })
    }

    await prisma.scheduledTask.delete({
      where: { id },
    })

    // 从调度器中移除
    await reloadTask(id)

    return NextResponse.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除定时任务失败:', error)
    return NextResponse.json({ success: false, message: '删除定时任务失败' }, { status: 500 })
  }
})
