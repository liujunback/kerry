import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma, prismaRead } from '@/lib/db/prisma'
import { z } from 'zod'
import { reloadTask, taskHandlers } from '@/lib/scheduler'
import cron from 'node-cron'
import { DEFAULT_TIMEZONE } from '@/lib/config/timezone'

// 验证 schema
const createTaskSchema = z.object({
  taskCode: z.string().min(1).max(64),
  taskName: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  taskType: z.enum(['INVENTORY_ALERT', 'DATA_SYNC', 'REPORT_GENERATE', 'DATA_CLEANUP', 'CUSTOM']),
  cronExpression: z.string().min(1).max(64),
  timezone: z.string().default(DEFAULT_TIMEZONE),
  handler: z.string().min(1).max(128),
  params: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
})

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
  taskType: z.string().nullish(),
  isActive: z.string().nullish().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  search: z.string().nullish(),
})

// GET /api/v1/scheduled-tasks - 获取定时任务列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = querySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      taskType: searchParams.get('taskType') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      search: searchParams.get('search') || undefined,
    })

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (query.taskType) where.taskType = query.taskType
    if (query.isActive !== undefined) where.isActive = query.isActive
    if (query.search) {
      where.OR = [
        { taskCode: { contains: query.search } },
        { taskName: { contains: query.search } },
      ]
    }

    const [total, tasks] = await Promise.all([
      prismaRead.scheduledTask.count({ where }),
      prismaRead.scheduledTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
  } catch (error) {
    console.error('获取定时任务列表失败:', error)
    return NextResponse.json({ success: false, message: '获取定时任务列表失败' }, { status: 500 })
  }
})

// POST /api/v1/scheduled-tasks - 创建定时任务
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const data = createTaskSchema.parse(body)

    // 验证 cron 表达式
    if (!cron.validate(data.cronExpression)) {
      return NextResponse.json(
        { success: false, message: '无效的 Cron 表达式' },
        { status: 400 }
      )
    }

    // 验证处理器是否存在
    if (!taskHandlers.has(data.handler)) {
      return NextResponse.json(
        { success: false, message: `未找到处理器: ${data.handler}` },
        { status: 400 }
      )
    }

    // 检查任务编码是否重复
    const existing = await prisma.scheduledTask.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          taskCode: data.taskCode,
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: '任务编码已存在' },
        { status: 400 }
      )
    }

    const { params: taskParams, ...restData } = data
    const task = await prisma.scheduledTask.create({
        data: {
          tenantId: auth.user.tenantId,
          ...restData,
          ...(taskParams !== undefined && { params: taskParams as object }),
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
    })

    // 如果任务启用，立即调度
    if (task.isActive) {
      await reloadTask(task.id)
    }

    return NextResponse.json({
      success: true,
      data: task,
      message: '创建成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('创建定时任务失败:', error)
    return NextResponse.json({ success: false, message: '创建定时任务失败' }, { status: 500 })
  }
})
